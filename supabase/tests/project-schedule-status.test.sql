-- Project schedule status computation tests
-- Validates centralized phase-based rules, WBS child roll-up and trigger propagation.

BEGIN;

-- ---------------------------------------------------------------------
-- Test fixtures
-- ---------------------------------------------------------------------
INSERT INTO public.projects (id, name, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111101'::uuid, 'Status Test P1', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102'::uuid, 'Status Test P2', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103'::uuid, 'Status Test P3', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111104'::uuid, 'Status Test P4', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111105'::uuid, 'Status Test P5', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111106'::uuid, 'Status Test P6', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111107'::uuid, 'Status Test P7', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111108'::uuid, 'Status Test P8 WBS Rollup', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111109'::uuid, 'Status Test P9 WBS Trigger', NOW(), NOW());

-- Remove auto-generated rows from project insert hooks so fixtures are deterministic
DELETE FROM public.project_activities
WHERE project_id IN (
  '11111111-1111-1111-1111-111111111101'::uuid,
  '11111111-1111-1111-1111-111111111102'::uuid,
  '11111111-1111-1111-1111-111111111103'::uuid,
  '11111111-1111-1111-1111-111111111104'::uuid,
  '11111111-1111-1111-1111-111111111105'::uuid,
  '11111111-1111-1111-1111-111111111106'::uuid,
  '11111111-1111-1111-1111-111111111107'::uuid,
  '11111111-1111-1111-1111-111111111108'::uuid,
  '11111111-1111-1111-1111-111111111109'::uuid
);

DELETE FROM public.project_phases
WHERE project_id IN (
  '11111111-1111-1111-1111-111111111101'::uuid,
  '11111111-1111-1111-1111-111111111102'::uuid,
  '11111111-1111-1111-1111-111111111103'::uuid,
  '11111111-1111-1111-1111-111111111104'::uuid,
  '11111111-1111-1111-1111-111111111105'::uuid,
  '11111111-1111-1111-1111-111111111106'::uuid,
  '11111111-1111-1111-1111-111111111107'::uuid,
  '11111111-1111-1111-1111-111111111108'::uuid,
  '11111111-1111-1111-1111-111111111109'::uuid
);

DELETE FROM public.project_wbs_items
WHERE project_id IN (
  '11111111-1111-1111-1111-111111111108'::uuid,
  '11111111-1111-1111-1111-111111111109'::uuid
);

INSERT INTO public.project_phases (
  id,
  project_id,
  phase_name,
  start_date,
  end_date,
  progress_percentage,
  status,
  created_at,
  updated_at
)
VALUES
  ('22222222-2222-2222-2222-222222222102'::uuid, '11111111-1111-1111-1111-111111111102'::uuid, 'Phase P2', CURRENT_DATE + 1, CURRENT_DATE + 10, 0, 'pending', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222103'::uuid, '11111111-1111-1111-1111-111111111103'::uuid, 'Phase P3', CURRENT_DATE - 10, CURRENT_DATE + 10, 60, 'in_progress', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222104'::uuid, '11111111-1111-1111-1111-111111111104'::uuid, 'Phase P4', CURRENT_DATE - 10, CURRENT_DATE + 10, 45, 'in_progress', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222105'::uuid, '11111111-1111-1111-1111-111111111105'::uuid, 'Phase P5', CURRENT_DATE - 10, CURRENT_DATE - 1, 50, 'in_progress', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222106'::uuid, '11111111-1111-1111-1111-111111111106'::uuid, 'Phase P6', CURRENT_DATE - 10, CURRENT_DATE + 10, 40, 'in_progress', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222107'::uuid, '11111111-1111-1111-1111-111111111107'::uuid, 'Phase P7', CURRENT_DATE - 10, CURRENT_DATE + 10, 0, 'pending', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222108'::uuid, '11111111-1111-1111-1111-111111111108'::uuid, 'Phase P8', CURRENT_DATE - 10, CURRENT_DATE - 1, 0, 'pending', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222109'::uuid, '11111111-1111-1111-1111-111111111109'::uuid, 'Phase P9', CURRENT_DATE - 5, CURRENT_DATE - 1, 0, 'pending', NOW(), NOW());

INSERT INTO public.project_activities (
  id,
  project_id,
  phase_id,
  sequence,
  name,
  start_date,
  end_date,
  completion_percentage,
  days_for_activity,
  created_at,
  updated_at
)
VALUES
  ('33333333-3333-3333-3333-333333333102'::uuid, '11111111-1111-1111-1111-111111111102'::uuid, '22222222-2222-2222-2222-222222222102'::uuid, 1, 'Task P2', CURRENT_DATE + 1, CURRENT_DATE + 10, 0, 10, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333103'::uuid, '11111111-1111-1111-1111-111111111103'::uuid, '22222222-2222-2222-2222-222222222103'::uuid, 1, 'Task P3', CURRENT_DATE - 10, CURRENT_DATE + 10, 60, 21, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333104'::uuid, '11111111-1111-1111-1111-111111111104'::uuid, '22222222-2222-2222-2222-222222222104'::uuid, 1, 'Task P4', CURRENT_DATE - 10, CURRENT_DATE + 10, 45, 21, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333105'::uuid, '11111111-1111-1111-1111-111111111105'::uuid, '22222222-2222-2222-2222-222222222105'::uuid, 1, 'Task P5', CURRENT_DATE - 10, CURRENT_DATE - 1, 50, 10, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333106'::uuid, '11111111-1111-1111-1111-111111111106'::uuid, '22222222-2222-2222-2222-222222222106'::uuid, 1, 'Task P6', CURRENT_DATE - 10, CURRENT_DATE + 10, 40, 21, NOW(), NOW());

-- ---------------------------------------------------------------------
-- WBS fixtures for child roll-up tests
-- ---------------------------------------------------------------------
INSERT INTO public.project_wbs_items (id, project_id, parent_id, item_type, name, sort_order, status, progress_percentage, standard_duration_days)
VALUES
  ('44444444-4444-4444-4444-444444444801'::uuid, '11111111-1111-1111-1111-111111111108'::uuid, NULL, 'phase', 'WBS P8 Parent', 1, 'in_progress', 20, 5),
  ('44444444-4444-4444-4444-444444444802'::uuid, '11111111-1111-1111-1111-111111111108'::uuid, '44444444-4444-4444-4444-444444444801'::uuid, 'deliverable', 'WBS P8 Child A', 1, 'completed', 100, 2),
  ('44444444-4444-4444-4444-444444444803'::uuid, '11111111-1111-1111-1111-111111111108'::uuid, '44444444-4444-4444-4444-444444444801'::uuid, 'deliverable', 'WBS P8 Child B', 2, 'completed', 100, 3),
  ('44444444-4444-4444-4444-444444444901'::uuid, '11111111-1111-1111-1111-111111111109'::uuid, NULL, 'phase', 'WBS P9 Parent', 1, 'in_progress', 0, 5),
  ('44444444-4444-4444-4444-444444444902'::uuid, '11111111-1111-1111-1111-111111111109'::uuid, '44444444-4444-4444-4444-444444444901'::uuid, 'deliverable', 'WBS P9 Child A', 1, 'pending', 0, 2);

UPDATE public.project_phases
SET wbs_item_id = '44444444-4444-4444-4444-444444444801'::uuid
WHERE id = '22222222-2222-2222-2222-222222222108'::uuid;

UPDATE public.project_phases
SET wbs_item_id = '44444444-4444-4444-4444-444444444901'::uuid
WHERE id = '22222222-2222-2222-2222-222222222109'::uuid;

-- ---------------------------------------------------------------------
-- Rule tests (function-level)
-- ---------------------------------------------------------------------
SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111101'::uuid, CURRENT_DATE)) = 'not_started'
    THEN '✓ PASS no phases => not_started'
    ELSE '✗ FAIL no phases expected not_started'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111102'::uuid, CURRENT_DATE)) = 'not_started'
    THEN '✓ PASS future phases only => not_started'
    ELSE '✗ FAIL future phases expected not_started'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111103'::uuid, CURRENT_DATE)) = 'on_schedule'
    THEN '✓ PASS SPI>=0.97 => on_schedule'
    ELSE '✗ FAIL SPI>=0.97 expected on_schedule'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111104'::uuid, CURRENT_DATE)) = 'at_risk'
    THEN '✓ PASS SPI in [0.90,0.97) => at_risk'
    ELSE '✗ FAIL SPI in [0.90,0.97) expected at_risk'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111105'::uuid, CURRENT_DATE)) = 'delayed'
    THEN '✓ PASS overdue incomplete => delayed'
    ELSE '✗ FAIL overdue incomplete expected delayed'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111106'::uuid, CURRENT_DATE)) = 'delayed'
    THEN '✓ PASS SPI<0.90 => delayed'
    ELSE '✗ FAIL SPI<0.90 expected delayed'
  END AS test_result;

SELECT
  CASE WHEN (SELECT schedule_status FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111108'::uuid, CURRENT_DATE)) = 'on_schedule'
    THEN '✓ PASS WBS child rollup (children 100, stale parent low) => on_schedule'
    ELSE '✗ FAIL WBS child rollup expected on_schedule'
  END AS test_result;

SELECT
  CASE WHEN (
    SELECT (metrics_json->>'timezone') IS NOT NULL
    FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111103'::uuid, CURRENT_DATE)
  )
    THEN '✓ PASS metrics payload includes timezone'
    ELSE '✗ FAIL metrics payload missing timezone'
  END AS test_result;

-- ---------------------------------------------------------------------
-- Trigger propagation tests
-- ---------------------------------------------------------------------
-- Activity trigger still refreshes centralized project status
INSERT INTO public.project_activities (
  id,
  project_id,
  phase_id,
  sequence,
  name,
  start_date,
  end_date,
  completion_percentage,
  days_for_activity,
  created_at,
  updated_at
)
VALUES (
  '33333333-3333-3333-3333-333333333107'::uuid,
  '11111111-1111-1111-1111-111111111107'::uuid,
  '22222222-2222-2222-2222-222222222107'::uuid,
  1,
  'Task P7',
  CURRENT_DATE - 10,
  CURRENT_DATE - 1,
  20,
  10,
  NOW(),
  NOW()
);

SELECT
  CASE WHEN (
    SELECT schedule_status
    FROM public.projects
    WHERE id = '11111111-1111-1111-1111-111111111107'::uuid
  ) = 'delayed'
    THEN '✓ PASS activity trigger refreshed projects.schedule_status'
    ELSE '✗ FAIL activity trigger did not refresh projects.schedule_status'
  END AS test_result;

-- WBS trigger: child completion should flip project from delayed to on_schedule
SELECT public.refresh_project_schedule_status('11111111-1111-1111-1111-111111111109'::uuid, CURRENT_DATE);

SELECT
  CASE WHEN (
    SELECT schedule_status
    FROM public.projects
    WHERE id = '11111111-1111-1111-1111-111111111109'::uuid
  ) = 'delayed'
    THEN '✓ PASS precondition P9 starts delayed'
    ELSE '✗ FAIL precondition P9 expected delayed'
  END AS test_result;

UPDATE public.project_wbs_items
SET status = 'completed', progress_percentage = 100
WHERE id = '44444444-4444-4444-4444-444444444902'::uuid;

SELECT
  CASE WHEN (
    SELECT schedule_status
    FROM public.projects
    WHERE id = '11111111-1111-1111-1111-111111111109'::uuid
  ) = 'on_schedule'
    THEN '✓ PASS wbs trigger refreshed projects.schedule_status'
    ELSE '✗ FAIL wbs trigger did not refresh projects.schedule_status'
  END AS test_result;

-- ---------------------------------------------------------------------
-- Metrics payload smoke test
-- ---------------------------------------------------------------------
SELECT
  CASE
    WHEN (SELECT metrics_json ? 'rule_version' FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111103'::uuid, CURRENT_DATE))
      AND (SELECT metrics_json ? 'spi' FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111103'::uuid, CURRENT_DATE))
      AND (SELECT metrics_json ? 'phase_diagnostics' FROM public.compute_project_schedule_status('11111111-1111-1111-1111-111111111103'::uuid, CURRENT_DATE))
    THEN '✓ PASS metrics payload includes rule_version, spi, phase_diagnostics'
    ELSE '✗ FAIL metrics payload missing required fields'
  END AS test_result;

ROLLBACK;
