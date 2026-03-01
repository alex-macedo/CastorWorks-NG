-- Add missing columns to project_materials table
-- Migration: 20251230000005
-- Description: Adds fee_desc and editable columns to project_materials to match template structure and RPC requirements.

BEGIN;

-- Add fee_desc column
ALTER TABLE public.project_materials 
ADD COLUMN IF NOT EXISTS fee_desc TEXT;

-- Add editable column
ALTER TABLE public.project_materials 
ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT true;

-- Update comments
COMMENT ON COLUMN public.project_materials.fee_desc IS 'Optional fee description for the material item';
COMMENT ON COLUMN public.project_materials.editable IS 'Whether the item can be edited in the project budget view';

COMMIT;
