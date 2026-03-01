-- ============================================================================
-- Force Create roadmap_tasks Table
-- Created: 2025-11-20
-- Description: Ensures roadmap_tasks table exists with all required structure
-- This migration is idempotent and safe to run multiple times
-- ============================================================================

-- ============================================================================
-- 1. CREATE roadmap_phases TABLE (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roadmap_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 2. CREATE roadmap_tasks TABLE (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 3. CREATE roadmap_task_updates TABLE (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roadmap_task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.roadmap_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  update_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

-- Indexes for roadmap_phases
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_phase_number ON public.roadmap_phases(phase_number);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_status ON public.roadmap_phases(status);

-- Indexes for roadmap_tasks
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_phase_id ON public.roadmap_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_status ON public.roadmap_tasks(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_priority ON public.roadmap_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_assigned_user_id ON public.roadmap_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_category ON public.roadmap_tasks(category);

-- Indexes for roadmap_task_updates
CREATE INDEX IF NOT EXISTS idx_roadmap_task_updates_task_id ON public.roadmap_task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_task_updates_user_id ON public.roadmap_task_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_task_updates_created_at ON public.roadmap_task_updates(created_at DESC);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_task_updates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view roadmap phases" ON public.roadmap_phases;
DROP POLICY IF EXISTS "authenticated_select_roadmap_phases" ON public.roadmap_phases;
DROP POLICY IF EXISTS "Admins and PMs can manage phases" ON public.roadmap_phases;
DROP POLICY IF EXISTS "admin_pm_manage_roadmap_phases" ON public.roadmap_phases;
DROP POLICY IF EXISTS "Anyone can view roadmap tasks" ON public.roadmap_tasks;
DROP POLICY IF EXISTS "authenticated_select_roadmap_tasks" ON public.roadmap_tasks;
DROP POLICY IF EXISTS "Admins and PMs can manage tasks" ON public.roadmap_tasks;
DROP POLICY IF EXISTS "admin_pm_manage_roadmap_tasks" ON public.roadmap_tasks;
DROP POLICY IF EXISTS "Anyone can view task updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "authenticated_select_roadmap_task_updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "Authenticated users can create updates" ON public.roadmap_task_updates;

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- RLS Policies for roadmap_phases
-- NOTE: Roadmap data is intentionally shared across all authenticated users
-- as it represents product roadmap, not project-specific data
CREATE POLICY "authenticated_select_roadmap_phases"
  ON public.roadmap_phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_pm_manage_roadmap_phases" ON public.roadmap_phases;
CREATE POLICY "admin_pm_manage_roadmap_phases"
  ON public.roadmap_phases FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

-- RLS Policies for roadmap_tasks
-- NOTE: Roadmap data is intentionally shared across all authenticated users
-- as it represents product roadmap, not project-specific data
CREATE POLICY "authenticated_select_roadmap_tasks"
  ON public.roadmap_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_pm_manage_roadmap_tasks" ON public.roadmap_tasks;
CREATE POLICY "admin_pm_manage_roadmap_tasks"
  ON public.roadmap_tasks FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

-- RLS Policies for roadmap_task_updates
-- NOTE: Roadmap data is intentionally shared across all authenticated users
-- as it represents product roadmap, not project-specific data
-- This policy allows all authenticated users with valid profiles to view updates
CREATE POLICY "authenticated_select_roadmap_task_updates"
  ON public.roadmap_task_updates FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create updates"
  ON public.roadmap_task_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 8. CREATE/FETCH update_updated_at_column FUNCTION (if needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CREATE TRIGGERS FOR updated_at
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_roadmap_phases_updated_at ON public.roadmap_phases;
DROP TRIGGER IF EXISTS update_roadmap_tasks_updated_at ON public.roadmap_tasks;

-- Create triggers
CREATE TRIGGER update_roadmap_phases_updated_at
  BEFORE UPDATE ON public.roadmap_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmap_tasks_updated_at
  BEFORE UPDATE ON public.roadmap_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.roadmap_phases IS 'Project roadmap phases for organizing tasks';
COMMENT ON TABLE public.roadmap_tasks IS 'Tasks associated with roadmap phases';
COMMENT ON TABLE public.roadmap_task_updates IS 'Audit trail for roadmap task updates';

COMMENT ON COLUMN public.roadmap_tasks.phase_id IS 'Reference to the roadmap phase this task belongs to';
COMMENT ON COLUMN public.roadmap_tasks.status IS 'Task status: not_started, in_progress, completed, blocked';
COMMENT ON COLUMN public.roadmap_tasks.priority IS 'Task priority: low, medium, high, critical';
COMMENT ON COLUMN public.roadmap_tasks.completion_percentage IS 'Task completion percentage (0-100)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'roadmap_tasks'
  ) THEN
    RAISE EXCEPTION 'Failed to create roadmap_tasks table';
  END IF;
  
  RAISE NOTICE '✅ roadmap_tasks table created successfully';
END $$;
