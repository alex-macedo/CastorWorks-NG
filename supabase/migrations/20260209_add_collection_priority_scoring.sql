-- Financial Module Phase 2b: Collection Priority Scoring
-- Task P2b.3 - Priority Scoring Algorithm
--
-- Creates:
-- 1. collection_priority_score column on financial_ar_invoices
-- 2. days_overdue computed helper
-- 3. update_collection_priority_score() - single invoice scoring
-- 4. update_all_collection_scores() - bulk scoring for dashboard
-- 5. collection_rate view for analytics

BEGIN;

-- ============================================================
-- Step 1: Add scoring columns to financial_ar_invoices
-- ============================================================

ALTER TABLE public.financial_ar_invoices
  ADD COLUMN IF NOT EXISTS collection_priority_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_overdue INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_collection_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_attempts INTEGER NOT NULL DEFAULT 0;

-- Index for priority queue ordering
CREATE INDEX IF NOT EXISTS idx_ar_invoices_collection_score
  ON public.financial_ar_invoices(collection_priority_score DESC)
  WHERE status IN ('issued', 'overdue', 'partially_paid');

-- ============================================================
-- Step 2: Priority Scoring Function (single invoice)
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_collection_priority_score(
  p_total_amount NUMERIC,
  p_amount_paid NUMERIC,
  p_due_date DATE,
  p_status TEXT,
  p_collection_attempts INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_days_overdue INTEGER;
  v_outstanding NUMERIC;
  v_pct_paid NUMERIC;
BEGIN
  -- Calculate days overdue
  v_days_overdue := GREATEST(0, (CURRENT_DATE - p_due_date));

  -- Outstanding balance
  v_outstanding := GREATEST(0, p_total_amount - COALESCE(p_amount_paid, 0));
  v_pct_paid := CASE WHEN p_total_amount > 0
    THEN COALESCE(p_amount_paid, 0) / p_total_amount
    ELSE 0
  END;

  -- Skip fully paid or non-overdue
  IF v_outstanding <= 0 OR v_days_overdue <= 0 THEN
    RETURN 0;
  END IF;

  -- ── Factor 1: Days Overdue (0–40 points) ──
  -- Accelerating curve: urgency grows faster after 14 days
  IF v_days_overdue <= 7 THEN
    v_score := v_score + (v_days_overdue * 2);       -- 0-14 pts
  ELSIF v_days_overdue <= 14 THEN
    v_score := v_score + 14 + ((v_days_overdue - 7) * 2); -- 14-28 pts
  ELSIF v_days_overdue <= 30 THEN
    v_score := v_score + 28 + ((v_days_overdue - 14) * 1); -- 28-44 pts → capped at 40
  ELSE
    v_score := v_score + 40;
  END IF;
  v_score := LEAST(v_score, 40);

  -- ── Factor 2: Outstanding Amount (0–30 points) ──
  -- Tiered: larger amounts get higher priority
  IF v_outstanding >= 100000 THEN
    v_score := v_score + 30;
  ELSIF v_outstanding >= 50000 THEN
    v_score := v_score + 25;
  ELSIF v_outstanding >= 10000 THEN
    v_score := v_score + 20;
  ELSIF v_outstanding >= 5000 THEN
    v_score := v_score + 15;
  ELSIF v_outstanding >= 1000 THEN
    v_score := v_score + 10;
  ELSE
    v_score := v_score + 5;
  END IF;

  -- ── Factor 3: Collection Responsiveness (0–15 points) ──
  -- More attempts without payment = higher score
  IF p_collection_attempts >= 5 THEN
    v_score := v_score + 15;
  ELSIF p_collection_attempts >= 3 THEN
    v_score := v_score + 10;
  ELSIF p_collection_attempts >= 1 THEN
    v_score := v_score + 5;
  END IF;

  -- ── Factor 4: Partial Payment Discount (0 to -10 points) ──
  -- Customers who paid partially are less risky
  IF v_pct_paid > 0.5 THEN
    v_score := v_score - 10;
  ELSIF v_pct_paid > 0.25 THEN
    v_score := v_score - 5;
  END IF;

  -- ── Factor 5: Status Boost (0–5 points) ──
  IF p_status = 'overdue' THEN
    v_score := v_score + 5;
  END IF;

  -- Clamp to 0-100 range
  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_collection_priority_score IS
  'Calculates a 0-100 priority score for collection follow-up.
   Factors: days overdue (40%), amount (30%), responsiveness (15%),
   partial payment discount (-10%), status boost (5%).';

-- ============================================================
-- Step 3: Bulk Update Function (called by dashboard)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_all_collection_scores()
RETURNS void AS $$
BEGIN
  UPDATE public.financial_ar_invoices
  SET
    days_overdue = GREATEST(0, (CURRENT_DATE - due_date)),
    collection_priority_score = public.calculate_collection_priority_score(
      total_amount,
      amount_paid,
      due_date,
      status,
      collection_attempts
    ),
    updated_at = NOW()
  WHERE status IN ('issued', 'overdue', 'partially_paid')
    AND due_date < CURRENT_DATE;

  -- Reset score for non-overdue invoices
  UPDATE public.financial_ar_invoices
  SET
    days_overdue = 0,
    collection_priority_score = 0,
    updated_at = NOW()
  WHERE (status NOT IN ('issued', 'overdue', 'partially_paid')
    OR due_date >= CURRENT_DATE)
    AND collection_priority_score > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_all_collection_scores IS
  'Recalculates collection priority scores for all overdue invoices.
   Called by the Collections Dashboard on load and by cron nightly.';

-- ============================================================
-- Step 4: Collection Rate Analytics Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_collection_rate(
  p_project_id UUID DEFAULT NULL,
  p_days_lookback INTEGER DEFAULT 90
)
RETURNS TABLE (
  total_invoices BIGINT,
  collected_invoices BIGINT,
  collection_rate NUMERIC,
  total_amount_due NUMERIC,
  total_amount_collected NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_invoices,
    COUNT(*) FILTER (WHERE i.status = 'paid')::BIGINT AS collected_invoices,
    CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'paid'))::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END AS collection_rate,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC AS total_amount_due,
    COALESCE(SUM(i.amount_paid), 0)::NUMERIC AS total_amount_collected
  FROM public.financial_ar_invoices i
  WHERE i.created_at >= (CURRENT_DATE - (p_days_lookback || ' days')::INTERVAL)
    AND (p_project_id IS NULL OR i.project_id = p_project_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_collection_rate IS
  'Returns collection rate metrics for the dashboard summary cards.';

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_ar_invoices'
    AND column_name = 'collection_priority_score'
  ) THEN
    RAISE EXCEPTION 'collection_priority_score column not created';
  END IF;

  RAISE NOTICE '== Collection Priority Scoring Migration Complete ==';
  RAISE NOTICE '   - collection_priority_score column added';
  RAISE NOTICE '   - days_overdue column added';
  RAISE NOTICE '   - calculate_collection_priority_score() function created';
  RAISE NOTICE '   - update_all_collection_scores() function created';
  RAISE NOTICE '   - get_collection_rate() function created';
END $$;

COMMIT;
