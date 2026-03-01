-- Create sinapi_project_template_items table
-- Migration: 20251224190001_create_sinapi_template_table.sql
-- Purpose: Template references for project budgets (references sinapi_items)

BEGIN;

CREATE TABLE IF NOT EXISTS public.sinapi_project_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Item identification
  item_number TEXT NOT NULL,  -- e.g., "1.1", "2.3", "3.5"
  sinapi_code TEXT NOT NULL,
  
  -- Quantity (project-specific, can override default from sinapi_items)
  quantity NUMERIC DEFAULT 0,
  
  -- Phase grouping
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  
  -- Display order within phase
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Foreign key constraint will be added in migration 20251224190008_add_template_foreign_key.sql
-- after sinapi_items data is loaded

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sinapi_template_code ON public.sinapi_project_template_items(sinapi_code);
CREATE INDEX IF NOT EXISTS idx_sinapi_template_phase_order ON public.sinapi_project_template_items(phase_order);
CREATE INDEX IF NOT EXISTS idx_sinapi_template_item_number ON public.sinapi_project_template_items(item_number);
CREATE INDEX IF NOT EXISTS idx_sinapi_template_phase_name ON public.sinapi_project_template_items(phase_name);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_sinapi_template_updated_at ON public.sinapi_project_template_items;
CREATE TRIGGER update_sinapi_template_updated_at
  BEFORE UPDATE ON public.sinapi_project_template_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sinapi_project_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read-only for authenticated users
DROP POLICY IF EXISTS "Authenticated users can read sinapi_template" ON public.sinapi_project_template_items;
CREATE POLICY "Authenticated users can read sinapi_template"
  ON public.sinapi_project_template_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add comments for documentation
COMMENT ON TABLE public.sinapi_project_template_items IS 
  'Template table for SINAPI line items loaded from project CSV. References sinapi_items for full details. Used to populate budgets with standard construction items.';

COMMENT ON COLUMN public.sinapi_project_template_items.item_number IS 
  'Item number from CSV (e.g., "1.1", "2.3", "3.5")';

COMMENT ON COLUMN public.sinapi_project_template_items.sinapi_code IS 
  'SINAPI catalog code. References sinapi_items(sinapi_code).';

COMMENT ON COLUMN public.sinapi_project_template_items.quantity IS 
  'Project-specific quantity. Can override default quantity from sinapi_items.';

COMMENT ON COLUMN public.sinapi_project_template_items.phase_name IS 
  'Name of the construction phase (e.g., "SERVIÇOS INICIAIS", "FUNDAÇÃO")';

COMMENT ON COLUMN public.sinapi_project_template_items.phase_order IS 
  'Order of the phase in the template (1, 2, 3, etc.)';

COMMIT;

