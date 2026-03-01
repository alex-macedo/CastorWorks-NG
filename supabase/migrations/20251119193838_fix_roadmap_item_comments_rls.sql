-- ============================================================================
-- Fix RLS Policies for roadmap_item_comments
-- ============================================================================
-- This migration restores the INSERT policy that was dropped in the cleanup
-- migration, allowing authenticated users to add comments to roadmap items.
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view comments" ON public.roadmap_item_comments CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.roadmap_item_comments CASCADE;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.roadmap_item_comments CASCADE;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.roadmap_item_comments CASCADE;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.roadmap_item_comments CASCADE;
DROP POLICY IF EXISTS "authenticated_select_roadmap_item_comments" ON public.roadmap_item_comments CASCADE;

-- Create SELECT policy: Authenticated users can view comments
-- SECURITY NOTE: This policy intentionally allows all authenticated users to view
-- all roadmap comments. This is by design - roadmap data (items, comments, upvotes)
-- represents product roadmap feedback and is shared across all authenticated users,
-- not scoped to individual projects. This matches the pattern used in:
-- - roadmap_items (20251110120221_c707c28e-483e-450b-814d-1526dd59bfa2.sql)
-- - roadmap_tasks (20251120000000_force_create_roadmap_tasks.sql)
-- - roadmap_task_updates (20251120000000_force_create_roadmap_tasks.sql)
CREATE POLICY "authenticated_select_roadmap_item_comments"
ON public.roadmap_item_comments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create INSERT policy: Authenticated users can create comments
-- The user_id must match the authenticated user's ID
CREATE POLICY "Authenticated users can create comments"
ON public.roadmap_item_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create UPDATE policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.roadmap_item_comments
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create DELETE policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.roadmap_item_comments
FOR DELETE
USING (user_id = auth.uid());

