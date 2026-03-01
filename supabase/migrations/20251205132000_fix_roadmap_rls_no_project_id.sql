-- Fix RLS for roadmap tables: These are GLOBAL tables without project_id
-- The previous migrations incorrectly assumed project_id exists
-- Reverting to authentication-based access for these shared roadmap tables

BEGIN;

-- =============================================
-- DROP ALL BROKEN PROJECT-SCOPED POLICIES
-- =============================================

-- roadmap_items
DROP POLICY IF EXISTS project_scoped_select_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS project_scoped_update_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS "Project-based select roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Project-based insert roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Project-based update roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Project-based delete roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS project_admin_insert_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS owner_or_admin_update_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS owner_or_admin_delete_roadmap_items ON public.roadmap_items;

-- roadmap_item_comments
DROP POLICY IF EXISTS project_scoped_select_roadmap_item_comments ON public.roadmap_item_comments;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_item_comments ON public.roadmap_item_comments;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_item_comments ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Project-based select roadmap comments" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Project-based insert roadmap comments (owned)" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Project-based update roadmap comments (owned or admin)" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Project-based delete roadmap comments (owned or admin)" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS owner_insert_comments_with_project_access ON public.roadmap_item_comments;
DROP POLICY IF EXISTS owner_update_comments_with_project_access ON public.roadmap_item_comments;

-- roadmap_item_attachments
DROP POLICY IF EXISTS project_scoped_select_roadmap_item_attachments ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_item_attachments ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_item_attachments ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Project-based select roadmap attachments" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Project-based insert roadmap attachments (owned)" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Project-based delete roadmap attachments (owned or admin)" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS owner_insert_attachments_with_project_access ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS owner_delete_attachments_with_project_access ON public.roadmap_item_attachments;

-- roadmap_item_upvotes
DROP POLICY IF EXISTS project_scoped_select_roadmap_item_upvotes ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_item_upvotes ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_item_upvotes ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Project-based select roadmap upvotes" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Project-based insert roadmap upvotes (owned)" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Project-based delete roadmap upvotes (owned or admin)" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS owner_insert_upvotes_with_project_access ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS owner_delete_upvotes_with_project_access ON public.roadmap_item_upvotes;

-- roadmap_phases
DROP POLICY IF EXISTS project_scoped_select_roadmap_phases ON public.roadmap_phases;

-- roadmap_releases
DROP POLICY IF EXISTS project_scoped_select_roadmap_releases ON public.roadmap_releases;

-- roadmap_suggestions
DROP POLICY IF EXISTS project_scoped_select_roadmap_suggestions ON public.roadmap_suggestions;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_suggestions ON public.roadmap_suggestions;
DROP POLICY IF EXISTS project_scoped_update_roadmap_suggestions ON public.roadmap_suggestions;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_suggestions ON public.roadmap_suggestions;

-- roadmap_tasks
DROP POLICY IF EXISTS project_scoped_select_roadmap_tasks ON public.roadmap_tasks;

-- roadmap_task_updates
DROP POLICY IF EXISTS project_scoped_select_roadmap_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS project_scoped_insert_roadmap_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS project_scoped_update_roadmap_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS project_scoped_delete_roadmap_task_updates ON public.roadmap_task_updates;

-- =============================================
-- CREATE CORRECT AUTH-BASED POLICIES
-- Roadmap tables are GLOBAL - all authenticated users can read
-- =============================================

-- roadmap_items: All authenticated users can read, owners and admins can modify
CREATE POLICY "authenticated_select_roadmap_items"
  ON public.roadmap_items FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_items"
  ON public.roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "owner_or_admin_update_roadmap_items"
  ON public.roadmap_items FOR UPDATE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "owner_or_admin_delete_roadmap_items"
  ON public.roadmap_items FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- roadmap_item_comments
CREATE POLICY "authenticated_select_roadmap_item_comments"
  ON public.roadmap_item_comments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_item_comments"
  ON public.roadmap_item_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_update_roadmap_item_comments"
  ON public.roadmap_item_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "owner_or_admin_delete_roadmap_item_comments"
  ON public.roadmap_item_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- roadmap_item_attachments
CREATE POLICY "authenticated_select_roadmap_item_attachments"
  ON public.roadmap_item_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_item_attachments"
  ON public.roadmap_item_attachments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_or_admin_delete_roadmap_item_attachments"
  ON public.roadmap_item_attachments FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- roadmap_item_upvotes
CREATE POLICY "authenticated_select_roadmap_item_upvotes"
  ON public.roadmap_item_upvotes FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_item_upvotes"
  ON public.roadmap_item_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_delete_roadmap_item_upvotes"
  ON public.roadmap_item_upvotes FOR DELETE
  USING (user_id = auth.uid());

-- roadmap_phases
CREATE POLICY "authenticated_select_roadmap_phases"
  ON public.roadmap_phases FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- roadmap_releases
CREATE POLICY "authenticated_select_roadmap_releases"
  ON public.roadmap_releases FOR SELECT
  TO authenticated
  USING (is_published = true);

-- roadmap_suggestions (suggested_by is TEXT, not user_id - simpler auth policies)
CREATE POLICY "authenticated_select_roadmap_suggestions"
  ON public.roadmap_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_suggestions"
  ON public.roadmap_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_or_pm_update_roadmap_suggestions"
  ON public.roadmap_suggestions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "admin_delete_roadmap_suggestions"
  ON public.roadmap_suggestions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- roadmap_tasks
CREATE POLICY "authenticated_select_roadmap_tasks"
  ON public.roadmap_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- roadmap_task_updates
CREATE POLICY "authenticated_select_roadmap_task_updates"
  ON public.roadmap_task_updates FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_roadmap_task_updates"
  ON public.roadmap_task_updates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_or_admin_update_roadmap_task_updates"
  ON public.roadmap_task_updates FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "owner_or_admin_delete_roadmap_task_updates"
  ON public.roadmap_task_updates FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

COMMIT;
