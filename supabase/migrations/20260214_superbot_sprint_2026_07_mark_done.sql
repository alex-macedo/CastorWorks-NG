-- Super Bot Sprint 2026-07 status transition
-- Move roadmap_items from backlog -> done for sprint 2026-07

BEGIN;

DO $$
DECLARE
  v_sprint_identifier CONSTANT TEXT := '2026-07';

  v_has_sprints BOOLEAN;
  v_has_roadmap BOOLEAN;

  v_has_sprint_identifier BOOLEAN;
  v_has_sprint_id BOOLEAN;
  v_has_status BOOLEAN;
  v_has_completed_at BOOLEAN;
  v_has_completion_date BOOLEAN;
  v_has_updated_at BOOLEAN;
  v_has_code BOOLEAN;

  v_sprint_id UUID := NULL;

  v_status_udt TEXT;
  v_status_is_enum BOOLEAN := FALSE;
  v_enum_has_backlog BOOLEAN := FALSE;
  v_enum_has_done BOOLEAN := FALSE;

  v_sql TEXT;
  v_where_scope TEXT;
  v_set_clause TEXT := 'status = ''done''';
  v_rows_updated INTEGER := 0;

  v_total_expected INTEGER := 12;
  v_total_in_sprint INTEGER := 0;
  v_done_in_sprint INTEGER := 0;
  v_backlog_remaining INTEGER := 0;
BEGIN
  SELECT to_regclass('public.sprints') IS NOT NULL INTO v_has_sprints;
  SELECT to_regclass('public.roadmap_items') IS NOT NULL INTO v_has_roadmap;

  IF NOT v_has_sprints OR NOT v_has_roadmap THEN
    RAISE EXCEPTION 'Required tables missing: sprints=%, roadmap_items=%', v_has_sprints, v_has_roadmap;
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_identifier') INTO v_has_sprint_identifier;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_id') INTO v_has_sprint_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='status') INTO v_has_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='completed_at') INTO v_has_completed_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='completion_date') INTO v_has_completion_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='updated_at') INTO v_has_updated_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='code') INTO v_has_code;

  IF NOT v_has_status THEN
    RAISE EXCEPTION 'roadmap_items.status column missing';
  END IF;

  IF NOT v_has_sprint_identifier AND NOT v_has_sprint_id THEN
    RAISE EXCEPTION 'roadmap_items must have sprint_identifier or sprint_id';
  END IF;

  -- Resolve sprint id for sprint_id variant
  BEGIN
    EXECUTE format('SELECT id FROM public.sprints WHERE sprint_identifier = %L LIMIT 1', v_sprint_identifier)
      INTO v_sprint_id;
  EXCEPTION WHEN OTHERS THEN
    v_sprint_id := NULL;
  END;

  IF v_has_sprint_id AND v_sprint_id IS NULL THEN
    BEGIN
      EXECUTE format('SELECT id FROM public.sprints WHERE code = %L LIMIT 1', v_sprint_identifier)
        INTO v_sprint_id;
    EXCEPTION WHEN OTHERS THEN
      v_sprint_id := NULL;
    END;
  END IF;

  IF v_has_sprint_id AND v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve sprint id for %', v_sprint_identifier;
  END IF;

  -- Preflight status compatibility (enum only)
  SELECT c.udt_name
    INTO v_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'roadmap_items'
    AND c.column_name = 'status';

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = v_status_udt AND t.typtype = 'e'
  ) INTO v_status_is_enum;

  IF v_status_is_enum THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = v_status_udt AND e.enumlabel = 'backlog'
    ) INTO v_enum_has_backlog;

    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = v_status_udt AND e.enumlabel = 'done'
    ) INTO v_enum_has_done;

    IF NOT v_enum_has_backlog OR NOT v_enum_has_done THEN
      RAISE EXCEPTION 'roadmap_items.status enum % does not support backlog/done', v_status_udt;
    END IF;
  END IF;

  IF v_has_completed_at THEN
    v_set_clause := v_set_clause || ', completed_at = NOW()';
  ELSIF v_has_completion_date THEN
    v_set_clause := v_set_clause || ', completion_date = NOW()';
  END IF;

  IF v_has_updated_at THEN
    v_set_clause := v_set_clause || ', updated_at = NOW()';
  END IF;

  IF v_has_sprint_identifier THEN
    v_where_scope := format('sprint_identifier = %L', v_sprint_identifier);
  ELSE
    v_where_scope := format('sprint_id = %L::uuid', v_sprint_id::TEXT);
  END IF;

  v_sql := format(
    'UPDATE public.roadmap_items SET %s WHERE %s AND status = %L',
    v_set_clause,
    v_where_scope,
    'backlog'
  );

  EXECUTE v_sql;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Count totals
  EXECUTE format('SELECT COUNT(*) FROM public.roadmap_items WHERE %s', v_where_scope)
    INTO v_total_in_sprint;

  EXECUTE format('SELECT COUNT(*) FROM public.roadmap_items WHERE %s AND status = %L', v_where_scope, 'done')
    INTO v_done_in_sprint;

  EXECUTE format('SELECT COUNT(*) FROM public.roadmap_items WHERE %s AND status = %L', v_where_scope, 'backlog')
    INTO v_backlog_remaining;

  RAISE NOTICE 'Sprint % update: rows updated %', v_sprint_identifier, v_rows_updated;
  RAISE NOTICE 'Expected tasks: %, total in sprint: %, done: %, backlog remaining: %',
    v_total_expected, v_total_in_sprint, v_done_in_sprint, v_backlog_remaining;

  -- Verification by expected task list (code/title)
  CREATE TEMP TABLE IF NOT EXISTS tmp_superbot_expected_tasks (
    code TEXT,
    title TEXT
  ) ON COMMIT DROP;

  TRUNCATE TABLE tmp_superbot_expected_tasks;

  INSERT INTO tmp_superbot_expected_tasks (code, title) VALUES
    ('SB-2026-07-01','Super Bot sidebar entry'),
    ('SB-2026-07-02','Super Bot widget UI'),
    ('SB-2026-07-03','Super Bot assistant hook'),
    ('SB-2026-07-04','Edge function scaffold'),
    ('SB-2026-07-05','Tool: delayed projects with tasks'),
    ('SB-2026-07-06','Tool: clients with due payments'),
    ('SB-2026-07-07','Tool: update project tasks until today'),
    ('SB-2026-07-08','Tool: quotes without vendor proposal'),
    ('SB-2026-07-09','Guardrails for bulk mutation'),
    ('SB-2026-07-10','LogSearch integration logging'),
    ('SB-2026-07-11','i18n coverage for Super Bot'),
    ('SB-2026-07-12','Verification and E2E');

  IF v_has_code THEN
    EXECUTE format($q$
      SELECT COUNT(*)
      FROM tmp_superbot_expected_tasks e
      JOIN public.roadmap_items ri
        ON ri.code = e.code
      WHERE %s
    $q$, v_where_scope)
    INTO v_total_expected;
  ELSE
    EXECUTE format($q$
      SELECT COUNT(*)
      FROM tmp_superbot_expected_tasks e
      JOIN public.roadmap_items ri
        ON ri.title = e.title
      WHERE %s
    $q$, v_where_scope)
    INTO v_total_expected;
  END IF;

  RAISE NOTICE 'Matched expected tasks in sprint %: % / 12', v_sprint_identifier, v_total_expected;
