-- Phase 0: Create Roadmap Tracking Tables

-- Create roadmap_phases table
CREATE TABLE IF NOT EXISTS roadmap_phases (
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

-- Create roadmap_tasks table
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES roadmap_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_user_id UUID REFERENCES auth.users(id),
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roadmap_task_updates table for audit trail
CREATE TABLE IF NOT EXISTS roadmap_task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  update_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_task_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_phases (authenticated users can view public roadmap)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_phases' AND policyname = 'authenticated_select_roadmap_phases'
  ) THEN
    CREATE POLICY "authenticated_select_roadmap_phases"
      ON roadmap_phases FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_phases' AND policyname = 'admin_pm_manage_phases'
  ) THEN
    CREATE POLICY "admin_pm_manage_phases"
      ON roadmap_phases FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

-- RLS Policies for roadmap_tasks (authenticated users can view public roadmap)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_tasks' AND policyname = 'authenticated_select_roadmap_tasks'
  ) THEN
    CREATE POLICY "authenticated_select_roadmap_tasks"
      ON roadmap_tasks FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_tasks' AND policyname = 'admin_pm_manage_tasks'
  ) THEN
    CREATE POLICY "admin_pm_manage_tasks"
      ON roadmap_tasks FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

-- RLS Policies for roadmap_task_updates (authenticated users can view and create updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_task_updates' AND policyname = 'authenticated_select_task_updates'
  ) THEN
    CREATE POLICY "authenticated_select_task_updates"
      ON roadmap_task_updates FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roadmap_task_updates' AND policyname = 'authenticated_insert_task_updates'
  ) THEN
    CREATE POLICY "authenticated_insert_task_updates"
      ON roadmap_task_updates FOR INSERT
      TO authenticated
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));
  END IF;
END $$;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_roadmap_phases_updated_at' AND tgrelid = 'public.roadmap_phases'::regclass
  ) THEN
    CREATE TRIGGER update_roadmap_phases_updated_at
      BEFORE UPDATE ON roadmap_phases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_roadmap_tasks_updated_at' AND tgrelid = 'public.roadmap_tasks'::regclass
  ) THEN
    CREATE TRIGGER update_roadmap_tasks_updated_at
      BEFORE UPDATE ON roadmap_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed Phase 1: Team Collaboration, Photo Documentation, Mobile PWA
INSERT INTO roadmap_phases (phase_number, phase_name, description, status)
SELECT 1, 'Team Collaboration, Photo Documentation, Mobile PWA', 'Foundation features for team collaboration, enhanced photo management, and mobile-first experience', 'active'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_phases WHERE phase_number = 1);

-- Seed Phase 2: Multi-Currency, Advanced Analytics, PDF Improvements
INSERT INTO roadmap_phases (phase_number, phase_name, description, status)
SELECT 2, 'Multi-Currency, Advanced Analytics, PDF Improvements', 'Enhanced financial capabilities with multi-currency support, profitability analytics, and professional PDF generation', 'planning'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_phases WHERE phase_number = 2);

-- Seed Phase 3: AI Insights, Advanced Scheduling, Integrations
INSERT INTO roadmap_phases (phase_number, phase_name, description, status)
SELECT 3, 'AI Insights, Advanced Scheduling, Integrations', 'AI-powered insights, advanced project scheduling with CPM, and third-party integrations', 'planning'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_phases WHERE phase_number = 3);

-- Get phase IDs for task insertion
DO $$
DECLARE
  phase1_id UUID;
  phase2_id UUID;
  phase3_id UUID;
