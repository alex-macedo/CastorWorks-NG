-- =====================================================
-- SECURITY FIX: Restrict ALL tables to authenticated users
-- =====================================================

-- DROP all public "Anyone can..." policies and replace with authenticated-only policies

-- 1. CLIENTS TABLE
DROP POLICY IF EXISTS "Anyone can view clients" ON clients;
DROP POLICY IF EXISTS "Anyone can insert clients" ON clients;
DROP POLICY IF EXISTS "Anyone can update clients" ON clients;
DROP POLICY IF EXISTS "Anyone can delete clients" ON clients;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'authenticated_select_clients'
  ) THEN
    CREATE POLICY "authenticated_select_clients" ON clients
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.client_id = clients.id
          AND has_project_access(auth.uid(), p.id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'authenticated_manage_clients'
  ) THEN
    CREATE POLICY "authenticated_manage_clients" ON clients
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.client_id = clients.id
          AND has_project_access(auth.uid(), p.id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.client_id = clients.id
          AND has_project_access(auth.uid(), p.id)
        )
      );
  END IF;
END $$;

-- 2. USER_PROFILES TABLE
DROP POLICY IF EXISTS "Anyone can view user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can update user profiles" ON user_profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'authenticated_select_user_profiles'
  ) THEN
    CREATE POLICY "authenticated_select_user_profiles" ON user_profiles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_update_own_profile'
  ) THEN
    CREATE POLICY "user_update_own_profile" ON user_profiles
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_insert_own_profile'
  ) THEN
    CREATE POLICY "user_insert_own_profile" ON user_profiles
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. PROJECT_TEAM_MEMBERS TABLE
DROP POLICY IF EXISTS "Anyone can view team members" ON project_team_members;
DROP POLICY IF EXISTS "Anyone can insert team members" ON project_team_members;
DROP POLICY IF EXISTS "Anyone can update team members" ON project_team_members;
DROP POLICY IF EXISTS "Anyone can delete team members" ON project_team_members;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_select_team_members'
  ) THEN
    CREATE POLICY "project_scoped_select_team_members" ON project_team_members
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_manage_team_members'
  ) THEN
    CREATE POLICY "project_scoped_manage_team_members" ON project_team_members
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 4. SUPPLIERS TABLE
DROP POLICY IF EXISTS "Anyone can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anyone can delete suppliers" ON suppliers;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_select_suppliers'
  ) THEN
    CREATE POLICY "authenticated_select_suppliers" ON suppliers
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'authenticated_manage_suppliers'
  ) THEN
    CREATE POLICY "authenticated_manage_suppliers" ON suppliers
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 5. PROJECT_FINANCIAL_ENTRIES TABLE
DROP POLICY IF EXISTS "Anyone can view financial entries" ON project_financial_entries;
DROP POLICY IF EXISTS "Anyone can insert financial entries" ON project_financial_entries;
DROP POLICY IF EXISTS "Anyone can update financial entries" ON project_financial_entries;
DROP POLICY IF EXISTS "Anyone can delete financial entries" ON project_financial_entries;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_select_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_select_financial_entries" ON project_financial_entries
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_manage_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_manage_financial_entries" ON project_financial_entries
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 6. PROJECTS TABLE
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON projects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_select_projects'
  ) THEN
    CREATE POLICY "project_scoped_select_projects" ON projects
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_manage_projects'
  ) THEN
    CREATE POLICY "project_scoped_manage_projects" ON projects
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), id))
      WITH CHECK (has_project_access(auth.uid(), id));
  END IF;
END $$;

-- 7. ACTIVITY_LOGS TABLE
DROP POLICY IF EXISTS "Anyone can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can update activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can delete activity logs" ON activity_logs;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'project_scoped_select_activity_logs'
  ) THEN
    CREATE POLICY "project_scoped_select_activity_logs" ON activity_logs
      FOR SELECT TO authenticated
      USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'authenticated_insert_activity_logs'
  ) THEN
    CREATE POLICY "authenticated_insert_activity_logs" ON activity_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL AND (project_id IS NULL OR has_project_access(auth.uid(), project_id)));
  END IF;
END $$;

-- 8. DAILY_LOGS TABLE
DROP POLICY IF EXISTS "Anyone can view daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can insert daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can update daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Anyone can delete daily logs" ON daily_logs;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_select_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_select_daily_logs" ON daily_logs
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_manage_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_manage_daily_logs" ON daily_logs
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 9. PROJECT_PURCHASE_REQUESTS TABLE
DROP POLICY IF EXISTS "Anyone can view purchase requests" ON project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can insert purchase requests" ON project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can update purchase requests" ON project_purchase_requests;
DROP POLICY IF EXISTS "Anyone can delete purchase requests" ON project_purchase_requests;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_select_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_select_purchase_requests" ON project_purchase_requests
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_manage_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_manage_purchase_requests" ON project_purchase_requests
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 10. QUOTES TABLE
DROP POLICY IF EXISTS "Anyone can view quotes" ON quotes;
DROP POLICY IF EXISTS "Anyone can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Anyone can update quotes" ON quotes;
DROP POLICY IF EXISTS "Anyone can delete quotes" ON quotes;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'authenticated_select_quotes'
  ) THEN
    CREATE POLICY "authenticated_select_quotes" ON quotes
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'authenticated_manage_quotes'
  ) THEN
    CREATE POLICY "authenticated_manage_quotes" ON quotes
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.purchase_request_items pri
          JOIN public.project_purchase_requests ppr ON ppr.id = pri.request_id
          WHERE pri.id = quotes.purchase_request_item_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

