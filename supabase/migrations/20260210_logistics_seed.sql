-- Phase 10: Logistics Seed Data
-- Seed inventory and deliveries for the test project

DO $$
DECLARE
    v_project_id uuid := '45dc7301-fbb1-485d-9280-f4a74b530596';
    v_supplier_id uuid;
    v_inv_id uuid;
BEGIN
    -- 1. Get or create a supplier
    SELECT id INTO v_supplier_id FROM suppliers LIMIT 1;
    IF v_supplier_id IS NULL THEN
        INSERT INTO suppliers (name, contact_name, email, phone, category)
        VALUES ('Global Materials Corp', 'John Logistic', 'logistics@global.com', '11988887777', 'building_materials')
        RETURNING id INTO v_supplier_id;
    END IF;

    -- 2. Add items to Inventory
    INSERT INTO project_inventory (project_id, item_name, sku, current_stock, min_stock_level, unit, qr_code_content, location_in_site)
    VALUES 
    (v_project_id, 'Portland Cement CP-II', 'MAT-CEM-001', 50, 100, 'bags', 'CW-MAT-001-CEMENT', 'Main Storage A'),
    (v_project_id, 'Steel Rebar 10mm', 'MAT-STL-010', 500, 200, 'kg', 'CW-MAT-002-STEEL', 'Outdoor Yard'),
    (v_project_id, 'Red Bricks', 'MAT-BRK-001', 1200, 5000, 'units', 'CW-MAT-003-BRICKS', 'Masonry Zone B');

    -- 3. Add scheduled deliveries
    INSERT INTO project_deliveries (project_id, supplier_id, status, scheduled_date, estimated_arrival, tracking_number, driver_contact, items)
    VALUES 
    (v_project_id, v_supplier_id, 'scheduled', current_date, now() + interval '2 hours', 'TRK-998877', '+13302122153', '[{"name": "Sand", "qty": 10, "unit": "m3"}]'),
    (v_project_id, v_supplier_id, 'in_transit', current_date, now() + interval '30 minutes', 'TRK-112233', '+13302122153', '[{"name": "Gravel", "qty": 5, "unit": "m3"}]');

END $$;
