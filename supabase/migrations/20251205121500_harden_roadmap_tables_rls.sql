BEGIN;

-- Roadmap Items: project-scoped with ownership and admin override
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_insert_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items_v2 ON public.roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can insert roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can view roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Roadmap items select - owner or admin" ON public.roadmap_items;
DROP POLICY IF EXISTS "Roadmap items update - owner or admin" ON public.roadmap_items;
DROP POLICY IF EXISTS "Users can delete their own roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can insert records" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.roadmap_items;

CREATE POLICY project_scoped_select_roadmap_items
  ON public.roadmap_items
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY project_scoped_insert_roadmap_items
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND created_by = auth.uid()
  );

CREATE POLICY project_scoped_update_roadmap_items
  ON public.roadmap_items
  FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY project_scoped_delete_roadmap_items
  ON public.roadmap_items
  FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Roadmap Item Comments
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_comments ON public.roadmap_item_comments;
DROP POLICY IF EXISTS authenticated_select_comments_v2 ON public.roadmap_item_comments;
DROP POLICY IF EXISTS authenticated_select_roadmap_item_comments ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.roadmap_item_comments;

CREATE POLICY project_scoped_select_roadmap_item_comments
  ON public.roadmap_item_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_comments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
  );

CREATE POLICY project_scoped_insert_roadmap_item_comments
  ON public.roadmap_item_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_comments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY project_scoped_delete_roadmap_item_comments
  ON public.roadmap_item_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_comments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Roadmap Item Attachments
ALTER TABLE public.roadmap_item_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_attachments ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS authenticated_select_attachments_v2 ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.roadmap_item_attachments;

CREATE POLICY project_scoped_select_roadmap_item_attachments
  ON public.roadmap_item_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_attachments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
  );

CREATE POLICY project_scoped_insert_roadmap_item_attachments
  ON public.roadmap_item_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_attachments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY project_scoped_delete_roadmap_item_attachments
  ON public.roadmap_item_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_attachments.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Roadmap Item Upvotes
ALTER TABLE public.roadmap_item_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_upvotes ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS authenticated_select_upvotes_v2 ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Authenticated users can upvote" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON public.roadmap_item_upvotes;

CREATE POLICY project_scoped_select_roadmap_item_upvotes
  ON public.roadmap_item_upvotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_upvotes.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
  );

CREATE POLICY project_scoped_insert_roadmap_item_upvotes
  ON public.roadmap_item_upvotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_upvotes.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY project_scoped_delete_roadmap_item_upvotes
  ON public.roadmap_item_upvotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_items ri
      WHERE ri.id = roadmap_item_upvotes.item_id
        AND has_project_access(auth.uid(), ri.project_id)
    )
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Roadmap Phases
ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_roadmap_phases ON public.roadmap_phases;
CREATE POLICY project_scoped_select_roadmap_phases
  ON public.roadmap_phases
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- Roadmap Releases
ALTER TABLE public.roadmap_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_published_releases ON public.roadmap_releases;
CREATE POLICY project_scoped_select_roadmap_releases
  ON public.roadmap_releases
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id) AND is_published = true);

-- Roadmap Suggestions
ALTER TABLE public.roadmap_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_select_roadmap_suggestions ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can delete suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can update suggestions" ON public.roadmap_suggestions;

CREATE POLICY project_scoped_select_roadmap_suggestions
  ON public.roadmap_suggestions
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY project_scoped_insert_roadmap_suggestions
  ON public.roadmap_suggestions
  FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND created_by = auth.uid()
  );

CREATE POLICY project_scoped_update_roadmap_suggestions
  ON public.roadmap_suggestions
  FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY project_scoped_delete_roadmap_suggestions
  ON public.roadmap_suggestions
  FOR DELETE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

-- Roadmap Tasks
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_select_roadmap_tasks ON public.roadmap_tasks;
CREATE POLICY project_scoped_select_roadmap_tasks
  ON public.roadmap_tasks
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- Roadmap Task Updates
ALTER TABLE public.roadmap_task_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_insert_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_roadmap_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "Authenticated users can create updates" ON public.roadmap_task_updates;

CREATE POLICY project_scoped_select_roadmap_task_updates
  ON public.roadmap_task_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_tasks rt
      WHERE rt.id = roadmap_task_updates.task_id
        AND has_project_access(auth.uid(), rt.project_id)
    )
  );

CREATE POLICY project_scoped_insert_roadmap_task_updates
  ON public.roadmap_task_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmap_tasks rt
      WHERE rt.id = roadmap_task_updates.task_id
        AND has_project_access(auth.uid(), rt.project_id)
    )
    AND created_by = auth.uid()
  );

CREATE POLICY project_scoped_update_roadmap_task_updates
  ON public.roadmap_task_updates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_tasks rt
      WHERE rt.id = roadmap_task_updates.task_id
        AND has_project_access(auth.uid(), rt.project_id)
    )
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roadmap_tasks rt
      WHERE rt.id = roadmap_task_updates.task_id
        AND has_project_access(auth.uid(), rt.project_id)
    )
  );

CREATE POLICY project_scoped_delete_roadmap_task_updates
  ON public.roadmap_task_updates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.roadmap_tasks rt
      WHERE rt.id = roadmap_task_updates.task_id
        AND has_project_access(auth.uid(), rt.project_id)
    )
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'project_manager')
    )
  );

COMMIT;
