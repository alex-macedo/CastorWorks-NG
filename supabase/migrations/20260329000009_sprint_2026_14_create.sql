-- ============================================================================
-- Sprint 2026-14: Full Backlog Delivery (Mar 29 – Apr 12, 2026)
-- Creates the new sprint and reassigns all non-done backlog items.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_sprint_id UUID;
  v_count INTEGER;
BEGIN
  -- Create Sprint 2026-14 if not exists
  INSERT INTO public.sprints (
    sprint_identifier, year, week_number, title, description,
    start_date, end_date, status
  )
  SELECT
    '2026-14', 2026, 14,
    'Sprint 2026-14: Full Backlog Delivery',
    'CastorMind-AI analytics, prompt templates, role permissions, retry queue + Timeline Phase 2 (delays, client defs, dependencies, cascade, comments, analytics).',
    DATE '2026-03-29',
    DATE '2026-04-12',
    'open'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sprints WHERE sprint_identifier = '2026-14'
  );

  SELECT id INTO v_sprint_id
  FROM public.sprints
  WHERE sprint_identifier = '2026-14'
  LIMIT 1;

  IF v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve sprint id for sprint_identifier=2026-14';
  END IF;

  RAISE NOTICE 'Sprint 2026-14 id: %', v_sprint_id;

  -- Reassign all non-done items from previous sprints to Sprint 2026-14
  UPDATE public.roadmap_items
  SET sprint_id = v_sprint_id, updated_at = NOW()
  WHERE status NOT IN ('done', 'Done')
    AND (
      -- Items from Sprint 2026-08 (CastorMind-AI + Timeline Phase 2)
      sprint_id IN (
        SELECT id FROM public.sprints WHERE sprint_identifier IN ('2026-08', '2026-07', '2026-06', '2026-05')
      )
      -- Or unassigned backlog items
      OR sprint_id IS NULL
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Reassigned % non-done roadmap_items to Sprint 2026-14', v_count;

  -- Show summary
  RAISE NOTICE 'Sprint 2026-14 item count by status:';
END $$;

-- Verification
SELECT s.sprint_identifier, r.status, COUNT(*) AS item_count
FROM public.roadmap_items r
JOIN public.sprints s ON s.id = r.sprint_id
WHERE s.sprint_identifier = '2026-14'
GROUP BY s.sprint_identifier, r.status
ORDER BY r.status;

COMMIT;
