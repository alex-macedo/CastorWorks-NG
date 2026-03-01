-- Seed CastorMind-AI next sprint tasks into roadmap_items for sprint 2026-08
-- Source: docs/plans/castormind-ai-next-sprint-2026-08-tasks.md
-- Idempotent: safe to re-run without duplicating tasks for the same sprint

BEGIN;

DO $$
DECLARE
  v_sprint_id uuid;
  v_item_exists boolean;

  has_col_sprint_id boolean;
  has_col_sprint_identifier boolean;
  has_col_code boolean;
  has_col_notes boolean;
  has_col_position boolean;
  has_col_due_date boolean;
  has_col_estimated_effort boolean;
  has_col_created_at boolean;
  has_col_updated_at boolean;
  has_col_created_by boolean;
  has_col_dependencies boolean;

  v_cols text[];
  v_vals text[];
  v_sql text;

  rec record;
BEGIN
  -- Ensure sprint exists
  INSERT INTO public.sprints (
    sprint_identifier,
    year,
    week_number,
    title,
    description,
    start_date,
    end_date,
    status
  )
  SELECT
    '2026-08',
    2026,
    8,
    'CastorMind-AI Next Sprint 2026-08',
    'Analytics dashboard, prompt templates, role-based tool permissions, and retry/queueing for failed tool calls.',
    DATE '2026-02-23',
    DATE '2026-03-03',
    'open'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.sprints s
    WHERE s.sprint_identifier = '2026-08'
  );

  SELECT s.id
  INTO v_sprint_id
  FROM public.sprints s
  WHERE s.sprint_identifier = '2026-08'
  ORDER BY s.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve sprint id for sprint_identifier=2026-08';
  END IF;

  -- Column preflight for schema drift tolerance
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'sprint_id'
  ) INTO has_col_sprint_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'sprint_identifier'
  ) INTO has_col_sprint_identifier;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'code'
  ) INTO has_col_code;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'notes'
  ) INTO has_col_notes;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'position'
  ) INTO has_col_position;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'due_date'
  ) INTO has_col_due_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'estimated_effort'
  ) INTO has_col_estimated_effort;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'created_at'
  ) INTO has_col_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'updated_at'
  ) INTO has_col_updated_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'created_by'
  ) INTO has_col_created_by;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'dependencies'
  ) INTO has_col_dependencies;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('CM-2026-08-01','Define analytics KPI model','Define metrics/dimensions for bot usage, success rate, tool latency, error rate, guardrail blocks, and mutation volume.','refinement','high','backlog','medium',DATE '2026-02-23',DATE '2026-02-23','2026-08',1),
        ('CM-2026-08-02','Add analytics event schema','Add/extend DB schema for bot analytics events and rollup fields (tool, intent, role, status, duration, trace_id).','integration','high','backlog','medium',DATE '2026-02-23',DATE '2026-02-24','2026-08',2),
        ('CM-2026-08-03','Emit analytics from super-bot-assistant','Emit structured analytics events per request, tool call, error, guardrail, and mutation completion.','feature','high','backlog','medium',DATE '2026-02-24',DATE '2026-02-24','2026-08',3),
        ('CM-2026-08-04','Build analytics API queries','Implement typed server queries/aggregations for dashboard cards, trend charts, and tool drill-down.','feature','high','backlog','medium',DATE '2026-02-24',DATE '2026-02-25','2026-08',4),
        ('CM-2026-08-05','CastorMind analytics dashboard UI','Create dashboard page with KPIs, filters (date/role/tool/status), and chart/table visualizations.','feature','high','backlog','large',DATE '2026-02-25',DATE '2026-02-26','2026-08',5),
        ('CM-2026-08-06','Prompt template schema','Define template schema: key, title, locale, intent target, variables, safety hints, and role visibility.','refinement','medium','backlog','small',DATE '2026-02-26',DATE '2026-02-26','2026-08',6),
        ('CM-2026-08-07','Prompt template storage + CRUD','Implement DB-backed prompt template CRUD with validation/versioning and i18n-aware content fields.','integration','high','backlog','medium',DATE '2026-02-26',DATE '2026-02-27','2026-08',7),
        ('CM-2026-08-08','Prompt template picker in chat','Add template picker and variable interpolation flow in CastorMind-AI page composer.','feature','high','backlog','medium',DATE '2026-02-27',DATE '2026-02-27','2026-08',8),
        ('CM-2026-08-09','Enforce role-based tool permissions','Add permission matrix mapping roles -> allowed intents/tools with deny-by-default behavior.','integration','high','backlog','medium',DATE '2026-02-27',DATE '2026-02-28','2026-08',9),
        ('CM-2026-08-10','Permission-aware UX responses','Return explicit, localized "not authorized" assistant messages and audit logs when blocked by role policy.','refinement','high','backlog','small',DATE '2026-02-28',DATE '2026-02-28','2026-08',10),
        ('CM-2026-08-11','Retry queue schema + worker contract','Define queue table and worker contract for failed tool calls (attempts, backoff, next_run_at, last_error).','refinement','high','backlog','medium',DATE '2026-02-28',DATE '2026-03-01','2026-08',11),
        ('CM-2026-08-12','Queue failed tool calls','Enqueue eligible failed tool calls with idempotency key and deterministic payload snapshot.','feature','high','backlog','medium',DATE '2026-03-01',DATE '2026-03-01','2026-08',12),
        ('CM-2026-08-13','Retry worker execution','Implement worker/cron to process queued jobs with exponential backoff and terminal-failure handling.','feature','urgent','backlog','large',DATE '2026-03-01',DATE '2026-03-02','2026-08',13),
        ('CM-2026-08-14','Queue observability in Log Search','Add queue lifecycle logs (enqueued, retrying, succeeded, exhausted) tied to trace_id and request_id.','integration','high','backlog','small',DATE '2026-03-02',DATE '2026-03-02','2026-08',14),
        ('CM-2026-08-15','E2E + policy + retry tests','Add tests for role restrictions, template execution, queue retries, and analytics visibility.','feature','high','backlog','large',DATE '2026-03-02',DATE '2026-03-03','2026-08',15),
        ('CM-2026-08-16','Release readiness + runbook','Document operations runbook, retry controls, dashboard interpretation, and rollback steps.','refinement','medium','backlog','small',DATE '2026-03-03',DATE '2026-03-03','2026-08',16)
    ) AS t(
      code,
      title,
      description,
      category,
      priority,
      status,
      estimated_effort,
      start_date,
      end_date,
      sprint_identifier,
      position
    )
  LOOP
    -- Idempotency by sprint + title (or sprint_identifier + title if legacy schema)
    IF has_col_sprint_id THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.roadmap_items r
        WHERE r.sprint_id = v_sprint_id
          AND r.title = rec.title
      ) INTO v_item_exists;
    ELSIF has_col_sprint_identifier THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.roadmap_items r
        WHERE r.sprint_identifier = rec.sprint_identifier
          AND r.title = rec.title
      ) INTO v_item_exists;
    ELSE
      RAISE EXCEPTION 'roadmap_items has neither sprint_id nor sprint_identifier columns';
    END IF;

    IF v_item_exists THEN
      CONTINUE;
    END IF;

    v_cols := ARRAY['title', 'description', 'status', 'priority', 'category'];
    v_vals := ARRAY[
      format('%L', rec.title),
      format('%L', rec.description),
      format('%L', rec.status),
      format('%L', rec.priority),
      format('%L', rec.category)
    ];

    IF has_col_sprint_id THEN
      v_cols := array_append(v_cols, 'sprint_id');
      v_vals := array_append(v_vals, format('%L', v_sprint_id::text) || '::uuid');
    ELSIF has_col_sprint_identifier THEN
      v_cols := array_append(v_cols, 'sprint_identifier');
      v_vals := array_append(v_vals, format('%L', rec.sprint_identifier));
    END IF;

    IF has_col_code THEN
      v_cols := array_append(v_cols, 'code');
      v_vals := array_append(v_vals, format('%L', rec.code));
    END IF;

    IF has_col_due_date THEN
      v_cols := array_append(v_cols, 'due_date');
      v_vals := array_append(v_vals, format('%L', rec.end_date));
    END IF;

    IF has_col_estimated_effort THEN
      v_cols := array_append(v_cols, 'estimated_effort');
      v_vals := array_append(v_vals, format('%L', rec.estimated_effort));
    END IF;

    IF has_col_notes THEN
      v_cols := array_append(v_cols, 'notes');
      v_vals := array_append(v_vals, format('%L', 'Seeded from sprint plan task code ' || rec.code));
    END IF;

    IF has_col_position THEN
      v_cols := array_append(v_cols, 'position');
      v_vals := array_append(v_vals, format('%s', rec.position));
    END IF;

    IF has_col_dependencies THEN
      v_cols := array_append(v_cols, 'dependencies');
      v_vals := array_append(v_vals, 'NULL');
    END IF;

    IF has_col_created_by THEN
      v_cols := array_append(v_cols, 'created_by');
      v_vals := array_append(v_vals, 'NULL');
    END IF;

    IF has_col_created_at THEN
      v_cols := array_append(v_cols, 'created_at');
      v_vals := array_append(v_vals, 'NOW()');
    END IF;

    IF has_col_updated_at THEN
      v_cols := array_append(v_cols, 'updated_at');
      v_vals := array_append(v_vals, 'NOW()');
    END IF;

    v_sql := format(
      'INSERT INTO public.roadmap_items (%s) VALUES (%s)',
      array_to_string(v_cols, ', '),
      array_to_string(v_vals, ', ')
    );

    EXECUTE v_sql;
  END LOOP;
END
$$;

-- Verification snapshot
SELECT
  s.sprint_identifier,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE r.status = 'backlog') AS backlog_items
FROM public.roadmap_items r
JOIN public.sprints s ON s.id = r.sprint_id
WHERE s.sprint_identifier = '2026-08'
GROUP BY s.sprint_identifier;

COMMIT;
