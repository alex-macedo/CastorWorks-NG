-- Harden RLS for roadmap core tables: items, comments, attachments, upvotes
BEGIN;

-- roadmap_items
ALTER TABLE IF EXISTS roadmap_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roadmap_items'
  ) THEN
    DROP POLICY IF EXISTS "authenticated_select_roadmap_items" ON roadmap_items;
    DROP POLICY IF EXISTS "authenticated_select_roadmap_items_v2" ON roadmap_items;
    DROP POLICY IF EXISTS "Authenticated users can view roadmap items" ON roadmap_items;
    DROP POLICY IF EXISTS "Users can update their own roadmap items" ON roadmap_items;
    DROP POLICY IF EXISTS "Users can delete their own roadmap items" ON roadmap_items;
    DROP POLICY IF EXISTS "Admins can manage all records" ON roadmap_items;
    DROP POLICY IF EXISTS "Admins can insert records" ON roadmap_items;
    DROP POLICY IF EXISTS "Admins can delete roadmap items" ON roadmap_items;
    DROP POLICY IF EXISTS "authenticated_insert_roadmap_items" ON roadmap_items;
  END IF;
END$$;

CREATE POLICY "Project-based select roadmap items"
  ON roadmap_items FOR SELECT
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based insert roadmap items"
  ON roadmap_items FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based update roadmap items"
  ON roadmap_items FOR UPDATE
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based delete roadmap items"
  ON roadmap_items FOR DELETE
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

-- roadmap_item_comments
ALTER TABLE IF EXISTS roadmap_item_comments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roadmap_item_comments'
  ) THEN
    DROP POLICY IF EXISTS "authenticated_select_roadmap_item_comments" ON roadmap_item_comments;
    DROP POLICY IF EXISTS "authenticated_select_comments" ON roadmap_item_comments;
    DROP POLICY IF EXISTS "authenticated_select_comments_v2" ON roadmap_item_comments;
    DROP POLICY IF EXISTS "Authenticated users can create comments" ON roadmap_item_comments;
    DROP POLICY IF EXISTS "Users can delete their own comments" ON roadmap_item_comments;
  END IF;
END$$;

CREATE POLICY "Project-based select roadmap comments"
  ON roadmap_item_comments FOR SELECT
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based insert roadmap comments (owned)"
  ON roadmap_item_comments FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) AND user_id = auth.uid());

CREATE POLICY "Project-based update roadmap comments (owned or admin)"
  ON roadmap_item_comments FOR UPDATE
  USING (has_project_access(auth.uid(), project_id) AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
  WITH CHECK (has_project_access(auth.uid(), project_id) AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Project-based delete roadmap comments (owned or admin)"
  ON roadmap_item_comments FOR DELETE
  USING (has_project_access(auth.uid(), project_id) AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')));

-- roadmap_item_attachments
ALTER TABLE IF EXISTS roadmap_item_attachments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roadmap_item_attachments'
  ) THEN
    DROP POLICY IF EXISTS "authenticated_select_attachments" ON roadmap_item_attachments;
    DROP POLICY IF EXISTS "authenticated_select_attachments_v2" ON roadmap_item_attachments;
    DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON roadmap_item_attachments;
    DROP POLICY IF EXISTS "Users can delete their own attachments" ON roadmap_item_attachments;
  END IF;
END$$;

CREATE POLICY "Project-based select roadmap attachments"
  ON roadmap_item_attachments FOR SELECT
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based insert roadmap attachments (owned)"
  ON roadmap_item_attachments FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) AND user_id = auth.uid());

CREATE POLICY "Project-based delete roadmap attachments (owned or admin)"
  ON roadmap_item_attachments FOR DELETE
  USING (has_project_access(auth.uid(), project_id) AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')));

-- roadmap_item_upvotes
ALTER TABLE IF EXISTS roadmap_item_upvotes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roadmap_item_upvotes'
  ) THEN
    DROP POLICY IF EXISTS "authenticated_select_upvotes" ON roadmap_item_upvotes;
    DROP POLICY IF EXISTS "authenticated_select_upvotes_v2" ON roadmap_item_upvotes;
    DROP POLICY IF EXISTS "Authenticated users can upvote" ON roadmap_item_upvotes;
    DROP POLICY IF EXISTS "Users can remove their own upvotes" ON roadmap_item_upvotes;
  END IF;
END$$;

CREATE POLICY "Project-based select roadmap upvotes"
  ON roadmap_item_upvotes FOR SELECT
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based insert roadmap upvotes (owned)"
  ON roadmap_item_upvotes FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) AND user_id = auth.uid());

CREATE POLICY "Project-based delete roadmap upvotes (owned or admin)"
  ON roadmap_item_upvotes FOR DELETE
  USING (has_project_access(auth.uid(), project_id) AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')));

COMMIT;
