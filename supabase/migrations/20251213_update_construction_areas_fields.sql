-- Rename and add new area fields in projects table
-- This migration updates the construction area fields to better reflect project requirements

-- Rename external_area_grass to covered_area
ALTER TABLE projects
RENAME COLUMN external_area_grass TO covered_area;

-- Rename external_area_paving to other_areas
ALTER TABLE projects
RENAME COLUMN external_area_paving TO other_areas;

-- Add new gourmet_area column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS gourmet_area DECIMAL(10,2);

-- Rename total_area to total_gross_floor_area
ALTER TABLE projects
RENAME COLUMN total_area TO total_gross_floor_area;

-- Update comments for renamed columns
COMMENT ON COLUMN projects.covered_area IS 'Covered area in square meters (m²)';
COMMENT ON COLUMN projects.other_areas IS 'Other areas in square meters (m²)';
COMMENT ON COLUMN projects.gourmet_area IS 'Gourmet area in square meters (m²)';
COMMENT ON COLUMN projects.total_gross_floor_area IS 'Total gross floor area in square meters (m²) - calculated as sum of all areas';
