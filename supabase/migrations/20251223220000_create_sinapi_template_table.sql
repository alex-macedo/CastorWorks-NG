-- Create sinapi_line_items_template table
-- Migration: 20251223220000_create_sinapi_template_table.sql
-- Purpose: Store SINAPI line items template loaded from CSV for budget creation

BEGIN;

CREATE TABLE IF NOT EXISTS public.sinapi_line_items_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Phase grouping (from CSV section headers)
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  
  -- Item identification
  item_number TEXT NOT NULL,  -- e.g., "1.1", "2.3", "3.5"
  sinapi_code TEXT,  -- NULL for phase headers
  
  -- Item details
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sinapi_template_phase_order 
  ON public.sinapi_line_items_template(phase_order);

CREATE INDEX IF NOT EXISTS idx_sinapi_template_sinapi_code 
  ON public.sinapi_line_items_template(sinapi_code) 
  WHERE sinapi_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.sinapi_line_items_template IS 
  'Template table for SINAPI line items loaded from CSV. Used to populate budgets with standard construction items.';

COMMENT ON COLUMN public.sinapi_line_items_template.phase_name IS 
  'Name of the construction phase (e.g., "SERVIÇOS INICIAIS", "FUNDAÇÃO")';

COMMENT ON COLUMN public.sinapi_line_items_template.phase_order IS 
  'Order of the phase in the template (1, 2, 3, etc.)';

COMMENT ON COLUMN public.sinapi_line_items_template.item_number IS 
  'Item number from CSV (e.g., "1.1", "2.3", "3.5")';

COMMENT ON COLUMN public.sinapi_line_items_template.sinapi_code IS 
  'SINAPI catalog code. NULL for phase header rows.';

-- Enable RLS
ALTER TABLE public.sinapi_line_items_template ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read-only for authenticated users
CREATE POLICY "Authenticated users can read template"
  ON public.sinapi_line_items_template
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

COMMIT;

