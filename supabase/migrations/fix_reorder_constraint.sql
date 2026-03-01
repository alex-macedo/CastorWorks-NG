-- ============================================================================
-- Quick Fix: Add RPC function for reordering task statuses
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Make sure constraint is deferrable
ALTER TABLE project_task_statuses 
  DROP CONSTRAINT IF EXISTS unique_project_display_order;

ALTER TABLE project_task_statuses 
  ADD CONSTRAINT unique_project_display_order 
  UNIQUE(project_id, display_order) 
  DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Create RPC function for reordering
CREATE OR REPLACE FUNCTION reorder_project_task_statuses(
  p_project_id UUID,
  p_status_ids UUID[]
)
RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Set constraint to deferred for this transaction
  SET CONSTRAINTS unique_project_display_order DEFERRED;
  
  -- Update each status with its new display_order
  FOR i IN 1..array_length(p_status_ids, 1) LOOP
    UPDATE project_task_statuses
    SET display_order = i - 1  -- 0-indexed
    WHERE id = p_status_ids[i]
      AND project_id = p_project_id;
  END LOOP;
  
  -- Constraint will be checked when transaction commits
END;
$$ LANGUAGE plpgsql;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION reorder_project_task_statuses(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify constraint is deferrable
SELECT 
  conname as constraint_name,
  condeferrable as is_deferrable,
  condeferred as initially_deferred
FROM pg_constraint
WHERE conname = 'unique_project_display_order';

-- Expected result:
-- constraint_name                | is_deferrable | initially_deferred
-- unique_project_display_order   | true          | true

-- Verify function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'reorder_project_task_statuses';

-- Should return the function definition
