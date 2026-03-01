-- Create project_budgets table
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budget_type TEXT NOT NULL DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived'))
);

-- Add constraint separately to avoid naming conflicts
ALTER TABLE public.project_budgets
  ADD CONSTRAINT project_budgets_budget_type_check
  CHECK (budget_type IN ('simple', 'detailed', 'parametric'));

-- Create indexes for project_budgets
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON public.project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_status ON public.project_budgets(status);
CREATE INDEX IF NOT EXISTS idx_project_budgets_created_by ON public.project_budgets(created_by);

-- Create trigger for updated_at on project_budgets
DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON public.project_budgets;
CREATE TRIGGER update_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on project_budgets
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

---

-- Create budget_line_items table
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,

  -- Reference data
  sinapi_code TEXT NOT NULL,
  item_number TEXT,

  -- Data from SINAPI
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_material NUMERIC NOT NULL DEFAULT 0,
  unit_cost_labor NUMERIC NOT NULL DEFAULT 0,

  -- Quantity and totals
  quantity NUMERIC NOT NULL DEFAULT 0,
  total_material NUMERIC GENERATED ALWAYS AS (quantity * unit_cost_material) STORED,
  total_labor NUMERIC GENERATED ALWAYS AS (quantity * unit_cost_labor) STORED,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * (unit_cost_material + unit_cost_labor)) STORED,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for budget_line_items
CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget_id ON public.budget_line_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_phase_id ON public.budget_line_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_sinapi_code ON public.budget_line_items(sinapi_code);

-- Create trigger for updated_at on budget_line_items
DROP TRIGGER IF EXISTS update_budget_line_items_updated_at ON public.budget_line_items;
CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on budget_line_items
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

---

-- Create budget_phase_totals table
CREATE TABLE IF NOT EXISTS public.budget_phase_totals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,

  total_material NUMERIC DEFAULT 0,
  total_labor NUMERIC DEFAULT 0,
  total_direct_cost NUMERIC GENERATED ALWAYS AS (total_material + total_labor) STORED,

  bdi_percentage NUMERIC DEFAULT 0,
  bdi_amount NUMERIC DEFAULT 0,
  final_total NUMERIC GENERATED ALWAYS AS (total_material + total_labor + bdi_amount) STORED,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(budget_id, phase_id)
);

-- Create indexes for budget_phase_totals
CREATE INDEX IF NOT EXISTS idx_budget_phase_totals_budget_id ON public.budget_phase_totals(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_phase_totals_phase_id ON public.budget_phase_totals(phase_id);

-- Create trigger for updated_at on budget_phase_totals
DROP TRIGGER IF EXISTS update_budget_phase_totals_updated_at ON public.budget_phase_totals;
CREATE TRIGGER update_budget_phase_totals_updated_at
  BEFORE UPDATE ON public.budget_phase_totals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on budget_phase_totals
ALTER TABLE public.budget_phase_totals ENABLE ROW LEVEL SECURITY;

---

-- Create budget_bdi_components table
CREATE TABLE IF NOT EXISTS public.budget_bdi_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,

  component_type TEXT NOT NULL CHECK (component_type IN (
    'central_administration',
    'site_overhead',
    'financial_costs',
    'risks_insurance',
    'taxes',
    'profit_margin'
  )),

  percentage NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for budget_bdi_components
CREATE INDEX IF NOT EXISTS idx_budget_bdi_components_budget_id ON public.budget_bdi_components(budget_id);

-- Create trigger for updated_at on budget_bdi_components
DROP TRIGGER IF EXISTS update_budget_bdi_components_updated_at ON public.budget_bdi_components;
CREATE TRIGGER update_budget_bdi_components_updated_at
  BEFORE UPDATE ON public.budget_bdi_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on budget_bdi_components
ALTER TABLE public.budget_bdi_components ENABLE ROW LEVEL SECURITY;

---

-- Create budget_history table for audit trail
CREATE TABLE IF NOT EXISTS public.budget_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,

  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'line_added', 'line_removed', 'published', 'approved', 'status_changed')),
  changed_by UUID REFERENCES auth.users(id),
  previous_values JSONB,
  new_values JSONB,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for budget_history
CREATE INDEX IF NOT EXISTS idx_budget_history_budget_id ON public.budget_history(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_changed_by ON public.budget_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_budget_history_created_at ON public.budget_history(created_at DESC);

-- Enable RLS on budget_history
ALTER TABLE public.budget_history ENABLE ROW LEVEL SECURITY;

---

-- Create sinapi_catalog table
CREATE TABLE IF NOT EXISTS public.sinapi_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinapi_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_material NUMERIC NOT NULL DEFAULT 0,
  unit_cost_labor NUMERIC NOT NULL DEFAULT 0,
  item_type TEXT CHECK (item_type IN ('composition', 'input', 'equipment')),

  base_year INTEGER,
  base_state TEXT DEFAULT 'SP',
  search_vector tsvector,

  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add base_state column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'base_state'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN base_state TEXT DEFAULT 'SP';
  END IF;

  -- Add search_vector column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Create indexes for sinapi_catalog
CREATE INDEX IF NOT EXISTS idx_sinapi_catalog_code ON public.sinapi_catalog(sinapi_code);
CREATE INDEX IF NOT EXISTS idx_sinapi_catalog_base_state ON public.sinapi_catalog(base_state);
CREATE INDEX IF NOT EXISTS idx_sinapi_catalog_search_vector ON public.sinapi_catalog USING GIN(search_vector);

-- Create trigger for updated_at on sinapi_catalog
DROP TRIGGER IF EXISTS update_sinapi_catalog_updated_at ON public.sinapi_catalog;
CREATE TRIGGER update_sinapi_catalog_updated_at
  BEFORE UPDATE ON public.sinapi_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for search_vector update
DROP TRIGGER IF EXISTS update_sinapi_catalog_search_vector ON public.sinapi_catalog;
CREATE TRIGGER update_sinapi_catalog_search_vector
  BEFORE INSERT OR UPDATE ON public.sinapi_catalog
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'pg_catalog.portuguese', sinapi_code, description);

-- Enable RLS on sinapi_catalog (read-only for authenticated users)
ALTER TABLE public.sinapi_catalog ENABLE ROW LEVEL SECURITY;

---

-- Comment on tables for documentation
COMMENT ON TABLE public.project_budgets IS 'Main budget records for construction projects';
COMMENT ON TABLE public.budget_line_items IS 'Individual line items (materials, labor, equipment) in a budget';
COMMENT ON TABLE public.budget_phase_totals IS 'Cached totals per phase for performance';
COMMENT ON TABLE public.budget_bdi_components IS 'BDI (Benefícios e Despesas Indiretas) component breakdown';
COMMENT ON TABLE public.budget_history IS 'Audit trail for budget changes';
COMMENT ON TABLE public.sinapi_catalog IS 'SINAPI catalog of construction items and compositions';

COMMENT ON COLUMN public.project_budgets.status IS 'draft: under development, review: pending approval, approved: finalized, archived: no longer active';
COMMENT ON COLUMN public.budget_line_items.total_material IS 'Generated column: quantity * unit_cost_material';
COMMENT ON COLUMN public.budget_line_items.total_labor IS 'Generated column: quantity * unit_cost_labor';
COMMENT ON COLUMN public.budget_line_items.total_cost IS 'Generated column: total_material + total_labor';
COMMENT ON COLUMN public.budget_phase_totals.bdi_amount IS 'Calculated BDI amount = total_direct_cost * (bdi_percentage / 100)';
COMMENT ON COLUMN public.sinapi_catalog.search_vector IS 'Full-text search index for Portuguese';
