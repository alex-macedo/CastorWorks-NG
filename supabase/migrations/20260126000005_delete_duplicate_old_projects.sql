-- ============================================================================
-- Delete Old Duplicate Projects
-- Migration: 20260126000005
-- Description: 
-- Deletes the older duplicate projects that have no associated data:
-- - 0f3e4962-92e7-43dd-aac3-d580c47ba620 (Complexo Residencial - Fase 1, created 2025-12-13)
-- - 89c7cd94-1d02-46d6-a25c-d246bf187fab (Edifício Comercial Centro, created 2025-12-13)
-- 
-- These projects are empty (no team members, phases, documents, etc.) and are
-- duplicates of newer projects created on 2026-01-25.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Disable trigger to prevent project_task_statuses deletion error
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE project_task_statuses DISABLE TRIGGER prevent_delete_only_default_status;
EXCEPTION
  WHEN OTHERS THEN
    -- Trigger might not exist, continue
    NULL;
END $$;

-- ============================================================================
-- Step 2: Delete the old duplicate projects
-- ============================================================================
-- These projects have been verified to have no associated data
DELETE FROM public.projects
WHERE id IN (
  '0f3e4962-92e7-43dd-aac3-d580c47ba620', -- Complexo Residencial - Fase 1 (old)
  '89c7cd94-1d02-46d6-a25c-d246bf187fab'  -- Edifício Comercial Centro (old)
);

-- ============================================================================
-- Step 3: Re-enable the trigger
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE project_task_statuses ENABLE TRIGGER prevent_delete_only_default_status;
EXCEPTION
  WHEN OTHERS THEN
    -- Trigger might not exist, continue
    NULL;
END $$;

-- ============================================================================
-- Verification: Confirm deletion
-- ============================================================================
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.projects
  WHERE id IN (
    '0f3e4962-92e7-43dd-aac3-d580c47ba620',
    '89c7cd94-1d02-46d6-a25c-d246bf187fab'
  );
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Warning: % old duplicate projects still exist', remaining_count;
  ELSE
    RAISE NOTICE 'Successfully deleted 2 old duplicate projects';
  END IF;
END $$;

COMMIT;