-- 11. PROJECT_PHASES TABLE
DROP POLICY IF EXISTS "Anyone can view project phases" ON project_phases;
DROP POLICY IF EXISTS "Anyone can insert project phases" ON project_phases;
DROP POLICY IF EXISTS "Anyone can update project phases" ON project_phases;
DROP POLICY IF EXISTS "Anyone can delete project phases" ON project_phases;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_select_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_select_project_phases" ON project_phases
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_manage_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_manage_project_phases" ON project_phases
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 12. PROJECT_ACTIVITIES TABLE
DROP POLICY IF EXISTS "Anyone can view activities" ON project_activities;
DROP POLICY IF EXISTS "Anyone can insert activities" ON project_activities;
DROP POLICY IF EXISTS "Anyone can update activities" ON project_activities;
DROP POLICY IF EXISTS "Anyone can delete activities" ON project_activities;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_activities' AND policyname = 'project_scoped_select_activities'
  ) THEN
    CREATE POLICY "project_scoped_select_activities" ON project_activities
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_activities' AND policyname = 'project_scoped_manage_activities'
  ) THEN
    CREATE POLICY "project_scoped_manage_activities" ON project_activities
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 13. PURCHASE_REQUEST_ITEMS TABLE
DROP POLICY IF EXISTS "Anyone can view purchase items" ON purchase_request_items;
DROP POLICY IF EXISTS "Anyone can insert purchase items" ON purchase_request_items;
DROP POLICY IF EXISTS "Anyone can update purchase items" ON purchase_request_items;
DROP POLICY IF EXISTS "Anyone can delete purchase items" ON purchase_request_items;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'authenticated_select_purchase_items'
  ) THEN
    CREATE POLICY "authenticated_select_purchase_items" ON purchase_request_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_purchase_requests ppr
          WHERE ppr.id = request_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'authenticated_manage_purchase_items'
  ) THEN
    CREATE POLICY "authenticated_manage_purchase_items" ON purchase_request_items
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM project_purchase_requests ppr
          WHERE ppr.id = request_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM project_purchase_requests ppr
          WHERE ppr.id = request_id
          AND has_project_access(auth.uid(), ppr.project_id)
        )
      );
  END IF;
END $$;

-- 14. GENERATED_REPORTS TABLE
DROP POLICY IF EXISTS "Anyone can view reports" ON generated_reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON generated_reports;
DROP POLICY IF EXISTS "Anyone can update reports" ON generated_reports;
DROP POLICY IF EXISTS "Anyone can delete reports" ON generated_reports;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_reports' AND policyname = 'project_scoped_select_reports'
  ) THEN
    CREATE POLICY "project_scoped_select_reports" ON generated_reports
      FOR SELECT TO authenticated
      USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_reports' AND policyname = 'project_scoped_manage_reports'
  ) THEN
    CREATE POLICY "project_scoped_manage_reports" ON generated_reports
      FOR ALL TO authenticated
      USING (project_id IS NULL OR has_project_access(auth.uid(), project_id))
      WITH CHECK (project_id IS NULL OR has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 15. PROJECT_BUDGET_ITEMS TABLE
DROP POLICY IF EXISTS "Anyone can view budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Anyone can insert budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Anyone can update budget items" ON project_budget_items;
DROP POLICY IF EXISTS "Anyone can delete budget items" ON project_budget_items;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_select_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_select_budget_items" ON project_budget_items
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_manage_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_manage_budget_items" ON project_budget_items
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 16. PROJECT_MATERIALS TABLE
DROP POLICY IF EXISTS "Anyone can view materials" ON project_materials;
DROP POLICY IF EXISTS "Anyone can insert materials" ON project_materials;
DROP POLICY IF EXISTS "Anyone can update materials" ON project_materials;
DROP POLICY IF EXISTS "Anyone can delete materials" ON project_materials;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_materials' AND policyname = 'project_scoped_select_materials'
  ) THEN
    CREATE POLICY "project_scoped_select_materials" ON project_materials
      FOR SELECT TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_materials' AND policyname = 'project_scoped_manage_materials'
  ) THEN
    CREATE POLICY "project_scoped_manage_materials" ON project_materials
      FOR ALL TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 17. CALENDAR_EVENTS TABLE
DROP POLICY IF EXISTS "Anyone can view calendar events" ON calendar_events;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'project_scoped_select_calendar_events'
  ) THEN
    CREATE POLICY "project_scoped_select_calendar_events" ON calendar_events
      FOR SELECT TO authenticated
      USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));
  END IF;
END $$;

-- 18. EMAIL_NOTIFICATIONS TABLE (keep existing policies, they're already good)
-- No changes needed - already restricted to authenticated users

-- 19. COST_PREDICTIONS TABLE (keep existing policies, they're already good)
-- No changes needed - already restricted to authenticated users

-- =====================================================
-- STORAGE SECURITY FIX: Make buckets private and add RLS
-- =====================================================

-- Make storage buckets private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('client-images', 'project-images');

-- Drop any existing storage policies for these buckets
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to client images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to project images" ON storage.objects;

-- Create new authenticated-only storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can view images'
  ) THEN
    CREATE POLICY "Authenticated users can view images"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN ('client-images', 'project-images'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('client-images', 'project-images'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update images'
  ) THEN
    CREATE POLICY "Authenticated users can update images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN ('client-images', 'project-images'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete images'
  ) THEN
    CREATE POLICY "Authenticated users can delete images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id IN ('client-images', 'project-images'));
  END IF;
END $$;