END $$;

-- Final verification resultset
DO $$
DECLARE
  v_has_code BOOLEAN;
  v_has_sprint_identifier BOOLEAN;
  v_has_sprint_id BOOLEAN;
  v_sprint_id UUID;
  v_scope TEXT;
  v_sql TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='code') INTO v_has_code;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_identifier') INTO v_has_sprint_identifier;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_id') INTO v_has_sprint_id;

  IF v_has_sprint_identifier THEN
    v_scope := 'ri.sprint_identifier = ''2026-07''';
  ELSE
    BEGIN
      EXECUTE 'SELECT id FROM public.sprints WHERE sprint_identifier = ''2026-07'' LIMIT 1' INTO v_sprint_id;
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'SELECT id FROM public.sprints WHERE code = ''2026-07'' LIMIT 1' INTO v_sprint_id;
    END;
    v_scope := format('ri.sprint_id = %L::uuid', v_sprint_id::TEXT);
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_superbot_expected_tasks (
    code TEXT,
    title TEXT
  ) ON COMMIT DROP;

  TRUNCATE TABLE tmp_superbot_expected_tasks;

  INSERT INTO tmp_superbot_expected_tasks (code, title) VALUES
    ('SB-2026-07-01','Super Bot sidebar entry'),
    ('SB-2026-07-02','Super Bot widget UI'),
    ('SB-2026-07-03','Super Bot assistant hook'),
    ('SB-2026-07-04','Edge function scaffold'),
    ('SB-2026-07-05','Tool: delayed projects with tasks'),
    ('SB-2026-07-06','Tool: clients with due payments'),
    ('SB-2026-07-07','Tool: update project tasks until today'),
    ('SB-2026-07-08','Tool: quotes without vendor proposal'),
    ('SB-2026-07-09','Guardrails for bulk mutation'),
    ('SB-2026-07-10','LogSearch integration logging'),
    ('SB-2026-07-11','i18n coverage for Super Bot'),
    ('SB-2026-07-12','Verification and E2E');

  IF v_has_code THEN
    v_sql := format($q$
      WITH matched AS (
        SELECT e.code, e.title, ri.status
        FROM tmp_superbot_expected_tasks e
        LEFT JOIN public.roadmap_items ri
          ON ri.code = e.code
         AND %s
      )
      SELECT code, title, status, CASE WHEN status IS NULL THEN 'missing' ELSE 'present' END AS presence
      FROM matched
      ORDER BY code
    $q$, v_scope);
  ELSE
    v_sql := format($q$
      WITH matched AS (
        SELECT e.code, e.title, ri.status
        FROM tmp_superbot_expected_tasks e
        LEFT JOIN public.roadmap_items ri
          ON ri.title = e.title
         AND %s
      )
      SELECT code, title, status, CASE WHEN status IS NULL THEN 'missing' ELSE 'present' END AS presence
      FROM matched
      ORDER BY code
    $q$, v_scope);
  END IF;

  EXECUTE v_sql;
END $$;

COMMIT;
