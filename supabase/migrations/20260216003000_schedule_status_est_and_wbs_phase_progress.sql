BEGIN;

CREATE OR REPLACE FUNCTION public.schedule_status_as_of_date()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (NOW() AT TIME ZONE 'America/New_York')::date
$$;

COMMENT ON FUNCTION public.schedule_status_as_of_date() IS
  'Returns schedule as-of date in America/New_York (EST/EDT) for schedule status rollovers.';

CREATE OR REPLACE FUNCTION public.compute_project_schedule_status(
  p_project_id UUID,
  p_as_of_date DATE DEFAULT public.schedule_status_as_of_date()
)
RETURNS TABLE(schedule_status public.project_schedule_status, metrics_json JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_version TEXT := 'v1.0.1';
  v_task_count INTEGER := 0;
  v_overdue_count INTEGER := 0;
  v_due_soon_count INTEGER := 0;
  v_started_count INTEGER := 0;
  v_completed_count INTEGER := 0;
  v_planned_weight NUMERIC := 0;
  v_actual_weight NUMERIC := 0;
  v_spi NUMERIC := NULL;
  v_source TEXT := 'none';
  v_status public.project_schedule_status := 'not_started';
BEGIN
  -- Prefer task-level schedule data
  WITH activity_base AS (
    SELECT
      pa.id,
      pa.start_date,
      pa.end_date,
      GREATEST(COALESCE(pa.completion_percentage, 0), 0)::NUMERIC AS actual_progress,
      GREATEST(COALESCE(pa.days_for_activity, 1), 1)::NUMERIC AS weight
    FROM public.project_activities pa
    WHERE pa.project_id = p_project_id
  ),
  activity_calc AS (
    SELECT
      id,
      start_date,
      end_date,
      actual_progress,
      weight,
      CASE
        WHEN start_date IS NULL OR end_date IS NULL THEN NULL
        WHEN p_as_of_date < start_date THEN 0::NUMERIC
        WHEN p_as_of_date >= end_date THEN 100::NUMERIC
        ELSE LEAST(
          100::NUMERIC,
          GREATEST(
            0::NUMERIC,
            ((p_as_of_date - start_date)::NUMERIC / GREATEST((end_date - start_date)::NUMERIC, 1::NUMERIC)) * 100::NUMERIC
          )
        )
      END AS planned_progress,
      CASE
        WHEN end_date IS NOT NULL
          AND p_as_of_date > end_date
          AND actual_progress < 100
        THEN 1 ELSE 0
      END AS is_overdue,
      CASE
        WHEN end_date IS NOT NULL
          AND p_as_of_date <= end_date
          AND end_date <= (p_as_of_date + 7)
          AND actual_progress < 100
        THEN 1 ELSE 0
      END AS is_due_soon,
      CASE WHEN actual_progress > 0 THEN 1 ELSE 0 END AS is_started,
      CASE WHEN actual_progress >= 100 THEN 1 ELSE 0 END AS is_completed
    FROM activity_base
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(is_overdue), 0)::INTEGER,
    COALESCE(SUM(is_due_soon), 0)::INTEGER,
    COALESCE(SUM(is_started), 0)::INTEGER,
    COALESCE(SUM(is_completed), 0)::INTEGER,
    COALESCE(SUM(COALESCE(planned_progress, 0) * weight), 0)::NUMERIC,
    COALESCE(SUM(actual_progress * weight), 0)::NUMERIC
  INTO
    v_task_count,
    v_overdue_count,
    v_due_soon_count,
    v_started_count,
    v_completed_count,
    v_planned_weight,
    v_actual_weight
  FROM activity_calc;

  IF v_task_count > 0 THEN
    v_source := 'project_activities';
  ELSE
    -- Fallback to phase-level schedule data when no activities exist.
    -- Include WBS-linked phase progress/status when available (wbs_item_id).
    WITH phase_base AS (
      SELECT
        pp.id,
        pp.start_date,
        pp.end_date,
        CASE
          WHEN LOWER(COALESCE(pwi.status, '')) = 'completed' THEN 100::NUMERIC
          ELSE GREATEST(
            COALESCE(pwi.progress_percentage::NUMERIC, pp.progress_percentage::NUMERIC, 0),
            0
          )::NUMERIC
        END AS actual_progress,
        GREATEST(
          COALESCE(
            NULLIF((pp.end_date - pp.start_date), 0),
            1
          ),
          1
        )::NUMERIC AS weight
      FROM public.project_phases pp
      LEFT JOIN public.project_wbs_items pwi
        ON pwi.id = pp.wbs_item_id
       AND pwi.project_id = pp.project_id
      WHERE pp.project_id = p_project_id
        AND COALESCE(pp.type, 'schedule') = 'schedule'
    ),
    phase_calc AS (
      SELECT
        id,
        start_date,
        end_date,
        actual_progress,
        weight,
        CASE
          WHEN start_date IS NULL OR end_date IS NULL THEN NULL
          WHEN p_as_of_date < start_date THEN 0::NUMERIC
          WHEN p_as_of_date >= end_date THEN 100::NUMERIC
          ELSE LEAST(
            100::NUMERIC,
            GREATEST(
              0::NUMERIC,
              ((p_as_of_date - start_date)::NUMERIC / GREATEST((end_date - start_date)::NUMERIC, 1::NUMERIC)) * 100::NUMERIC
            )
          )
        END AS planned_progress,
        CASE
          WHEN end_date IS NOT NULL
            AND p_as_of_date > end_date
            AND actual_progress < 100
          THEN 1 ELSE 0
        END AS is_overdue,
        CASE
          WHEN end_date IS NOT NULL
            AND p_as_of_date <= end_date
            AND end_date <= (p_as_of_date + 7)
            AND actual_progress < 100
          THEN 1 ELSE 0
        END AS is_due_soon,
        CASE WHEN actual_progress > 0 THEN 1 ELSE 0 END AS is_started,
        CASE WHEN actual_progress >= 100 THEN 1 ELSE 0 END AS is_completed
      FROM phase_base
    )
    SELECT
      COUNT(*)::INTEGER,
      COALESCE(SUM(is_overdue), 0)::INTEGER,
      COALESCE(SUM(is_due_soon), 0)::INTEGER,
      COALESCE(SUM(is_started), 0)::INTEGER,
      COALESCE(SUM(is_completed), 0)::INTEGER,
      COALESCE(SUM(COALESCE(planned_progress, 0) * weight), 0)::NUMERIC,
      COALESCE(SUM(actual_progress * weight), 0)::NUMERIC
    INTO
      v_task_count,
      v_overdue_count,
      v_due_soon_count,
      v_started_count,
      v_completed_count,
      v_planned_weight,
      v_actual_weight
    FROM phase_calc;

    IF v_task_count > 0 THEN
      v_source := 'project_phases';
    END IF;
  END IF;

  IF v_planned_weight > 0 THEN
    v_spi := v_actual_weight / v_planned_weight;
  ELSE
    v_spi := NULL;
  END IF;

  -- Precedence rules
  IF v_task_count = 0 THEN
    v_status := 'not_started';
  ELSIF v_overdue_count > 0 OR (v_spi IS NOT NULL AND v_spi < 0.90) THEN
    v_status := 'delayed';
  ELSIF (v_spi IS NOT NULL AND v_spi >= 0.90 AND v_spi < 0.97) OR v_due_soon_count > 0 THEN
    v_status := 'at_risk';
  ELSIF v_started_count = 0 AND v_completed_count = 0 THEN
    v_status := 'not_started';
  ELSE
    v_status := 'on_schedule';
  END IF;

  RETURN QUERY
  SELECT
    v_status,
    jsonb_build_object(
      'rule_version', v_rule_version,
      'as_of_date', p_as_of_date,
      'data_source', v_source,
      'task_count', v_task_count,
      'overdue_count', v_overdue_count,
      'due_soon_count', v_due_soon_count,
      'started_count', v_started_count,
      'completed_count', v_completed_count,
      'spi', CASE WHEN v_spi IS NULL THEN NULL ELSE ROUND(v_spi, 4) END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_project_schedule_status(
  p_project_id UUID,
  p_as_of_date DATE DEFAULT public.schedule_status_as_of_date()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.project_schedule_status;
  v_metrics JSONB;
BEGIN
  SELECT cpss.schedule_status, cpss.metrics_json
  INTO v_status, v_metrics
  FROM public.compute_project_schedule_status(p_project_id, p_as_of_date) cpss;

  UPDATE public.projects
  SET
    schedule_status = v_status,
    schedule_status_metrics = COALESCE(v_metrics, '{}'::jsonb),
    schedule_status_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_schedule_status_from_activities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_project_id UUID;
  v_new_project_id UUID;
BEGIN
  v_old_project_id := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.project_id ELSE NULL END;
  v_new_project_id := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN NEW.project_id ELSE NULL END;

  IF v_old_project_id IS NOT NULL THEN
    PERFORM public.refresh_project_schedule_status(v_old_project_id, public.schedule_status_as_of_date());
  END IF;

  IF v_new_project_id IS NOT NULL AND v_new_project_id IS DISTINCT FROM v_old_project_id THEN
    PERFORM public.refresh_project_schedule_status(v_new_project_id, public.schedule_status_as_of_date());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_schedule_status_from_phases_fallback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_project_id UUID;
  v_new_project_id UUID;
BEGIN
  v_old_project_id := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.project_id ELSE NULL END;
  v_new_project_id := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN NEW.project_id ELSE NULL END;

  IF v_old_project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.project_activities pa WHERE pa.project_id = v_old_project_id)
  THEN
    PERFORM public.refresh_project_schedule_status(v_old_project_id, public.schedule_status_as_of_date());
  END IF;

  IF v_new_project_id IS NOT NULL
    AND v_new_project_id IS DISTINCT FROM v_old_project_id
    AND NOT EXISTS (SELECT 1 FROM public.project_activities pa WHERE pa.project_id = v_new_project_id)
  THEN
    PERFORM public.refresh_project_schedule_status(v_new_project_id, public.schedule_status_as_of_date());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_init_schedule_status_on_project_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_project_schedule_status(NEW.id, public.schedule_status_as_of_date());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_project_schedule_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  FOR v_project_id IN
    SELECT id
    FROM public.projects
    WHERE COALESCE(status::text, '') NOT IN ('completed', 'cancelled')
  LOOP
    PERFORM public.refresh_project_schedule_status(v_project_id, public.schedule_status_as_of_date());
  END LOOP;
END;
$$;

COMMIT;
