-- Add stabilization task to sprint 2026-08 and mark as done after delivery
-- Task: CM-2026-08-17 - Stabilization pass (post-release bugfix + performance tuning)

BEGIN;

DO $$
DECLARE
  v_sprint_id uuid;
  v_item_id uuid;
  v_done_count integer;
  v_backlog_count integer;

  has_col_sprint_id boolean;
  has_col_sprint_identifier boolean;
  has_col_code boolean;
  has_col_due_date boolean;
  has_col_estimated_effort boolean;
  has_col_notes boolean;
  has_col_position boolean;
  has_col_completed_at boolean;
  has_col_completion_date boolean;
  has_col_updated_at boolean;
BEGIN
  SELECT id
  INTO v_sprint_id
  FROM public.sprints
  WHERE sprint_identifier = '2026-08'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_sprint_id IS NULL THEN
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
    VALUES (
      '2026-08',
      2026,
      8,
      'CastorMind-AI Next Sprint 2026-08',
      'Analytics dashboard, prompt templates, role-based tool permissions, retry queueing, and stabilization pass.',
      DATE '2026-02-23',
      DATE '2026-03-05',
      'open'
    )
    ON CONFLICT (sprint_identifier) DO NOTHING;

    SELECT id
    INTO v_sprint_id
    FROM public.sprints
    WHERE sprint_identifier = '2026-08'
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve sprint id for sprint_identifier=2026-08';
  END IF;

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
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'due_date'
  ) INTO has_col_due_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'estimated_effort'
  ) INTO has_col_estimated_effort;

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
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'completed_at'
  ) INTO has_col_completed_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'completion_date'
  ) INTO has_col_completion_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roadmap_items' AND column_name = 'updated_at'
  ) INTO has_col_updated_at;

  IF has_col_sprint_id THEN
    SELECT r.id
    INTO v_item_id
    FROM public.roadmap_items r
    WHERE r.sprint_id = v_sprint_id
      AND r.title = 'Stabilization pass'
    LIMIT 1;
  ELSIF has_col_sprint_identifier THEN
    SELECT r.id
    INTO v_item_id
    FROM public.roadmap_items r
    WHERE r.sprint_identifier = '2026-08'
      AND r.title = 'Stabilization pass'
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'roadmap_items has neither sprint_id nor sprint_identifier columns';
  END IF;

  IF v_item_id IS NULL THEN
    IF has_col_sprint_id THEN
      IF has_col_code THEN
        INSERT INTO public.roadmap_items (
          sprint_id,
          code,
          title,
          description,
          category,
          priority,
          status
        )
        VALUES (
          v_sprint_id,
          'CM-2026-08-17',
          'Stabilization pass',
          'Run post-release stabilization for CastorMind-AI including bugfix triage, performance tuning, and regression checks.',
          'refinement',
          'high',
          'done'
        )
        RETURNING id INTO v_item_id;
      ELSE
        INSERT INTO public.roadmap_items (
          sprint_id,
          title,
          description,
          category,
          priority,
          status
        )
        VALUES (
          v_sprint_id,
          'Stabilization pass',
          'Run post-release stabilization for CastorMind-AI including bugfix triage, performance tuning, and regression checks.',
          'refinement',
          'high',
          'done'
        )
        RETURNING id INTO v_item_id;
      END IF;
    ELSE
      IF has_col_code THEN
        INSERT INTO public.roadmap_items (
          sprint_identifier,
          code,
          title,
          description,
          category,
          priority,
          status
        )
        VALUES (
          '2026-08',
          'CM-2026-08-17',
          'Stabilization pass',
          'Run post-release stabilization for CastorMind-AI including bugfix triage, performance tuning, and regression checks.',
          'refinement',
          'high',
          'done'
        )
        RETURNING id INTO v_item_id;
      ELSE
        INSERT INTO public.roadmap_items (
          sprint_identifier,
          title,
          description,
          category,
          priority,
          status
        )
        VALUES (
          '2026-08',
          'Stabilization pass',
          'Run post-release stabilization for CastorMind-AI including bugfix triage, performance tuning, and regression checks.',
          'refinement',
          'high',
          'done'
        )
        RETURNING id INTO v_item_id;
      END IF;
    END IF;
  ELSE
    UPDATE public.roadmap_items
    SET status = 'done',
        priority = 'high',
        category = 'refinement'
    WHERE id = v_item_id;
  END IF;

  IF v_item_id IS NOT NULL THEN
    IF has_col_due_date THEN
      EXECUTE format('UPDATE public.roadmap_items SET due_date = COALESCE(due_date, %L::date) WHERE id = %L::uuid', '2026-03-05', v_item_id::text);
    END IF;

    IF has_col_estimated_effort THEN
      EXECUTE format('UPDATE public.roadmap_items SET estimated_effort = COALESCE(estimated_effort, %L) WHERE id = %L::uuid', 'medium', v_item_id::text);
    END IF;

    IF has_col_notes THEN
      EXECUTE format('UPDATE public.roadmap_items SET notes = COALESCE(notes, %L) WHERE id = %L::uuid', 'Completed stabilization pass delivery for CastorMind-AI dark-mode and post-release hardening.', v_item_id::text);
    END IF;

    IF has_col_position THEN
      EXECUTE format('UPDATE public.roadmap_items SET position = COALESCE(position, %s) WHERE id = %L::uuid', 17, v_item_id::text);
    END IF;

    IF has_col_completed_at THEN
      EXECUTE format('UPDATE public.roadmap_items SET completed_at = COALESCE(completed_at, NOW()) WHERE id = %L::uuid', v_item_id::text);
    ELSIF has_col_completion_date THEN
      EXECUTE format('UPDATE public.roadmap_items SET completion_date = COALESCE(completion_date, NOW()) WHERE id = %L::uuid', v_item_id::text);
    END IF;

    IF has_col_updated_at THEN
      EXECUTE format('UPDATE public.roadmap_items SET updated_at = NOW() WHERE id = %L::uuid', v_item_id::text);
    END IF;
  END IF;

  IF has_col_sprint_id THEN
    SELECT
      COUNT(*) FILTER (WHERE r.status = 'done'),
      COUNT(*) FILTER (WHERE r.status = 'backlog')
    INTO v_done_count, v_backlog_count
    FROM public.roadmap_items r
    WHERE r.sprint_id = v_sprint_id;
  ELSE
    SELECT
      COUNT(*) FILTER (WHERE r.status = 'done'),
      COUNT(*) FILTER (WHERE r.status = 'backlog')
    INTO v_done_count, v_backlog_count
    FROM public.roadmap_items r
    WHERE r.sprint_identifier = '2026-08';
  END IF;

  RAISE NOTICE 'Sprint 2026-08 status counts -> done: %, backlog: %', v_done_count, v_backlog_count;
END
$$;

COMMIT;
