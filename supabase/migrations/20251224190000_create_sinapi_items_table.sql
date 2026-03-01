-- Create sinapi_items table
-- Migration: 20251224190000_create_sinapi_items_table.sql
-- Purpose: Complete catalog of 7,111 SINAPI items with all details

BEGIN;

CREATE TABLE IF NOT EXISTS public.sinapi_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Item identification
  sinapi_code TEXT NOT NULL,
  sinapi_item TEXT NOT NULL,  -- Item number from CSV (CÓD. ITEM)
  
  -- Item details
  sinapi_description TEXT NOT NULL,
  sinapi_unit TEXT NOT NULL,
  sinapi_quantity NUMERIC DEFAULT 0,  -- Default quantity from catalog
  sinapi_unit_price NUMERIC DEFAULT 0,  -- Unit price from CSV
  
  -- Cost information
  sinapi_material_cost NUMERIC NOT NULL DEFAULT 0,
  sinapi_labor_cost NUMERIC NOT NULL DEFAULT 0,
  sinapi_total_cost NUMERIC GENERATED ALWAYS AS (sinapi_material_cost + sinapi_labor_cost) STORED,
  
  -- Type classification
  sinapi_type TEXT CHECK (sinapi_type IN ('Labor', 'Materials')),
  
  -- Metadata
  base_year INTEGER,
  base_state TEXT DEFAULT 'SP',
  search_vector tsvector,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: same code can have multiple items (different sinapi_item values)
  UNIQUE(sinapi_code, sinapi_item)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sinapi_items_code ON public.sinapi_items(sinapi_code);
CREATE INDEX IF NOT EXISTS idx_sinapi_items_item ON public.sinapi_items(sinapi_item);
CREATE INDEX IF NOT EXISTS idx_sinapi_items_type ON public.sinapi_items(sinapi_type);
CREATE INDEX IF NOT EXISTS idx_sinapi_items_state ON public.sinapi_items(base_state);
CREATE INDEX IF NOT EXISTS idx_sinapi_items_search_vector ON public.sinapi_items USING GIN(search_vector);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_sinapi_items_updated_at ON public.sinapi_items;
CREATE TRIGGER update_sinapi_items_updated_at
  BEFORE UPDATE ON public.sinapi_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for search_vector update
DROP TRIGGER IF EXISTS update_sinapi_items_search_vector ON public.sinapi_items;
CREATE TRIGGER update_sinapi_items_search_vector
  BEFORE INSERT OR UPDATE ON public.sinapi_items
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(
    search_vector,
    'pg_catalog.portuguese',
    sinapi_code,
    sinapi_description
  );

-- Enable RLS
ALTER TABLE public.sinapi_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read-only for authenticated users
DROP POLICY IF EXISTS "Authenticated users can read sinapi_items" ON public.sinapi_items;
CREATE POLICY "Authenticated users can read sinapi_items"
  ON public.sinapi_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add comments for documentation
COMMENT ON TABLE public.sinapi_items IS 
  'Complete catalog of SINAPI construction items. Contains 7,111 items with costs, descriptions, and metadata.';

COMMENT ON COLUMN public.sinapi_items.sinapi_code IS 
  'SINAPI catalog code (e.g., "97141", "90778")';

COMMENT ON COLUMN public.sinapi_items.sinapi_item IS 
  'Item number from CSV (CÓD. ITEM). Same sinapi_code can have multiple items.';

COMMENT ON COLUMN public.sinapi_items.sinapi_type IS 
  'Item type: "Labor" (Mão de Obra) or "Materials" (Insumo)';

COMMENT ON COLUMN public.sinapi_items.sinapi_quantity IS 
  'Default quantity from catalog. Can be overridden in project templates.';

COMMIT;

