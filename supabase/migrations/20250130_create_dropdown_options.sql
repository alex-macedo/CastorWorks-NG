-- Migration: Create dropdown_options table for dynamic dropdown management
-- Date: 2025-01-30
-- Description: Creates a new table to manage all dropdown options dynamically

BEGIN;

-- Create the dropdown_options table
CREATE TABLE IF NOT EXISTS dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  value VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  parent_category VARCHAR(50), -- For field sequence dependencies
  parent_value VARCHAR(100),   -- Specific parent value that triggers this
  color VARCHAR(7),            -- Only for task_priority
  icon VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, value)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dropdown_options_category 
  ON dropdown_options(category);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_active 
  ON dropdown_options(is_active);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_parent 
  ON dropdown_options(parent_category, parent_value);
CREATE INDEX IF NOT EXISTS idx_dropdown_options_sort_order 
  ON dropdown_options(category, sort_order);

-- Enable RLS
ALTER TABLE dropdown_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can read active options
CREATE POLICY "dropdown_options_select" 
  ON dropdown_options FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only admins can modify
CREATE POLICY "dropdown_options_admin" 
  ON dropdown_options FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Create validation function
CREATE OR REPLACE FUNCTION validate_dropdown_value(
  p_category VARCHAR,
  p_value VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dropdown_options 
    WHERE category = p_category 
    AND value = p_value 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed data - Task Priority (with colors)
INSERT INTO dropdown_options (category, value, label, sort_order, is_default, color) VALUES
('task_priority', 'low', 'Low', 1, false, '#6B7280'),
('task_priority', 'medium', 'Medium', 2, true, '#3B82F6'),
('task_priority', 'high', 'High', 3, false, '#F59E0B'),
('task_priority', 'urgent', 'Urgent', 4, false, '#EF4444')
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Project Types
INSERT INTO dropdown_options (category, value, label, sort_order, is_default) VALUES
('project_type', 'residential', 'Residential', 1, true),
('project_type', 'commercial', 'Commercial', 2, false),
('project_type', 'renovation', 'Renovation', 3, false),
('project_type', 'infrastructure', 'Infrastructure', 4, false),
('project_type', 'Own Build', 'Own Build', 5, false),
('project_type', 'Final Contractor', 'Final Contractor', 6, false),
('project_type', 'Project Owned', 'Project Owned', 7, false),
('project_type', 'Project Customer', 'Project Customer', 8, false)
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Project Status (matching database enum values)
INSERT INTO dropdown_options (category, value, label, sort_order, is_default) VALUES
('project_status', 'planning', 'Planning', 1, true),
('project_status', 'active', 'Active', 2, false),
('project_status', 'on_hold', 'On Hold', 3, false),
('project_status', 'completed', 'Completed', 4, false),
('project_status', 'cancelled', 'Cancelled', 5, false)
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Construction Units (matching database check constraint values)
INSERT INTO dropdown_options (category, value, label, sort_order, is_default) VALUES
('construction_unit', 'square meter', 'Square Meter (m²)', 1, true),
('construction_unit', 'square feet', 'Square Feet (ft²)', 2, false)
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Floor Types (matching database enum values)
INSERT INTO dropdown_options (category, value, label, sort_order, parent_category) VALUES
('floor_type', 'ground floor', 'Ground Floor', 1, 'project_type'),
('floor_type', 'ground + 1 floor', 'Ground + 1 Floor', 2, 'project_type'),
('floor_type', 'ground + 2 floors', 'Ground + 2 Floors', 3, 'project_type'),
('floor_type', 'ground + 3 floors', 'Ground + 3 Floors', 4, 'project_type'),
('floor_type', 'ground + 4 floors', 'Ground + 4 Floors', 5, 'project_type')
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Finishing Types (matching database enum values)
INSERT INTO dropdown_options (category, value, label, sort_order, parent_category) VALUES
('finishing_type', 'simple', 'Simple', 1, 'project_type'),
('finishing_type', 'medium', 'Medium', 2, 'project_type'),
('finishing_type', 'high', 'High', 3, 'project_type')
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Roof Types (matching database enum values)
INSERT INTO dropdown_options (category, value, label, sort_order, parent_category) VALUES
('roof_type', 'colonial', 'Colonial', 1, 'project_type'),
('roof_type', 'built-in', 'Built-in', 2, 'project_type'),
('roof_type', 'waterproofed', 'Waterproofed', 3, 'project_type')
ON CONFLICT (category, value) DO NOTHING;

-- Seed data - Terrain Types (matching database enum values)
INSERT INTO dropdown_options (category, value, label, sort_order, parent_category) VALUES
('terrain_type', 'flat', 'Flat', 1, 'project_type'),
('terrain_type', 'slope', 'Slope', 2, 'project_type'),
('terrain_type', 'upslope', 'Upslope', 3, 'project_type')
ON CONFLICT (category, value) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dropdown_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dropdown_options_updated_at ON dropdown_options;
CREATE TRIGGER trigger_update_dropdown_options_updated_at
  BEFORE UPDATE ON dropdown_options
  FOR EACH ROW
  EXECUTE FUNCTION update_dropdown_options_updated_at();

COMMIT;
