BEGIN;

CREATE OR REPLACE FUNCTION public.schedule_status_system_timezone()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_system_tz text;
BEGIN
  SELECT s.system_time_zone
  INTO v_system_tz
  FROM public.app_settings s
  WHERE s.system_time_zone IS NOT NULL
    AND btrim(s.system_time_zone) <> ''
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.id DESC
  LIMIT 1;

  IF v_system_tz IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names tz
    WHERE tz.name = v_system_tz
  ) THEN
    v_system_tz := 'America/New_York';
  END IF;

  RETURN v_system_tz;
END;
$$;

COMMENT ON FUNCTION public.schedule_status_system_timezone() IS
  'Returns system timezone from app_settings.system_time_zone with America/New_York fallback.';

CREATE OR REPLACE FUNCTION public.schedule_status_as_of_date()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (NOW() AT TIME ZONE public.schedule_status_system_timezone())::date
$$;

COMMENT ON FUNCTION public.schedule_status_as_of_date() IS
  'Returns schedule as-of date using app_settings.system_time_zone (System Preferences), with America/New_York fallback.';

CREATE OR REPLACE FUNCTION public.compute_project_schedule_status(
  p_project_id uuid,
  p_as_of_date date DEFAULT public.schedule_status_as_of_date()
)
RETURNS TABLE(schedule_status public.project_schedule_status, metrics_json jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_version text := 'v2.0.0';
  v_timezone text := public.schedule_status_system_timezone();
  v_phase_count integer := 0;
  v_overdue_count integer := 0;
  v_due_soon_count integer := 0;
  v_started_count integer := 0;
  v_completed_count integer := 0;
  v_planned_weight numeric := 0;
  v_actual_weight numeric := 0;
  v_spi numeric := null;
  v_source text := 'project_phases';
  v_status public.project_schedule_status := 'not_started';
  v_phase_diagnostics jsonb := '[]'::jsonb;
BEGIN
  WITH phase_base AS (
    SELECT
      pp.id,
      pp.phase_name,
      pp.sort_order,
      pp.project_id,
      pp.wbs_item_id,
      pp.start_date,
      pp.end_date,
      GREATEST(COALESCE(pp.progress_percentage::numeric, 0), 0)::numeric AS phase_progress,
      pwi.status AS parent_wbs_status,
      pwi.progress_percentage AS parent_wbs_progress,
      GREATEST(COALESCE(NULLIF((pp.end_date - pp.start_date), 0), 1), 1)::numeric AS phase_weight
    FROM public.project_phases pp
    LEFT JOIN public.project_wbs_items pwi
      ON pwi.id = pp.wbs_item_id
     AND pwi.project_id = pp.project_id
    WHERE pp.project_id = p_project_id
      AND COALESCE(pp.type, 'schedule') = 'schedule'
  ),
  phase_rollup AS (
    SELECT
      pb.*,
      CASE
        WHEN pb.wbs_item_id IS NOT NULL
          AND COALESCE(wr.leaf_count, 0) > 0
          AND COALESCE(wr.weight_sum, 0) > 0
        THEN LEAST(100::numeric, GREATEST(0::numeric, wr.weighted_actual_sum / wr.weight_sum))
        WHEN LOWER(COALESCE(pb.parent_wbs_status, '')) = 'completed' THEN 100::numeric
        WHEN pb.wbs_item_id IS NOT NULL THEN GREATEST(COALESCE(pb.parent_wbs_progress::numeric, pb.phase_progress, 0), 0)
        ELSE GREATEST(COALESCE(pb.phase_progress, 0), 0)
      END AS actual_progress
    FROM phase_base pb
    LEFT JOIN LATERAL (
      WITH RECURSIVE wbs_subtree AS (
        SELECT
          wi.id,
          wi.project_id,
          wi.status,
          wi.progress_percentage,
          wi.standard_duration_days
        FROM public.project_wbs_items wi
        WHERE wi.id = pb.wbs_item_id
          AND wi.project_id = pb.project_id

        UNION ALL

        SELECT
          child.id,
          child.project_id,
          child.status,
          child.progress_percentage,
          child.standard_duration_days
        FROM public.project_wbs_items child
        INNER JOIN wbs_subtree st
          ON st.id = child.parent_id
         AND st.project_id = child.project_id
      ),
      leaf_nodes AS (
        SELECT st.*
        FROM wbs_subtree st
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.project_wbs_items c
          WHERE c.parent_id = st.id
            AND c.project_id = st.project_id
        )
      )
      SELECT
        COUNT(*)::integer AS leaf_count,
        COALESCE(SUM(
          (CASE
            WHEN LOWER(COALESCE(ln.status, '')) = 'completed' THEN 100::numeric
            ELSE GREATEST(COALESCE(ln.progress_percentage::numeric, 0), 0)
          END)
          * GREATEST(COALESCE(ln.standard_duration_days, 1), 1)::numeric
        ), 0)::numeric AS weighted_actual_sum,
        COALESCE(SUM(GREATEST(COALESCE(ln.standard_duration_days, 1), 1)::numeric), 0)::numeric AS weight_sum
      FROM leaf_nodes ln
    ) wr ON TRUE
  ),
  phase_calc AS (
    SELECT
      pr.id,
      pr.phase_name,
      pr.sort_order,
      pr.start_date,
      pr.end_date,
      pr.phase_weight,
      pr.actual_progress,
      CASE
        WHEN pr.start_date IS NULL OR pr.end_date IS NULL THEN NULL
        WHEN p_as_of_date < pr.start_date THEN 0::numeric
        WHEN p_as_of_date >= pr.end_date THEN 100::numeric
        ELSE LEAST(
          100::numeric,
          GREATEST(
            0::numeric,
            ((p_as_of_date - pr.start_date)::numeric / GREATEST((pr.end_date - pr.start_date)::numeric, 1::numeric)) * 100::numeric
          )
        )
      END AS planned_progress,
      CASE
        WHEN pr.end_date IS NOT NULL
          AND p_as_of_date > pr.end_date
          AND pr.actual_progress < 100
        THEN 1 ELSE 0
      END AS is_overdue,
      CASE
        WHEN pr.end_date IS NOT NULL
          AND p_as_of_date <= pr.end_date
          AND pr.end_date <= (p_as_of_date + 7)
          AND pr.actual_progress < 100
        THEN 1 ELSE 0
      END AS is_due_soon,
      CASE WHEN pr.actual_progress > 0 THEN 1 ELSE 0 END AS is_started,
      CASE WHEN pr.actual_progress >= 100 THEN 1 ELSE 0 END AS is_completed
    FROM phase_rollup pr
  )
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(is_overdue), 0)::integer,
    COALESCE(SUM(is_due_soon), 0)::integer,
    COALESCE(SUM(is_started), 0)::integer,
    COALESCE(SUM(is_completed), 0)::integer,
    COALESCE(SUM(COALESCE(planned_progress, 0) * phase_weight), 0)::numeric,
    COALESCE(SUM(actual_progress * phase_weight), 0)::numeric,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'phase_id', id,
          'phase_name', phase_name,
          'planned', CASE WHEN planned_progress IS NULL THEN NULL ELSE ROUND(planned_progress, 2) END,
          'actual_effective', ROUND(actual_progress, 2),
          'overdue', (is_overdue = 1)
        )
        ORDER BY sort_order NULLS LAST, phase_name
      ),
      '[]'::jsonb
    )
  INTO
    v_phase_count,
    v_overdue_count,
    v_due_soon_count,
    v_started_count,
    v_completed_count,
    v_planned_weight,
    v_actual_weight,
    v_phase_diagnostics
  FROM phase_calc;

  IF v_planned_weight > 0 THEN
    v_spi := v_actual_weight / v_planned_weight;
  END IF;

  IF v_phase_count = 0 THEN
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
      'timezone', v_timezone,
      'as_of_date', p_as_of_date,
      'data_source', v_source,
      'phase_count', v_phase_count,
      'task_count', v_phase_count,
      'overdue_count', v_overdue_count,
      'due_soon_count', v_due_soon_count,
      'started_count', v_started_count,
      'completed_count', v_completed_count,
      'spi', CASE WHEN v_spi IS NULL THEN NULL ELSE ROUND(v_spi, 4) END,
      'phase_diagnostics', v_phase_diagnostics
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_project_schedule_status(
  p_project_id uuid,
  p_as_of_date date DEFAULT public.schedule_status_as_of_date()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.project_schedule_status;
  v_metrics jsonb;
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

CREATE OR REPLACE FUNCTION public.trg_refresh_schedule_status_from_phases_fallback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_project_id uuid;
  v_new_project_id uuid;
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

CREATE OR REPLACE FUNCTION public.trg_refresh_schedule_status_from_wbs_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_project_id uuid;
  v_new_project_id uuid;
BEGIN
  v_old_project_id := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.project_id ELSE NULL END;
  v_new_project_id := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN NEW.project_id ELSE NULL END;

  IF v_old_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.project_phases pp
      WHERE pp.project_id = v_old_project_id
        AND pp.wbs_item_id IS NOT NULL
        AND COALESCE(pp.type, 'schedule') = 'schedule'
    )
  THEN
    PERFORM public.refresh_project_schedule_status(v_old_project_id, public.schedule_status_as_of_date());
  END IF;

  IF v_new_project_id IS NOT NULL
    AND v_new_project_id IS DISTINCT FROM v_old_project_id
    AND EXISTS (
      SELECT 1
      FROM public.project_phases pp
      WHERE pp.project_id = v_new_project_id
        AND pp.wbs_item_id IS NOT NULL
        AND COALESCE(pp.type, 'schedule') = 'schedule'
    )
  THEN
    PERFORM public.refresh_project_schedule_status(v_new_project_id, public.schedule_status_as_of_date());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_schedule_status_from_phases_fallback ON public.project_phases;
CREATE TRIGGER trg_refresh_schedule_status_from_phases_fallback
AFTER INSERT OR UPDATE OF project_id, start_date, end_date, progress_percentage, status, type, wbs_item_id OR DELETE
ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_schedule_status_from_phases_fallback();

DROP TRIGGER IF EXISTS trg_refresh_schedule_status_from_wbs_items ON public.project_wbs_items;
CREATE TRIGGER trg_refresh_schedule_status_from_wbs_items
AFTER INSERT OR UPDATE OF project_id, parent_id, progress_percentage, status, standard_duration_days OR DELETE
ON public.project_wbs_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_schedule_status_from_wbs_items();

CREATE OR REPLACE FUNCTION public.refresh_all_project_schedule_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
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
