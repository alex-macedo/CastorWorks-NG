-- Update Phase 2a Task P2a.2 Status to Done
-- The Edge Function has been implemented and updated to match database schema

BEGIN;

-- Update P2a.2 (Edge Function Implementation) to done
UPDATE public.roadmap_items
SET
  status = 'done',
  completed_at = NOW(),
  updated_at = NOW()
WHERE
  sprint_id = (SELECT id FROM public.sprints WHERE sprint_identifier = '2026-05')
  AND title = '└── P2a.2: Cashflow Forecast Edge Function';

-- Verify update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM public.roadmap_items
  WHERE
    sprint_id = (SELECT id FROM public.sprints WHERE sprint_identifier = '2026-05')
    AND title = '└── P2a.2: Cashflow Forecast Edge Function'
    AND status = 'done';

  IF v_updated_count = 0 THEN
    RAISE WARNING 'Task P2a.2 was not found or not updated';
  ELSE
    RAISE NOTICE 'Task P2a.2 marked as done successfully';
  END IF;
END $$;

COMMIT;
