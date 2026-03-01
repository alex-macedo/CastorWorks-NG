BEGIN;

-- Architect module policies

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_briefings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_briefings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_briefings_select
  ON public.architect_briefings
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_briefings_insert
  ON public.architect_briefings
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_briefings_update
  ON public.architect_briefings
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_briefings_delete
  ON public.architect_briefings
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_meetings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_meetings', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_meetings_select
  ON public.architect_meetings
  FOR SELECT
  USING (
    (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM projects p
        JOIN client_project_access cpa ON cpa.project_id = p.id
        WHERE p.client_id = architect_meetings.client_id
          AND has_project_access(auth.uid(), p.id)
      )
    )
  );
CREATE POLICY architect_meetings_insert
  ON public.architect_meetings
  FOR INSERT
  WITH CHECK (
    (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM projects p
        JOIN client_project_access cpa ON cpa.project_id = p.id
        WHERE p.client_id = architect_meetings.client_id
          AND has_project_access(auth.uid(), p.id)
      )
    )
  );
CREATE POLICY architect_meetings_update
  ON public.architect_meetings
  FOR UPDATE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));
CREATE POLICY architect_meetings_delete
  ON public.architect_meetings
  FOR DELETE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_moodboard_sections' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_moodboard_sections', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_moodboard_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_moodboard_sections_select
  ON public.architect_moodboard_sections
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_sections_insert
  ON public.architect_moodboard_sections
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_sections_update
  ON public.architect_moodboard_sections
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_sections_delete
  ON public.architect_moodboard_sections
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_moodboard_images' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_moodboard_images', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_moodboard_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_moodboard_images_select
  ON public.architect_moodboard_images
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_images_insert
  ON public.architect_moodboard_images
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_images_update
  ON public.architect_moodboard_images
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_images_delete
  ON public.architect_moodboard_images
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_moodboard_colors' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_moodboard_colors', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_moodboard_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_moodboard_colors_select
  ON public.architect_moodboard_colors
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_colors_insert
  ON public.architect_moodboard_colors
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_colors_update
  ON public.architect_moodboard_colors
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_moodboard_colors_delete
  ON public.architect_moodboard_colors
  FOR DELETE
  USING (has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_opportunities' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_opportunities', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_opportunities_select
  ON public.architect_opportunities
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE p.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );
CREATE POLICY architect_opportunities_insert
  ON public.architect_opportunities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE p.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );
CREATE POLICY architect_opportunities_update
  ON public.architect_opportunities
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
CREATE POLICY architect_opportunities_delete
  ON public.architect_opportunities
  FOR DELETE
  USING (created_by = auth.uid());

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_pipeline_statuses' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_pipeline_statuses', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_pipeline_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_pipeline_statuses_select
  ON public.architect_pipeline_statuses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY architect_pipeline_statuses_insert
  ON public.architect_pipeline_statuses
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY architect_pipeline_statuses_update
  ON public.architect_pipeline_statuses
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));
CREATE POLICY architect_pipeline_statuses_delete
  ON public.architect_pipeline_statuses
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_site_diary' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_site_diary', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_site_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_site_diary_select
  ON public.architect_site_diary
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_site_diary_insert
  ON public.architect_site_diary
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_site_diary_update
  ON public.architect_site_diary
  FOR UPDATE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));
CREATE POLICY architect_site_diary_delete
  ON public.architect_site_diary
  FOR DELETE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_tasks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_tasks', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_tasks_select
  ON public.architect_tasks
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_tasks_insert
  ON public.architect_tasks
  FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id));
CREATE POLICY architect_tasks_update
  ON public.architect_tasks
  FOR UPDATE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));
CREATE POLICY architect_tasks_delete
  ON public.architect_tasks
  FOR DELETE
  USING (created_by = auth.uid() OR has_project_admin_access(auth.uid(), project_id));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='architect_task_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.architect_task_comments', r.policyname);
  END LOOP;
END $$;
ALTER TABLE public.architect_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY architect_task_comments_select
  ON public.architect_task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM architect_tasks at
      WHERE at.id = architect_task_comments.task_id
        AND has_project_access(auth.uid(), at.project_id)
    )
  );
CREATE POLICY architect_task_comments_insert
  ON public.architect_task_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM architect_tasks at
      WHERE at.id = architect_task_comments.task_id
        AND has_project_access(auth.uid(), at.project_id)
    )
    AND user_id = auth.uid()
  );
CREATE POLICY architect_task_comments_update
  ON public.architect_task_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY architect_task_comments_delete
  ON public.architect_task_comments
  FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

COMMIT;
