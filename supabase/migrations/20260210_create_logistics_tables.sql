-- Phase 10: Logistics & Materials - Create Core Tables
-- Creates inventory tracking, deliveries, and transactions tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create project_inventory table
CREATE TABLE IF NOT EXISTS project_inventory (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    sku text,
    current_stock numeric(12,2) NOT NULL DEFAULT 0,
    min_stock_level numeric(12,2) NOT NULL DEFAULT 0,
    unit text NOT NULL,
    qr_code_content text UNIQUE,
    location_in_site text,
    cost_per_unit numeric(12,2),
    supplier_id uuid REFERENCES suppliers(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_inventory_project_id ON project_inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_project_inventory_qr_code ON project_inventory(qr_code_content);
CREATE INDEX IF NOT EXISTS idx_project_inventory_low_stock ON project_inventory(project_id, current_stock, min_stock_level) WHERE current_stock <= min_stock_level;

-- 2. Create project_deliveries table
CREATE TABLE IF NOT EXISTS project_deliveries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES suppliers(id),
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'delayed', 'cancelled')),
    scheduled_date date NOT NULL,
    estimated_arrival timestamptz,
    actual_arrival timestamptz,
    tracking_number text,
    driver_name text,
    driver_contact text,
    vehicle_plate text,
    delivery_address text,
    items jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_deliveries_project_id ON project_deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_deliveries_date ON project_deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_project_deliveries_status ON project_deliveries(status);

-- 3. Create project_inventory_transactions table (audit trail)
CREATE TABLE IF NOT EXISTS project_inventory_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id uuid NOT NULL REFERENCES project_inventory(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity numeric(12,2) NOT NULL,
    previous_stock numeric(12,2),
    new_stock numeric(12,2),
    performed_by uuid REFERENCES auth.users(id),
    source_type text CHECK (source_type IN ('manual', 'delivery', 'qr_scan', 'adjustment', 'system')),
    source_id uuid,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_transactions_inventory_id ON project_inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_project_id ON project_inventory_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_created_at ON project_inventory_transactions(created_at);

-- 4. Set up RLS policies

-- Enable RLS on all tables
ALTER TABLE project_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function for project access (reusing existing pattern)
CREATE OR REPLACE FUNCTION has_project_access(user_uuid uuid, project_uuid uuid)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects p
        LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.user_id = user_uuid
        LEFT JOIN user_roles ur ON ur.user_id = user_uuid
        WHERE p.id = project_uuid 
        AND (
            p.created_by = user_uuid 
            OR ptm.user_id IS NOT NULL
            OR ur.role IN ('admin', 'project_manager')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for project_inventory
CREATE POLICY "project_inventory_select_policy" ON project_inventory
    FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_inventory_insert_policy" ON project_inventory
    FOR INSERT WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_inventory_update_policy" ON project_inventory
    FOR UPDATE USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_inventory_delete_policy" ON project_inventory
    FOR DELETE USING (has_project_access(auth.uid(), project_id));

-- RLS Policies for project_deliveries
CREATE POLICY "project_deliveries_select_policy" ON project_deliveries
    FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_deliveries_insert_policy" ON project_deliveries
    FOR INSERT WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_deliveries_update_policy" ON project_deliveries
    FOR UPDATE USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_deliveries_delete_policy" ON project_deliveries
    FOR DELETE USING (has_project_access(auth.uid(), project_id));

-- RLS Policies for project_inventory_transactions
CREATE POLICY "inv_transactions_select_policy" ON project_inventory_transactions
    FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "inv_transactions_insert_policy" ON project_inventory_transactions
    FOR INSERT WITH CHECK (has_project_access(auth.uid(), project_id));

-- 5. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_inventory_updated_at
    BEFORE UPDATE ON project_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_deliveries_updated_at
    BEFORE UPDATE ON project_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Add comments for documentation
COMMENT ON TABLE project_inventory IS 'Tracks material inventory levels per project with QR code support';
COMMENT ON TABLE project_deliveries IS 'Scheduled and actual material deliveries to construction sites';
COMMENT ON TABLE project_inventory_transactions IS 'Audit trail for all inventory stock movements';
