-- Mark Phase 2a Tasks as Complete
-- This migration updates all Phase 2a roadmap items to 'done' status

BEGIN;

-- Update P2a.3: Cron Job Configuration
UPDATE public.roadmap_items
SET
  status = 'done',
  completion_date = NOW(),
  updated_at = NOW()
WHERE code = 'P2a.3'
  AND sprint_identifier = '2026-05';

-- Update P2a.4: API Documentation
UPDATE public.roadmap_items
SET
  status = 'done',
  completion_date = NOW(),
  updated_at = NOW()
WHERE code = 'P2a.4'
  AND sprint_identifier = '2026-05';

-- Update P2a.5: E2E Tests
UPDATE public.roadmap_items
SET
  status = 'done',
  completion_date = NOW(),
  updated_at = NOW()
WHERE code = 'P2a.5'
  AND sprint_identifier = '2026-05';

-- Update P2a.6: Cashflow Command Center UI
UPDATE public.roadmap_items
SET
  status = 'done',
  completion_date = NOW(),
  updated_at = NOW()
WHERE code = 'P2a.6'
  AND sprint_identifier = '2026-05';

-- Update P2a.0: Parent Task (Cashflow Forecast Engine)
UPDATE public.roadmap_items
SET
  status = 'done',
  completion_date = NOW(),
  updated_at = NOW()
WHERE code = 'P2a.0'
  AND sprint_identifier = '2026-05';

-- Verify all tasks are now complete
DO $$
DECLARE
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.roadmap_items
  WHERE sprint_identifier = '2026-05';

  SELECT COUNT(*) INTO v_completed_tasks
  FROM public.roadmap_items
  WHERE sprint_identifier = '2026-05'
    AND status = 'done';

  RAISE NOTICE '✅ Phase 2a Sprint 2026-05 Status:';
  RAISE NOTICE '   Total Tasks: %', v_total_tasks;
  RAISE NOTICE '   Completed Tasks: %', v_completed_tasks;
  RAISE NOTICE '   Progress: % %%', ROUND((v_completed_tasks::NUMERIC / v_total_tasks * 100), 0);

  IF v_completed_tasks = v_total_tasks THEN
    RAISE NOTICE '🎉 All Phase 2a tasks completed!';
  ELSE
    RAISE NOTICE '⚠️  % tasks remaining', (v_total_tasks - v_completed_tasks);
  END IF;
END $$;

COMMIT;

-- Display final status
SELECT
  code,
  title,
  status,
  estimated_effort,
  completion_date
FROM public.roadmap_items
WHERE sprint_identifier = '2026-05'
ORDER BY code;
