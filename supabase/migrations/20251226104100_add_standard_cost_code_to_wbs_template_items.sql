-- Migration: Add standard_cost_code column to project_wbs_template_items
-- This enables mapping WBS items to cost codes for import into Cost Control budgets

-- Step 1: Add standard_cost_code column (nullable for existing items)
ALTER TABLE project_wbs_template_items 
  ADD COLUMN IF NOT EXISTS standard_cost_code TEXT;

-- Step 2: Add check constraint to ensure only valid cost codes are used
-- These are all valid codes across all supported languages
ALTER TABLE project_wbs_template_items 
  ADD CONSTRAINT check_standard_cost_code_valid
    CHECK (
      standard_cost_code IS NULL OR 
      standard_cost_code IN (
        -- English codes
        'LAB', 'MAT', 'EQT', 'SUB', 'FEE', 'OVH', 'ADM',
        -- Portuguese codes
        'MO', 'EQP', 'TER', 'TAX', 'IND',
        -- Spanish codes (MO, MAT, EQP, SUB, TAX, IND, ADM overlap with above)
        -- French codes
        'ST'  -- Sous-Traitance (French for Subcontract)
      )
    );

-- Step 3: Add index for performance when filtering by cost code
CREATE INDEX IF NOT EXISTS idx_wbs_template_items_cost_code
  ON project_wbs_template_items(standard_cost_code)
  WHERE standard_cost_code IS NOT NULL;

-- Step 4: Add comment to explain the column
COMMENT ON COLUMN project_wbs_template_items.standard_cost_code IS 
  'Standard cost code string (e.g., MO, LAB, MAT) that will be mapped to language-specific cost code UUID during import to Cost Control budget';
