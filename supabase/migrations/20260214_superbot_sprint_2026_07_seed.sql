-- Super Bot Sprint 2026-07 Seed
-- Creates sprint 2026-07 and inserts deterministic roadmap_items from
-- docs/plans/castorworks-AI-Chat-Assistant-NL-Data-Tasks.md

BEGIN;

DO $$
DECLARE
  v_sprint_identifier CONSTANT TEXT := '2026-07';
  v_sprint_title CONSTANT TEXT := 'Sprint 2026-07: Super Bot NL Data Automation';
  v_sprint_description CONSTANT TEXT := 'Super Bot NL assistant scope for backend query/mutation automation with LogSearch logging.';
  v_start_date CONSTANT DATE := DATE '2026-02-16';
  v_end_date CONSTANT DATE := DATE '2026-02-22';

  v_has_sprints BOOLEAN;
  v_sprints_has_identifier BOOLEAN;
  v_sprints_has_code BOOLEAN;
  v_sprints_has_year BOOLEAN;
  v_sprints_has_week BOOLEAN;
  v_sprints_has_title BOOLEAN;
  v_sprints_has_description BOOLEAN;
  v_sprints_has_start_date BOOLEAN;
  v_sprints_has_end_date BOOLEAN;
  v_sprints_has_status BOOLEAN;

  v_has_roadmap BOOLEAN;
  v_has_code BOOLEAN;
  v_has_title BOOLEAN;
  v_has_description BOOLEAN;
  v_has_category BOOLEAN;
  v_has_priority BOOLEAN;
  v_has_status BOOLEAN;
  v_has_estimated_effort BOOLEAN;
  v_has_start_date BOOLEAN;
  v_has_end_date BOOLEAN;
  v_has_sprint_identifier BOOLEAN;
  v_has_sprint_id BOOLEAN;
  v_has_type BOOLEAN;
  v_has_created_by BOOLEAN;
  v_has_notes BOOLEAN;
  v_has_position BOOLEAN;
  v_has_updated_at BOOLEAN;

  v_created_by_nullable BOOLEAN := TRUE;
  v_created_by UUID := NULL;

  v_sprint_id UUID := NULL;

  v_status_udt TEXT;
  v_status_is_enum BOOLEAN := FALSE;
  v_enum_has_backlog BOOLEAN := FALSE;
  v_enum_has_done BOOLEAN := FALSE;

  v_priority_udt TEXT;
  v_priority_is_enum BOOLEAN := FALSE;
  v_priority_has_critical BOOLEAN := FALSE;
  v_priority_has_urgent BOOLEAN := FALSE;
  v_priority_value TEXT;

  v_effort_data_type TEXT;
  v_effort_udt TEXT;
  v_effort_is_enum BOOLEAN := FALSE;
  v_effort_is_integer BOOLEAN := FALSE;

  v_tasks JSONB := '[]'::JSONB;
  v_task JSONB;
  v_inserted INTEGER := 0;
  v_skipped INTEGER := 0;

  v_exists BOOLEAN;
  v_sql TEXT;
  v_columns TEXT;
  v_values TEXT;

  v_idx INTEGER := 0;
