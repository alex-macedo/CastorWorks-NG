-- SQL Script: Update RPC Functions for Drag-and-Drop Fix
-- Purpose: Replace RPC functions with corrected array_position() logic
-- This fixes the issue where drag-and-drop items revert to original positions
-- Issue: Original code used ROW_NUMBER() which creates duplicate sort_order values
-- Solution: Use array_position() directly to map array position to sort_order

-- ============================================================================
-- Function 1: reorder_simplebudget_materials_groups
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reorder_simplebudget_materials_groups(p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the sort_order based on the position in the provided array
  -- This preserves the user's intended order from the drag-and-drop operation
  UPDATE public.simplebudget_materials_template AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, group_name) as new_sort_order
    FROM public.simplebudget_materials_template
    WHERE group_name = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_simplebudget_materials_groups(text[]) TO authenticated;

-- ============================================================================
-- Function 2: reorder_simplebudget_labor_groups
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reorder_simplebudget_labor_groups(p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the sort_order based on the position in the provided array
  -- This preserves the user's intended order from the drag-and-drop operation
  UPDATE public.simplebudget_labor_template AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, "group") as new_sort_order
    FROM public.simplebudget_labor_template
    WHERE "group" = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_simplebudget_labor_groups(text[]) TO authenticated;

-- ============================================================================
-- Function 3: reorder_project_materials_groups
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reorder_project_materials_groups(p_project_id uuid, p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate that the project exists before proceeding
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Update the sort_order based on the position in the provided array
  -- This preserves the user's intended order from the drag-and-drop operation
  UPDATE public.project_materials AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, group_name) as new_sort_order
    FROM public.project_materials
    WHERE project_id = p_project_id
      AND group_name = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_project_materials_groups(uuid, text[]) TO authenticated;

-- ============================================================================
-- Function 4: reorder_project_labor_groups
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reorder_project_labor_groups(p_project_id uuid, p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate that the project exists before proceeding
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Update the sort_order based on the position in the provided array
  -- This preserves the user's intended order from the drag-and-drop operation
  UPDATE public.project_labor AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, "group") as new_sort_order
    FROM public.project_labor
    WHERE project_id = p_project_id
      AND "group" = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_project_labor_groups(uuid, text[]) TO authenticated;

-- ============================================================================
-- Verification Script (Run after applying the above functions)
-- ============================================================================
-- Uncomment and run the queries below to verify the fix is working correctly:
--
-- SELECT 'reorder_simplebudget_materials_groups' as function_name,
--        pg_get_functiondef(oid)
-- FROM pg_proc
-- WHERE proname = 'reorder_simplebudget_materials_groups'
--   AND pronargs = 1;
--
-- SELECT 'reorder_project_materials_groups' as function_name,
--        pg_get_functiondef(oid)
-- FROM pg_proc
-- WHERE proname = 'reorder_project_materials_groups'
--   AND pronargs = 2;
-- ============================================================================