BEGIN
  SELECT id INTO phase1_id FROM roadmap_phases WHERE phase_number = 1;
  SELECT id INTO phase2_id FROM roadmap_phases WHERE phase_number = 2;
  SELECT id INTO phase3_id FROM roadmap_phases WHERE phase_number = 3;

  -- Phase 1 Tasks
  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'User Roles System', 'Database table with app_role enum, has_role() security function, and team management UI', 'Team Collaboration', 'completed', 'high', 100, 4
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'User Roles System');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'Activity Logs', 'Activity tracking with action logging, IP addresses, and user attribution', 'Team Collaboration', 'completed', 'medium', 100, 3
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'Activity Logs');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'Enhanced Photo Gallery', 'Grid view with lightbox, batch upload, and photo categorization', 'Photo Documentation', 'not_started', 'high', 0, 4
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'Enhanced Photo Gallery');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'Photo Metadata Management', 'Database table for photo categories, captions, and display order', 'Photo Documentation', 'not_started', 'medium', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'Photo Metadata Management');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'PWA Manifest Configuration', 'Create manifest.json with app metadata and icons', 'Mobile PWA', 'not_started', 'critical', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'PWA Manifest Configuration');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'Service Worker Setup', 'Offline support with asset caching and background sync', 'Mobile PWA', 'not_started', 'critical', 0, 3
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'Service Worker Setup');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'Camera Integration', 'HTML5 camera capture for photo uploads', 'Mobile PWA', 'not_started', 'medium', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'Camera Integration');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase1_id, 'PWA Install Prompt', 'Installation guide and browser prompt trigger', 'Mobile PWA', 'not_started', 'low', 0, 1
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase1_id AND title = 'PWA Install Prompt');

  -- Phase 2 Tasks
  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Remove Hardcoded Currency References', 'Replace hardcoded BRL with dynamic currency from LocalizationContext', 'Multi-Currency', 'not_started', 'high', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Remove Hardcoded Currency References');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Currency Selector in Settings', 'User preference for default currency display', 'Multi-Currency', 'not_started', 'medium', 0, 1
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Currency Selector in Settings');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Currency Conversion Component', 'Display amounts in multiple currencies with exchange rates', 'Multi-Currency', 'not_started', 'low', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Currency Conversion Component');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Profitability Calculations', 'Gross profit, net profit, profit margin, and ROI metrics', 'Advanced Analytics', 'not_started', 'critical', 0, 3
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Profitability Calculations');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Analytics Dashboard Page', 'Comprehensive analytics with profitability charts and KPIs', 'Advanced Analytics', 'not_started', 'high', 0, 4
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Analytics Dashboard Page');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Industry Benchmarking', 'Compare project metrics to industry standards', 'Advanced Analytics', 'not_started', 'medium', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Industry Benchmarking');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'QR Code Generation in PDFs', 'Add QR codes to PDF reports for verification', 'PDF Improvements', 'not_started', 'high', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'QR Code Generation in PDFs');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Digital Signature Integration', 'Include digital signatures in PDF footers', 'PDF Improvements', 'not_started', 'medium', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Digital Signature Integration');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase2_id, 'Custom PDF Templates', 'Support for custom header/footer templates with variables', 'PDF Improvements', 'not_started', 'low', 0, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase2_id AND title = 'Custom PDF Templates');

  -- Phase 3 Tasks
  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Financial Overall Insights', 'AI-generated financial insights across all projects', 'AI Insights', 'completed', 'high', 100, 3
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Financial Overall Insights');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Budget Analysis Insights', 'AI analysis of budget performance and variances', 'AI Insights', 'completed', 'high', 100, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Budget Analysis Insights');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Materials Insights', 'AI insights on material costs and optimization', 'AI Insights', 'completed', 'medium', 100, 2
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Materials Insights');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Project-Specific Financial Insights', 'Detailed AI insights for individual projects', 'AI Insights', 'not_started', 'high', 0, 3
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Project-Specific Financial Insights');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Critical Path Method (CPM)', 'Automated critical path calculation with float days', 'Advanced Scheduling', 'completed', 'critical', 100, 5
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Critical Path Method (CPM)');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Resource Allocation', 'Assign resources to activities with availability tracking', 'Advanced Scheduling', 'completed', 'high', 100, 4
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Resource Allocation');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Google Drive Integration', 'Sync project documents and photos to Google Drive', 'Integrations', 'not_started', 'medium', 0, 8
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Google Drive Integration');

  INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, completion_percentage, estimated_hours)
  SELECT phase3_id, 'Integration UI Enhancements', 'User interfaces for email, WhatsApp, and calendar integrations', 'Integrations', 'not_started', 'medium', 0, 5
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_tasks WHERE phase_id = phase3_id AND title = 'Integration UI Enhancements');
END $$;