BEGIN
  SELECT to_regclass('public.sprints') IS NOT NULL INTO v_has_sprints;
  SELECT to_regclass('public.roadmap_items') IS NOT NULL INTO v_has_roadmap;

  IF NOT v_has_sprints THEN
    RAISE EXCEPTION 'Table public.sprints does not exist';
  END IF;
  IF NOT v_has_roadmap THEN
    RAISE EXCEPTION 'Table public.roadmap_items does not exist';
  END IF;

  -- Discover sprints columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'sprint_identifier'
  ) INTO v_sprints_has_identifier;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'code'
  ) INTO v_sprints_has_code;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'year'
  ) INTO v_sprints_has_year;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'week_number'
  ) INTO v_sprints_has_week;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'title'
  ) INTO v_sprints_has_title;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'description'
  ) INTO v_sprints_has_description;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'start_date'
  ) INTO v_sprints_has_start_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'end_date'
  ) INTO v_sprints_has_end_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sprints' AND column_name = 'status'
  ) INTO v_sprints_has_status;

  IF NOT v_sprints_has_identifier AND NOT v_sprints_has_code THEN
    RAISE EXCEPTION 'Neither sprints.sprint_identifier nor sprints.code exists';
  END IF;

  -- Upsert sprint
  IF v_sprints_has_identifier THEN
    v_sql := 'INSERT INTO public.sprints (sprint_identifier';
    v_values := format('%L', v_sprint_identifier);

    IF v_sprints_has_year THEN
      v_sql := v_sql || ', year';
      v_values := v_values || ', 2026';
    END IF;
    IF v_sprints_has_week THEN
      v_sql := v_sql || ', week_number';
      v_values := v_values || ', 7';
    END IF;
    IF v_sprints_has_title THEN
      v_sql := v_sql || ', title';
      v_values := v_values || ', ' || quote_literal(v_sprint_title);
    END IF;
    IF v_sprints_has_description THEN
      v_sql := v_sql || ', description';
      v_values := v_values || ', ' || quote_literal(v_sprint_description);
    END IF;
    IF v_sprints_has_start_date THEN
      v_sql := v_sql || ', start_date';
      v_values := v_values || ', ' || quote_literal(v_start_date::TEXT);
    END IF;
    IF v_sprints_has_end_date THEN
      v_sql := v_sql || ', end_date';
      v_values := v_values || ', ' || quote_literal(v_end_date::TEXT);
    END IF;
    IF v_sprints_has_status THEN
      v_sql := v_sql || ', status';
      v_values := v_values || ', ''open''';
    END IF;

    v_sql := v_sql || ') VALUES (' || v_values || ') ON CONFLICT (sprint_identifier) DO NOTHING';
    EXECUTE v_sql;

    EXECUTE format('SELECT id FROM public.sprints WHERE sprint_identifier = %L LIMIT 1', v_sprint_identifier)
      INTO v_sprint_id;
  ELSE
    v_sql := 'INSERT INTO public.sprints (code';
    v_values := format('%L', v_sprint_identifier);

    IF v_sprints_has_title THEN
      v_sql := v_sql || ', title';
      v_values := v_values || ', ' || quote_literal(v_sprint_title);
    END IF;
    IF v_sprints_has_description THEN
      v_sql := v_sql || ', description';
      v_values := v_values || ', ' || quote_literal(v_sprint_description);
    END IF;
    IF v_sprints_has_start_date THEN
      v_sql := v_sql || ', start_date';
      v_values := v_values || ', ' || quote_literal(v_start_date::TEXT);
    END IF;
    IF v_sprints_has_end_date THEN
      v_sql := v_sql || ', end_date';
      v_values := v_values || ', ' || quote_literal(v_end_date::TEXT);
    END IF;
    IF v_sprints_has_status THEN
      v_sql := v_sql || ', status';
      v_values := v_values || ', ''active''';
    END IF;

    v_sql := v_sql || ') VALUES (' || v_values || ') ON CONFLICT (code) DO NOTHING';
    EXECUTE v_sql;

    EXECUTE format('SELECT id FROM public.sprints WHERE code = %L LIMIT 1', v_sprint_identifier)
      INTO v_sprint_id;
  END IF;

  -- Discover roadmap_items columns
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'code') INTO v_has_code;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'title') INTO v_has_title;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'description') INTO v_has_description;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'category') INTO v_has_category;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'priority') INTO v_has_priority;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'status') INTO v_has_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'estimated_effort') INTO v_has_estimated_effort;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'start_date') INTO v_has_start_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'end_date') INTO v_has_end_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'sprint_identifier') INTO v_has_sprint_identifier;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'sprint_id') INTO v_has_sprint_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'type') INTO v_has_type;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'created_by') INTO v_has_created_by;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'notes') INTO v_has_notes;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'position') INTO v_has_position;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'updated_at') INTO v_has_updated_at;

  IF NOT v_has_title THEN
    RAISE EXCEPTION 'roadmap_items.title column is required but missing';
  END IF;

  IF NOT v_has_sprint_identifier AND NOT v_has_sprint_id THEN
    RAISE EXCEPTION 'roadmap_items must have sprint_identifier or sprint_id';
  END IF;

  -- Status compatibility check (enum only)
  IF v_has_status THEN
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
  END IF;

  -- Priority compatibility check (enum only)
  IF v_has_priority THEN
    SELECT c.udt_name
      INTO v_priority_udt
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'roadmap_items'
      AND c.column_name = 'priority';

    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = v_priority_udt AND t.typtype = 'e'
    ) INTO v_priority_is_enum;

    IF v_priority_is_enum THEN
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public' AND t.typname = v_priority_udt AND e.enumlabel = 'critical'
      ) INTO v_priority_has_critical;

      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public' AND t.typname = v_priority_udt AND e.enumlabel = 'urgent'
      ) INTO v_priority_has_urgent;
    END IF;
  END IF;

  -- Determine estimated_effort typing
  IF v_has_estimated_effort THEN
    SELECT c.data_type, c.udt_name
      INTO v_effort_data_type, v_effort_udt
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'roadmap_items'
      AND c.column_name = 'estimated_effort';

    v_effort_is_integer := v_effort_data_type IN ('integer', 'bigint', 'smallint', 'numeric');

    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = v_effort_udt AND t.typtype = 'e'
    ) INTO v_effort_is_enum;
  END IF;

  -- created_by handling
  IF v_has_created_by THEN
    SELECT (c.is_nullable = 'YES')
      INTO v_created_by_nullable
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'roadmap_items'
      AND c.column_name = 'created_by';

    IF to_regclass('public.user_roles') IS NOT NULL THEN
      BEGIN
        SELECT ur.user_id
        INTO v_created_by
        FROM public.user_roles ur
        WHERE ur.role::text = 'admin'
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        v_created_by := NULL;
      END;
    END IF;

    IF v_created_by IS NULL THEN
      BEGIN
        SELECT u.id INTO v_created_by
        FROM auth.users u
        ORDER BY u.created_at NULLS LAST
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        v_created_by := NULL;
      END;
    END IF;

    IF v_created_by IS NULL AND NOT v_created_by_nullable THEN
      RAISE EXCEPTION 'roadmap_items.created_by is NOT NULL and no auth.users row could be resolved';
    END IF;
  END IF;

  -- Canonical tasks from docs/plans/castorworks-AI-Chat-Assistant-NL-Data-Tasks.md
  v_tasks := jsonb_build_array(
    jsonb_build_object('code','SB-2026-07-01','title','Super Bot sidebar entry','description','Add a dedicated Super Bot menu option in web sidebar while preserving existing AI Assistant entry.','category','feature','priority','high','status','backlog','estimated_effort','medium','start_date','2026-02-16','end_date','2026-02-16','type','task'),
    jsonb_build_object('code','SB-2026-07-02','title','Super Bot widget UI','description','Create dedicated Super Bot chat panel and interaction flow for NL query/mutation requests.','category','feature','priority','high','status','backlog','estimated_effort','large','start_date','2026-02-16','end_date','2026-02-17','type','task'),
    jsonb_build_object('code','SB-2026-07-03','title','Super Bot assistant hook','description','Implement frontend hook to call /functions/v1/super-bot-assistant with structured payload and response handling.','category','integration','priority','high','status','backlog','estimated_effort','medium','start_date','2026-02-16','end_date','2026-02-17','type','task'),
    jsonb_build_object('code','SB-2026-07-04','title','Edge function scaffold','description','Create super-bot-assistant edge function with request validation, routing, and trace id propagation.','category','integration','priority','high','status','backlog','estimated_effort','large','start_date','2026-02-17','end_date','2026-02-18','type','task'),
    jsonb_build_object('code','SB-2026-07-05','title','Tool: delayed projects with tasks','description','Implement server tool to return delayed projects and overdue incomplete tasks with project-scoped access checks.','category','feature','priority','high','status','backlog','estimated_effort','medium','start_date','2026-02-18','end_date','2026-02-18','type','task'),
    jsonb_build_object('code','SB-2026-07-06','title','Tool: clients with due payments','description','Implement server tool to unify due/open/overdue invoices from AR and legacy invoice sources.','category','feature','priority','high','status','backlog','estimated_effort','medium','start_date','2026-02-18','end_date','2026-02-19','type','task'),
    jsonb_build_object('code','SB-2026-07-07','title','Tool: update project tasks until today','description','Implement mutation tool for project schedule tasks up to today with scoped updates and output summary.','category','feature','priority','critical','status','backlog','estimated_effort','large','start_date','2026-02-19','end_date','2026-02-20','type','task'),
    jsonb_build_object('code','SB-2026-07-08','title','Tool: quotes without vendor proposal','description','Implement server tool for overdue quote requests pending vendor proposal return.','category','feature','priority','medium','status','backlog','estimated_effort','medium','start_date','2026-02-19','end_date','2026-02-20','type','task'),
    jsonb_build_object('code','SB-2026-07-09','title','Guardrails for bulk mutation','description','Enforce cap at 100 affected records with explicit override phrase requirement for larger changes.','category','refinement','priority','critical','status','backlog','estimated_effort','medium','start_date','2026-02-20','end_date','2026-02-20','type','task'),
    jsonb_build_object('code','SB-2026-07-10','title','LogSearch integration logging','description','Log all intents, tool calls, mutations, guardrails, and errors into log_messages via log_message RPC.','category','integration','priority','critical','status','backlog','estimated_effort','medium','start_date','2026-02-20','end_date','2026-02-21','type','task'),
    jsonb_build_object('code','SB-2026-07-11','title','i18n coverage for Super Bot','description','Add all required localization keys for en-US, pt-BR, es-ES, fr-FR for Super Bot UX and messaging.','category','refinement','priority','medium','status','backlog','estimated_effort','small','start_date','2026-02-21','end_date','2026-02-21','type','task'),
    jsonb_build_object('code','SB-2026-07-12','title','Verification and E2E','description','Add unit/integration/e2e coverage and validate logs appear in Log Search after tool operations.','category','feature','priority','high','status','backlog','estimated_effort','large','start_date','2026-02-21','end_date','2026-02-22','type','task')
  );

  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
  LOOP
    v_idx := v_idx + 1;

    IF v_has_code THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.roadmap_items WHERE code = %L)', v_task->>'code')
        INTO v_exists;
    ELSIF v_has_sprint_identifier THEN
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.roadmap_items WHERE title = %L AND sprint_identifier = %L)',
        v_task->>'title', v_sprint_identifier
      ) INTO v_exists;
    ELSE
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.roadmap_items WHERE title = %L AND sprint_id = %L::uuid)',
        v_task->>'title', v_sprint_id::TEXT
      ) INTO v_exists;
    END IF;

    IF v_exists THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_columns := 'title';
    v_values := quote_literal(v_task->>'title');

    IF v_has_code THEN
      v_columns := v_columns || ', code';
      v_values := v_values || ', ' || quote_literal(v_task->>'code');
    END IF;

    IF v_has_description THEN
      v_columns := v_columns || ', description';
      v_values := v_values || ', ' || quote_literal(v_task->>'description');
    END IF;

    IF v_has_category THEN
      v_columns := v_columns || ', category';
      v_values := v_values || ', ' || quote_literal(v_task->>'category');
    END IF;

    IF v_has_priority THEN
      v_priority_value := v_task->>'priority';
      IF v_priority_value = 'critical' AND v_priority_is_enum AND NOT v_priority_has_critical AND v_priority_has_urgent THEN
        v_priority_value := 'urgent';
      END IF;
      v_columns := v_columns || ', priority';
      v_values := v_values || ', ' || quote_literal(v_priority_value);
    END IF;

    IF v_has_status THEN
      v_columns := v_columns || ', status';
      v_values := v_values || ', ' || quote_literal(v_task->>'status');
    END IF;

    IF v_has_estimated_effort THEN
      v_columns := v_columns || ', estimated_effort';
      IF v_effort_is_integer THEN
        v_values := v_values || ', ' || CASE v_task->>'estimated_effort'
          WHEN 'small' THEN '2'
          WHEN 'medium' THEN '4'
          WHEN 'large' THEN '8'
          WHEN 'xlarge' THEN '13'
          ELSE '4'
        END;
      ELSE
        v_values := v_values || ', ' || quote_literal(v_task->>'estimated_effort');
      END IF;
    END IF;

    IF v_has_start_date THEN
      v_columns := v_columns || ', start_date';
      v_values := v_values || ', ' || quote_literal(v_task->>'start_date');
    END IF;

    IF v_has_end_date THEN
      v_columns := v_columns || ', end_date';
      v_values := v_values || ', ' || quote_literal(v_task->>'end_date');
    END IF;

    IF v_has_sprint_identifier THEN
      v_columns := v_columns || ', sprint_identifier';
      v_values := v_values || ', ' || quote_literal(v_sprint_identifier);
    ELSIF v_has_sprint_id THEN
      v_columns := v_columns || ', sprint_id';
      v_values := v_values || ', ' || quote_literal(v_sprint_id::TEXT) || '::uuid';
    END IF;

    IF v_has_type THEN
      v_columns := v_columns || ', type';
      v_values := v_values || ', ' || quote_literal(COALESCE(v_task->>'type', 'task'));
    END IF;

    IF v_has_notes THEN
      v_columns := v_columns || ', notes';
      v_values := v_values || ', ' || quote_literal('Seeded from docs/plans/castorworks-AI-Chat-Assistant-NL-Data-Tasks.md');
    END IF;

    IF v_has_position THEN
      v_columns := v_columns || ', position';
      v_values := v_values || ', ' || (v_idx - 1)::TEXT;
    END IF;

    IF v_has_created_by AND v_created_by IS NOT NULL THEN
      v_columns := v_columns || ', created_by';
      v_values := v_values || ', ' || quote_literal(v_created_by::TEXT) || '::uuid';
    END IF;

    IF v_has_updated_at THEN
      v_columns := v_columns || ', updated_at';
      v_values := v_values || ', NOW()';
    END IF;

    v_sql := format('INSERT INTO public.roadmap_items (%s) VALUES (%s)', v_columns, v_values);
    EXECUTE v_sql;

    v_inserted := v_inserted + 1;
  END LOOP;

  RAISE NOTICE 'Seed complete for %: inserted %, skipped %', v_sprint_identifier, v_inserted, v_skipped;
