-- Harden roadmap_* RLS using EXISTS joins via roadmap_items → sprints → projects
BEGIN;

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_upvotes ENABLE ROW LEVEL SECURITY;

-- Helper EXISTS clause pattern:
-- roadmap_items link to sprints (roadmap_items.sprint_id → sprints.id),
-- and sprints should carry project_id; enforce has_project_access(auth.uid(), sprints.project_id).

-- Roadmap items SELECT: project members
CREATE POLICY project_scoped_select_roadmap_items
  ON public.roadmap_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM sprints s
      WHERE s.id = roadmap_items.sprint_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

-- Roadmap items INSERT: creator must be admin/PM with project access (uses sprint linkage)
CREATE POLICY project_admin_insert_roadmap_items
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sprints s
      WHERE s.id = roadmap_items.sprint_id
        AND has_project_access(auth.uid(), s.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  );

-- Roadmap items UPDATE/DELETE: owner or admin/PM with project access
CREATE POLICY owner_or_admin_update_roadmap_items
  ON public.roadmap_items
  FOR UPDATE
  USING (
    (roadmap_items.created_by = auth.uid()) OR EXISTS (
      SELECT 1
      FROM sprints s
      WHERE s.id = roadmap_items.sprint_id
        AND has_project_access(auth.uid(), s.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  )
  WITH CHECK (
    (roadmap_items.created_by = auth.uid()) OR EXISTS (
      SELECT 1
      FROM sprints s
      WHERE s.id = roadmap_items.sprint_id
        AND has_project_access(auth.uid(), s.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  );

CREATE POLICY owner_or_admin_delete_roadmap_items
  ON public.roadmap_items
  FOR DELETE
  USING (
    (roadmap_items.created_by = auth.uid()) OR EXISTS (
      SELECT 1
      FROM sprints s
      WHERE s.id = roadmap_items.sprint_id
        AND has_project_access(auth.uid(), s.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  );

-- Comments: project-scoped SELECT; INSERT/UPDATE only by comment owner with project access
CREATE POLICY project_scoped_select_roadmap_item_comments
  ON public.roadmap_item_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_comments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_insert_comments_with_project_access
  ON public.roadmap_item_comments
  FOR INSERT
  WITH CHECK (
    roadmap_item_comments.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_comments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_update_comments_with_project_access
  ON public.roadmap_item_comments
  FOR UPDATE
  USING (
    roadmap_item_comments.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_comments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  )
  WITH CHECK (
    roadmap_item_comments.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_comments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

-- Attachments: project-scoped SELECT; owner-only INSERT/DELETE with project access
CREATE POLICY project_scoped_select_roadmap_item_attachments
  ON public.roadmap_item_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_attachments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_insert_attachments_with_project_access
  ON public.roadmap_item_attachments
  FOR INSERT
  WITH CHECK (
    roadmap_item_attachments.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_attachments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_delete_attachments_with_project_access
  ON public.roadmap_item_attachments
  FOR DELETE
  USING (
    roadmap_item_attachments.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_attachments.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

-- Upvotes: project-scoped SELECT; owner-only INSERT/DELETE with project access
CREATE POLICY project_scoped_select_roadmap_item_upvotes
  ON public.roadmap_item_upvotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_upvotes.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_insert_upvotes_with_project_access
  ON public.roadmap_item_upvotes
  FOR INSERT
  WITH CHECK (
    roadmap_item_upvotes.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_upvotes.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

CREATE POLICY owner_delete_upvotes_with_project_access
  ON public.roadmap_item_upvotes
  FOR DELETE
  USING (
    roadmap_item_upvotes.user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM roadmap_items ri
      JOIN sprints s ON s.id = ri.sprint_id
      WHERE ri.id = roadmap_item_upvotes.roadmap_item_id
        AND has_project_access(auth.uid(), s.project_id)
    )
  );

COMMIT;
