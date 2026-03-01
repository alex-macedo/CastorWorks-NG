-- Ensure the enums we rely on exist when prior migrations have run

-- 1. Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT,
  type TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  budget_total DECIMAL(15, 2) DEFAULT 0,
  location TEXT,
  manager TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project phases table
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  status phase_status DEFAULT 'pending',
  budget_allocated DECIMAL(15, 2) DEFAULT 0,
  budget_spent DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Project budget items table
CREATE TABLE IF NOT EXISTS public.project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  budgeted_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Project financial entries table
CREATE TABLE IF NOT EXISTS public.project_financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_type entry_type NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  recipient_payer TEXT,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Project purchase requests table
CREATE TABLE IF NOT EXISTS public.project_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  priority request_priority DEFAULT 'medium',
  delivery_date DATE,
  status request_status DEFAULT 'pending',
  notes TEXT,
  total_estimated DECIMAL(15, 2) DEFAULT 0,
  total_actual DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Purchase request items table
CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.project_purchase_requests(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT,
  estimated_price DECIMAL(15, 2) DEFAULT 0,
  actual_price DECIMAL(15, 2),
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Daily logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather weather_condition,
  tasks_completed TEXT,
  workers_count INTEGER DEFAULT 0,
  equipment_used TEXT,
  materials_delivered TEXT,
  issues TEXT,
  safety_incidents TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Project team members table
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON public.project_budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_phase_id ON public.project_budget_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_project_id ON public.project_financial_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project_id ON public.project_purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_request_id ON public.purchase_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_id ON public.daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_team_members_project_id ON public.project_team_members(project_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_projects_updated_at' AND tgrelid = 'public.projects'::regclass
  ) THEN
    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_project_phases_updated_at' AND tgrelid = 'public.project_phases'::regclass
  ) THEN
    CREATE TRIGGER update_project_phases_updated_at
      BEFORE UPDATE ON public.project_phases
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_budget_items_updated_at' AND tgrelid = 'public.project_budget_items'::regclass
  ) THEN
    CREATE TRIGGER update_budget_items_updated_at
      BEFORE UPDATE ON public.project_budget_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_financial_entries_updated_at' AND tgrelid = 'public.project_financial_entries'::regclass
  ) THEN
    CREATE TRIGGER update_financial_entries_updated_at
      BEFORE UPDATE ON public.project_financial_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_purchase_requests_updated_at' AND tgrelid = 'public.project_purchase_requests'::regclass
  ) THEN
    CREATE TRIGGER update_purchase_requests_updated_at
      BEFORE UPDATE ON public.project_purchase_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_purchase_items_updated_at' AND tgrelid = 'public.purchase_request_items'::regclass
  ) THEN
    CREATE TRIGGER update_purchase_items_updated_at
      BEFORE UPDATE ON public.purchase_request_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_daily_logs_updated_at' AND tgrelid = 'public.daily_logs'::regclass
  ) THEN
    CREATE TRIGGER update_daily_logs_updated_at
      BEFORE UPDATE ON public.daily_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_team_members_updated_at' AND tgrelid = 'public.project_team_members'::regclass
  ) THEN
    CREATE TRIGGER update_team_members_updated_at
      BEFORE UPDATE ON public.project_team_members
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Project-scoped access control using has_project_access()
-- Users can only access projects they have been granted access to

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_select_projects'
  ) THEN
    CREATE POLICY "project_scoped_select_projects"
      ON public.projects FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_insert_projects'
  ) THEN
    CREATE POLICY "project_scoped_insert_projects"
      ON public.projects FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_update_projects'
  ) THEN
    CREATE POLICY "project_scoped_update_projects"
      ON public.projects FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), id))
      WITH CHECK (has_project_access(auth.uid(), id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'project_scoped_delete_projects'
  ) THEN
    CREATE POLICY "project_scoped_delete_projects"
      ON public.projects FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_select_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_select_project_phases"
      ON public.project_phases FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_insert_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_insert_project_phases"
      ON public.project_phases FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_update_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_update_project_phases"
      ON public.project_phases FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_phases' AND policyname = 'project_scoped_delete_project_phases'
  ) THEN
    CREATE POLICY "project_scoped_delete_project_phases"
      ON public.project_phases FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_select_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_select_budget_items"
      ON public.project_budget_items FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_insert_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_insert_budget_items"
      ON public.project_budget_items FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_update_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_update_budget_items"
      ON public.project_budget_items FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_scoped_delete_budget_items'
  ) THEN
    CREATE POLICY "project_scoped_delete_budget_items"
      ON public.project_budget_items FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_select_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_select_financial_entries"
      ON public.project_financial_entries FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_insert_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_insert_financial_entries"
      ON public.project_financial_entries FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_update_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_update_financial_entries"
      ON public.project_financial_entries FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_financial_entries' AND policyname = 'project_scoped_delete_financial_entries'
  ) THEN
    CREATE POLICY "project_scoped_delete_financial_entries"
      ON public.project_financial_entries FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_select_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_select_purchase_requests"
      ON public.project_purchase_requests FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_insert_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_insert_purchase_requests"
      ON public.project_purchase_requests FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_update_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_update_purchase_requests"
      ON public.project_purchase_requests FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_purchase_requests' AND policyname = 'project_scoped_delete_purchase_requests'
  ) THEN
    CREATE POLICY "project_scoped_delete_purchase_requests"
      ON public.project_purchase_requests FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'project_scoped_select_purchase_items'
  ) THEN
    CREATE POLICY "project_scoped_select_purchase_items"
      ON public.purchase_request_items FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.project_purchase_requests
        WHERE project_purchase_requests.id = purchase_request_items.request_id
        AND has_project_access(auth.uid(), project_purchase_requests.project_id)
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'project_scoped_insert_purchase_items'
  ) THEN
    CREATE POLICY "project_scoped_insert_purchase_items"
      ON public.purchase_request_items FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.project_purchase_requests
        WHERE project_purchase_requests.id = purchase_request_items.request_id
        AND has_project_access(auth.uid(), project_purchase_requests.project_id)
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'project_scoped_update_purchase_items'
  ) THEN
    CREATE POLICY "project_scoped_update_purchase_items"
      ON public.purchase_request_items FOR UPDATE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.project_purchase_requests
        WHERE project_purchase_requests.id = purchase_request_items.request_id
        AND has_project_access(auth.uid(), project_purchase_requests.project_id)
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.project_purchase_requests
        WHERE project_purchase_requests.id = purchase_request_items.request_id
        AND has_project_access(auth.uid(), project_purchase_requests.project_id)
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_request_items' AND policyname = 'project_scoped_delete_purchase_items'
  ) THEN
    CREATE POLICY "project_scoped_delete_purchase_items"
      ON public.purchase_request_items FOR DELETE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.project_purchase_requests
        WHERE project_purchase_requests.id = purchase_request_items.request_id
        AND has_project_access(auth.uid(), project_purchase_requests.project_id)
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_select_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_select_daily_logs"
      ON public.daily_logs FOR SELECT
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_insert_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_insert_daily_logs"
      ON public.daily_logs FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_update_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_update_daily_logs"
      ON public.daily_logs FOR UPDATE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))
      WITH CHECK (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_logs' AND policyname = 'project_scoped_delete_daily_logs'
  ) THEN
    CREATE POLICY "project_scoped_delete_daily_logs"
      ON public.daily_logs FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_select_team_members'
  ) THEN
    -- Avoid calling has_project_access() here because that function queries
    -- public.project_team_members; when Postgres evaluates the policy it may
    -- re-enter the same policy evaluation causing infinite recursion.
    -- Use direct checks for membership, project ownership, or admin role.
    CREATE POLICY "project_scoped_select_team_members"
      ON public.project_team_members FOR SELECT
      TO authenticated
      USING (
        -- Allow if the current user is the team member row owner
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR
        -- Allow if current user is the project owner
        EXISTS (
          SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid()
        )
        OR
        -- Allow global admins
        public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_insert_team_members'
  ) THEN
    -- For inserts, allow if the inserting user is the project owner or admin
    CREATE POLICY "project_scoped_insert_team_members"
      ON public.project_team_members FOR INSERT
      TO authenticated
      WITH CHECK (
        (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid()))
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_update_team_members'
  ) THEN
    -- For updates, allow if user is updating their own team row, project owner, or admin
    CREATE POLICY "project_scoped_update_team_members"
      ON public.project_team_members FOR UPDATE
      TO authenticated
      USING (
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        -- With check mirrors ownership/admin permission for modifications
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_team_members' AND policyname = 'project_scoped_delete_team_members'
  ) THEN
    -- For deletes, require project owner or admin
    CREATE POLICY "project_scoped_delete_team_members"
      ON public.project_team_members FOR DELETE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND p.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;
