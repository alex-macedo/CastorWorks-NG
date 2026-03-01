-- Phase-first cost control (L1 = project phases)
-- Adds standardized cost codes, versioned budgets, commitments, and phase/cost-code tagging for actuals.

-- ============================================================================
-- 1) Cost Codes (global catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  level int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cost_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_cost_codes_parent_id ON public.cost_codes(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_level ON public.cost_codes(level);
CREATE INDEX IF NOT EXISTS idx_cost_codes_sort_order ON public.cost_codes(sort_order);

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_cost_codes_updated_at ON public.cost_codes;
CREATE TRIGGER update_cost_codes_updated_at
BEFORE UPDATE ON public.cost_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies: read for authenticated, manage for admins
DROP POLICY IF EXISTS "Authenticated users can view cost codes" ON public.cost_codes;
CREATE POLICY "Authenticated users can view cost codes"
ON public.cost_codes FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage cost codes" ON public.cost_codes;
CREATE POLICY "Admins can manage cost codes"
ON public.cost_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.cost_codes TO authenticated;

-- Seed default cost types (Level 1) used under phases
INSERT INTO public.cost_codes (code, name, parent_id, level, sort_order)
VALUES
  ('LAB', 'Labor', NULL, 1, 10),
  ('MAT', 'Materials', NULL, 1, 20),
  ('EQT', 'Equipment', NULL, 1, 30),
  ('SUB', 'Subcontract', NULL, 1, 40),
  ('FEE', 'Permits & Fees', NULL, 1, 50),
  ('OVH', 'Overhead / General Conditions', NULL, 1, 60)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2) Versioned project budgets (baseline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_budget_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'baseline', 'superseded')),
  effective_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_budget_versions_project_id ON public.project_budget_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_versions_status ON public.project_budget_versions(status);

ALTER TABLE public.project_budget_versions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_project_budget_versions_updated_at ON public.project_budget_versions;
CREATE TRIGGER update_project_budget_versions_updated_at
BEFORE UPDATE ON public.project_budget_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view budget versions for accessible projects" ON public.project_budget_versions;
CREATE POLICY "Users can view budget versions for accessible projects"
ON public.project_budget_versions FOR SELECT
TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can manage budget versions" ON public.project_budget_versions;
CREATE POLICY "Project admins can manage budget versions"
ON public.project_budget_versions FOR ALL
TO authenticated
USING (public.has_project_admin_access(auth.uid(), project_id))
WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT, INSERT, UPDATE ON public.project_budget_versions TO authenticated;
GRANT DELETE ON public.project_budget_versions TO service_role;

