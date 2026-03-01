-- ============================================================================
-- Migration: Clean up duplicate roadmap items and roadmap_phases
-- Date: 2025-12-16
-- Description:
--   - Delete duplicate roadmap items (keep only 1 per unique description)
--   - Delete all items from roadmap_phases
--   - Consolidate roadmap data structure to use unique items only
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DELETE DUPLICATE ROADMAP ITEMS
-- ============================================================================
-- Keep only the oldest item (by created_at) for each unique description
-- All items with the same description are duplicates - delete all but the first one

DELETE FROM public.roadmap_items
WHERE id NOT IN (
  SELECT DISTINCT ON (COALESCE(description, 'null')) id
  FROM public.roadmap_items
  ORDER BY COALESCE(description, 'null'), created_at ASC
);

-- ============================================================================
-- 2. DELETE ALL ITEMS FROM roadmap_phases
-- ============================================================================

DELETE FROM public.roadmap_phases;

-- ============================================================================
-- 3. DELETE ALL ITEMS FROM roadmap_tasks (cleanup)
-- ============================================================================

DELETE FROM public.roadmap_tasks;

-- ============================================================================
-- 4. VERIFY CLEANUP
-- ============================================================================

DO $$
DECLARE
  item_count INTEGER;
  phase_count INTEGER;
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count FROM public.roadmap_items;
  SELECT COUNT(*) INTO phase_count FROM public.roadmap_phases;
  SELECT COUNT(*) INTO task_count FROM public.roadmap_tasks;
  
  RAISE NOTICE '✅ Cleanup Report:';
  RAISE NOTICE '  - roadmap_items count (after dedup): %', item_count;
  RAISE NOTICE '  - roadmap_phases count (deleted): %', phase_count;
  RAISE NOTICE '  - roadmap_tasks count (deleted): %', task_count;
END $$;

COMMIT;