END $$;

-- Verification summary for seed (dynamic to support schema variants)
DO $$
DECLARE
  v_has_code BOOLEAN;
  v_has_sprint_identifier BOOLEAN;
  v_has_sprint_id BOOLEAN;
  v_sprint_id UUID;
  v_scope TEXT;
  v_total_in_sprint INTEGER;
  v_matched_expected INTEGER;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='code') INTO v_has_code;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_identifier') INTO v_has_sprint_identifier;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roadmap_items' AND column_name='sprint_id') INTO v_has_sprint_id;

  IF v_has_sprint_identifier THEN
    v_scope := 'ri.sprint_identifier = ''2026-07''';
  ELSIF v_has_sprint_id THEN
    BEGIN
      EXECUTE 'SELECT id FROM public.sprints WHERE sprint_identifier = ''2026-07'' LIMIT 1' INTO v_sprint_id;
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'SELECT id FROM public.sprints WHERE code = ''2026-07'' LIMIT 1' INTO v_sprint_id;
    END;
    v_scope := format('ri.sprint_id = %L::uuid', v_sprint_id::TEXT);
  ELSE
    RAISE EXCEPTION 'roadmap_items has neither sprint_identifier nor sprint_id';
  END IF;

  EXECUTE format('SELECT COUNT(*) FROM public.roadmap_items ri WHERE %s', v_scope) INTO v_total_in_sprint;

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
    $q$, v_scope)
    INTO v_matched_expected;
  ELSE
    EXECUTE format($q$
      SELECT COUNT(*)
      FROM tmp_superbot_expected_tasks e
      JOIN public.roadmap_items ri
        ON ri.title = e.title
      WHERE %s
    $q$, v_scope)
    INTO v_matched_expected;
  END IF;

  RAISE NOTICE 'Seed verification: expected=12, sprint_items_count=%, matched_expected=%', v_total_in_sprint, v_matched_expected;
END $$;

COMMIT;