-- Allow a single baseline per project (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS ux_project_budget_versions_one_baseline
ON public.project_budget_versions(project_id)
WHERE status = 'baseline';

CREATE TABLE IF NOT EXISTS public.project_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.project_budget_versions(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE RESTRICT,
  description text,
  quantity numeric,
  unit text,
  unit_cost numeric,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project_version ON public.project_budget_lines(project_id, version_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_phase_id ON public.project_budget_lines(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_cost_code_id ON public.project_budget_lines(cost_code_id);

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_project_budget_lines_updated_at ON public.project_budget_lines;
CREATE TRIGGER update_project_budget_lines_updated_at
BEFORE UPDATE ON public.project_budget_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view budget lines for accessible projects" ON public.project_budget_lines;
CREATE POLICY "Users can view budget lines for accessible projects"
ON public.project_budget_lines FOR SELECT
TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can manage budget lines" ON public.project_budget_lines;
CREATE POLICY "Project admins can manage budget lines"
ON public.project_budget_lines FOR ALL
TO authenticated
USING (public.has_project_admin_access(auth.uid(), project_id))
WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT, INSERT, UPDATE ON public.project_budget_lines TO authenticated;
GRANT DELETE ON public.project_budget_lines TO service_role;

-- ============================================================================
-- 3) Commitments (POs/contracts) tagged to phase + cost code
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE RESTRICT,
  vendor_name text,
  description text,
  committed_amount numeric NOT NULL CHECK (committed_amount >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'received', 'cancelled')),
  committed_date date NOT NULL DEFAULT current_date,
  source_type text,
  source_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_commitments_project_id ON public.project_commitments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_commitments_phase_id ON public.project_commitments(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_commitments_cost_code_id ON public.project_commitments(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_project_commitments_status ON public.project_commitments(status);

ALTER TABLE public.project_commitments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_project_commitments_updated_at ON public.project_commitments;
CREATE TRIGGER update_project_commitments_updated_at
BEFORE UPDATE ON public.project_commitments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view commitments for accessible projects" ON public.project_commitments;
CREATE POLICY "Users can view commitments for accessible projects"
ON public.project_commitments FOR SELECT
TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project admins can manage commitments" ON public.project_commitments;
CREATE POLICY "Project admins can manage commitments"
ON public.project_commitments FOR ALL
TO authenticated
USING (public.has_project_admin_access(auth.uid(), project_id))
WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT, INSERT, UPDATE ON public.project_commitments TO authenticated;
GRANT DELETE ON public.project_commitments TO service_role;

-- ============================================================================
-- 4) Tag actuals (ledger) and legacy budget items with phase/cost code
-- ============================================================================

ALTER TABLE public.project_financial_entries
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_financial_entries_phase_id
  ON public.project_financial_entries(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_financial_entries_cost_code_id
  ON public.project_financial_entries(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_project_financial_entries_project_cost_code
  ON public.project_financial_entries(project_id, cost_code_id);

ALTER TABLE public.project_budget_items
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_budget_items_cost_code_id
  ON public.project_budget_items(cost_code_id);

-- ============================================================================
-- 5) RPCs for Phase-first cost control
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_active_budget_version_id(_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.project_budget_versions WHERE project_id = _project_id AND status = 'baseline' ORDER BY updated_at DESC LIMIT 1),
    (SELECT id FROM public.project_budget_versions WHERE project_id = _project_id ORDER BY created_at DESC LIMIT 1)
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_project_active_budget_version_id(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_phase_summary(
  _project_id uuid,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL
)
RETURNS TABLE (
  phase_id uuid,
  phase_name text,
  budget_amount numeric,
  committed_amount numeric,
  actual_amount numeric,
  forecast_eac numeric,
  variance numeric,
  percent_used numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  params AS (
    SELECT
      _project_id::uuid AS project_id,
      public.get_project_active_budget_version_id(_project_id) AS version_id,
      _from_date::date AS from_date,
      _to_date::date AS to_date
  ),
  phases AS (
    SELECT pp.id AS phase_id, pp.phase_name, pp.start_date, pp.created_at
    FROM public.project_phases pp
    JOIN params p ON p.project_id = pp.project_id
  ),
  budget AS (
    SELECT bl.phase_id, SUM(bl.amount) AS budget_amount
    FROM public.project_budget_lines bl
    JOIN params p ON p.project_id = bl.project_id AND p.version_id = bl.version_id
    GROUP BY bl.phase_id
  ),
  committed AS (
    SELECT c.phase_id, SUM(c.committed_amount) AS committed_amount
    FROM public.project_commitments c
    JOIN params p ON p.project_id = c.project_id
    WHERE c.status <> 'cancelled'
    GROUP BY c.phase_id
  ),
  actual AS (
    SELECT e.phase_id, SUM(e.amount) AS actual_amount
    FROM public.project_financial_entries e
    JOIN params p ON p.project_id = e.project_id
    WHERE e.entry_type = 'expense'
      AND (p.from_date IS NULL OR e.date::date >= p.from_date)
      AND (p.to_date IS NULL OR e.date::date <= p.to_date)
    GROUP BY e.phase_id
  )
  SELECT
    ph.phase_id,
    ph.phase_name,
    COALESCE(b.budget_amount, 0)::numeric AS budget_amount,
    COALESCE(c.committed_amount, 0)::numeric AS committed_amount,
    COALESCE(a.actual_amount, 0)::numeric AS actual_amount,
    GREATEST(COALESCE(a.actual_amount, 0), COALESCE(c.committed_amount, 0))::numeric AS forecast_eac,
    (COALESCE(b.budget_amount, 0) - GREATEST(COALESCE(a.actual_amount, 0), COALESCE(c.committed_amount, 0)))::numeric AS variance,
    CASE
      WHEN COALESCE(b.budget_amount, 0) > 0 THEN (COALESCE(a.actual_amount, 0) / COALESCE(b.budget_amount, 0)) * 100
      WHEN COALESCE(a.actual_amount, 0) > 0 THEN 100
      ELSE 0
    END::numeric AS percent_used
  FROM phases ph
  LEFT JOIN budget b ON b.phase_id = ph.phase_id
  LEFT JOIN committed c ON c.phase_id = ph.phase_id
  LEFT JOIN actual a ON a.phase_id = ph.phase_id
  ORDER BY ph.start_date NULLS LAST, ph.created_at NULLS LAST, ph.phase_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_phase_summary(uuid, date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_phase_cost_summary(
  _project_id uuid,
  _phase_id uuid,
  _cost_code_level int DEFAULT 1,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL
)
RETURNS TABLE (
  cost_code_id uuid,
  code text,
  name text,
  level int,
  budget_amount numeric,
  committed_amount numeric,
  actual_amount numeric,
  forecast_eac numeric,
  variance numeric,
  percent_used numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  params AS (
    SELECT
      _project_id::uuid AS project_id,
      _phase_id::uuid AS phase_id,
      public.get_project_active_budget_version_id(_project_id) AS version_id,
      _cost_code_level::int AS code_level,
      _from_date::date AS from_date,
      _to_date::date AS to_date
  ),
  codes AS (
    SELECT cc.id, cc.code, cc.name, cc.level, cc.sort_order
    FROM public.cost_codes cc
    JOIN params p ON cc.level = p.code_level
    WHERE cc.is_active = true
  ),
  budget AS (
    SELECT bl.cost_code_id, SUM(bl.amount) AS budget_amount
    FROM public.project_budget_lines bl
    JOIN params p ON p.project_id = bl.project_id AND p.version_id = bl.version_id AND p.phase_id = bl.phase_id
    GROUP BY bl.cost_code_id
  ),
  committed AS (
    SELECT c.cost_code_id, SUM(c.committed_amount) AS committed_amount
    FROM public.project_commitments c
    JOIN params p ON p.project_id = c.project_id
    WHERE c.status <> 'cancelled'
      AND (c.phase_id = p.phase_id OR (c.phase_id IS NULL AND p.phase_id IS NULL))
    GROUP BY c.cost_code_id
  ),
  actual AS (
    SELECT e.cost_code_id, SUM(e.amount) AS actual_amount
    FROM public.project_financial_entries e
    JOIN params p ON p.project_id = e.project_id
    WHERE e.entry_type = 'expense'
      AND (e.phase_id = p.phase_id OR (e.phase_id IS NULL AND p.phase_id IS NULL))
      AND (p.from_date IS NULL OR e.date::date >= p.from_date)
      AND (p.to_date IS NULL OR e.date::date <= p.to_date)
    GROUP BY e.cost_code_id
  )
  SELECT
    codes.id AS cost_code_id,
    codes.code,
    codes.name,
    codes.level,
    COALESCE(b.budget_amount, 0)::numeric AS budget_amount,
    COALESCE(c.committed_amount, 0)::numeric AS committed_amount,
    COALESCE(a.actual_amount, 0)::numeric AS actual_amount,
    GREATEST(COALESCE(a.actual_amount, 0), COALESCE(c.committed_amount, 0))::numeric AS forecast_eac,
    (COALESCE(b.budget_amount, 0) - GREATEST(COALESCE(a.actual_amount, 0), COALESCE(c.committed_amount, 0)))::numeric AS variance,
    CASE
      WHEN COALESCE(b.budget_amount, 0) > 0 THEN (COALESCE(a.actual_amount, 0) / COALESCE(b.budget_amount, 0)) * 100
      WHEN COALESCE(a.actual_amount, 0) > 0 THEN 100
      ELSE 0
    END::numeric AS percent_used
  FROM codes
  LEFT JOIN budget b ON b.cost_code_id = codes.id
  LEFT JOIN committed c ON c.cost_code_id = codes.id
  LEFT JOIN actual a ON a.cost_code_id = codes.id
  ORDER BY codes.sort_order, codes.code;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_phase_cost_summary(uuid, uuid, int, date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_phase_cost_drilldown(
  _project_id uuid,
  _phase_id uuid,
  _cost_code_id uuid,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  params AS (
    SELECT
      _project_id::uuid AS project_id,
      _phase_id::uuid AS phase_id,
      _cost_code_id::uuid AS cost_code_id,
      public.get_project_active_budget_version_id(_project_id) AS version_id,
      _from_date::date AS from_date,
      _to_date::date AS to_date
  ),
  budget_lines AS (
    SELECT
      bl.id,
      bl.description,
      bl.quantity,
      bl.unit,
      bl.unit_cost,
      bl.amount,
      bl.created_at
    FROM public.project_budget_lines bl
    JOIN params p ON p.project_id = bl.project_id AND p.version_id = bl.version_id
    WHERE bl.phase_id = p.phase_id AND bl.cost_code_id = p.cost_code_id
    ORDER BY bl.created_at DESC
  ),
  commitments AS (
    SELECT
      c.id,
      c.vendor_name,
      c.description,
      c.committed_amount,
      c.status,
      c.committed_date,
      c.source_type,
      c.source_id,
      c.created_at
    FROM public.project_commitments c
    JOIN params p ON p.project_id = c.project_id
    WHERE (c.phase_id = p.phase_id OR (c.phase_id IS NULL AND p.phase_id IS NULL))
      AND c.cost_code_id = p.cost_code_id
    ORDER BY c.committed_date DESC, c.created_at DESC
  ),
  actuals AS (
    SELECT
      e.id,
      e.date,
      e.amount,
      e.currency,
      e.category,
      e.description,
      e.payment_method,
      e.recipient_payer,
      e.reference,
      e.created_at
    FROM public.project_financial_entries e
    JOIN params p ON p.project_id = e.project_id
    WHERE e.entry_type = 'expense'
      AND (e.phase_id = p.phase_id OR (e.phase_id IS NULL AND p.phase_id IS NULL))
      AND e.cost_code_id = p.cost_code_id
      AND (p.from_date IS NULL OR e.date::date >= p.from_date)
      AND (p.to_date IS NULL OR e.date::date <= p.to_date)
    ORDER BY e.date DESC, e.created_at DESC
  )
  SELECT jsonb_build_object(
    'budget_lines', COALESCE((SELECT jsonb_agg(to_jsonb(budget_lines)) FROM budget_lines), '[]'::jsonb),
    'commitments', COALESCE((SELECT jsonb_agg(to_jsonb(commitments)) FROM commitments), '[]'::jsonb),
    'actuals', COALESCE((SELECT jsonb_agg(to_jsonb(actuals)) FROM actuals), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_project_phase_cost_drilldown(uuid, uuid, uuid, date, date) TO authenticated;

