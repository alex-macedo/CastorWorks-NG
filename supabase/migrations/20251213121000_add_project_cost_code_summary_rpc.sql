-- Add cost-code summary RPC (aggregated across all phases)
-- Used to make Budget & Expenses compatible with the new Cost Control model.

CREATE OR REPLACE FUNCTION public.get_project_cost_code_summary(
  _project_id uuid,
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
    JOIN params p ON p.project_id = bl.project_id AND p.version_id = bl.version_id
    GROUP BY bl.cost_code_id
  ),
  committed AS (
    SELECT c.cost_code_id, SUM(c.committed_amount) AS committed_amount
    FROM public.project_commitments c
    JOIN params p ON p.project_id = c.project_id
    WHERE c.status <> 'cancelled'
    GROUP BY c.cost_code_id
  ),
  actual AS (
    SELECT e.cost_code_id, SUM(e.amount) AS actual_amount
    FROM public.project_financial_entries e
    JOIN params p ON p.project_id = e.project_id
    WHERE e.entry_type = 'expense'
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

GRANT EXECUTE ON FUNCTION public.get_project_cost_code_summary(uuid, int, date, date) TO authenticated;

