-- Migration: Create Sidebar Permissions Management Tables
-- Created: 2026-01-24
-- Description: Creates database tables for managing sidebar option and tab access by role.
--              Replaces hardcoded allowedRoles arrays with database-driven permissions.

BEGIN;

-- 1. Create sidebar_option_permissions table
CREATE TABLE IF NOT EXISTS public.sidebar_option_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (option_id, role)
);

-- 2. Create sidebar_tab_permissions table
CREATE TABLE IF NOT EXISTS public.sidebar_tab_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id TEXT NOT NULL,
  tab_id TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (option_id, tab_id, role)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sidebar_option_permissions_option_id ON public.sidebar_option_permissions(option_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_option_permissions_role ON public.sidebar_option_permissions(role);
CREATE INDEX IF NOT EXISTS idx_sidebar_tab_permissions_option_id ON public.sidebar_tab_permissions(option_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_tab_permissions_tab_id ON public.sidebar_tab_permissions(tab_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_tab_permissions_role ON public.sidebar_tab_permissions(role);

-- 4. Create trigger functions to update updated_at
CREATE OR REPLACE FUNCTION public.update_sidebar_option_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_sidebar_tab_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_sidebar_option_permissions_updated_at') THEN
    CREATE TRIGGER trigger_update_sidebar_option_permissions_updated_at
      BEFORE UPDATE ON public.sidebar_option_permissions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_sidebar_option_permissions_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_sidebar_tab_permissions_updated_at') THEN
    CREATE TRIGGER trigger_update_sidebar_tab_permissions_updated_at
      BEFORE UPDATE ON public.sidebar_tab_permissions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_sidebar_tab_permissions_updated_at();
  END IF;
END $$;

-- 6. Enable RLS on both tables
ALTER TABLE public.sidebar_option_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_tab_permissions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for sidebar_option_permissions
-- SELECT: All authenticated users can view permissions (needed for sidebar filtering)
DROP POLICY IF EXISTS "authenticated_select_sidebar_option_permissions" ON public.sidebar_option_permissions;
CREATE POLICY "authenticated_select_sidebar_option_permissions"
  ON public.sidebar_option_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Only admins can modify
DROP POLICY IF EXISTS "admin_modify_sidebar_option_permissions" ON public.sidebar_option_permissions;
CREATE POLICY "admin_modify_sidebar_option_permissions"
  ON public.sidebar_option_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS Policies for sidebar_tab_permissions
-- SELECT: All authenticated users can view permissions
DROP POLICY IF EXISTS "authenticated_select_sidebar_tab_permissions" ON public.sidebar_tab_permissions;
CREATE POLICY "authenticated_select_sidebar_tab_permissions"
  ON public.sidebar_tab_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Only admins can modify
DROP POLICY IF EXISTS "admin_modify_sidebar_tab_permissions" ON public.sidebar_tab_permissions;
CREATE POLICY "admin_modify_sidebar_tab_permissions"
  ON public.sidebar_tab_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. Create helper functions for permission checks
CREATE OR REPLACE FUNCTION public.has_sidebar_option_access(_user_id UUID, _option_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sidebar_option_permissions sop
    JOIN public.user_roles ur ON ur.role = sop.role
    WHERE sop.option_id = _option_id
      AND ur.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_sidebar_tab_access(_user_id UUID, _option_id TEXT, _tab_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sidebar_tab_permissions stp
    JOIN public.user_roles ur ON ur.role = stp.role
    WHERE stp.option_id = _option_id
      AND stp.tab_id = _tab_id
      AND ur.user_id = _user_id
  )
$$;

-- 10. Seed initial permissions from current SIDEBAR_OPTIONS configuration
-- This preserves existing permissions when migrating from hardcoded to database-driven

-- Dashboard
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('dashboard', 'admin'),
  ('dashboard', 'project_manager'),
  ('dashboard', 'site_supervisor'),
  ('dashboard', 'admin_office'),
  ('dashboard', 'viewer'),
  ('dashboard', 'accountant')
ON CONFLICT (option_id, role) DO NOTHING;

-- Management (Task Management)
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('management', 'admin'),
  ('management', 'project_manager'),
  ('management', 'site_supervisor'),
  ('management', 'admin_office')
ON CONFLICT (option_id, role) DO NOTHING;

-- CastorMind AI
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('castormind-ai', 'admin'),
  ('castormind-ai', 'project_manager'),
  ('castormind-ai', 'site_supervisor'),
  ('castormind-ai', 'admin_office'),
  ('castormind-ai', 'viewer'),
  ('castormind-ai', 'accountant')
ON CONFLICT (option_id, role) DO NOTHING;

-- Projects
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('projects', 'admin'),
  ('projects', 'project_manager'),
  ('projects', 'site_supervisor'),
  ('projects', 'admin_office')
ON CONFLICT (option_id, role) DO NOTHING;

-- Office Admin
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('office-admin', 'admin'),
  ('office-admin', 'project_manager'),
  ('office-admin', 'admin_office')
ON CONFLICT (option_id, role) DO NOTHING;

-- Templates
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('templates', 'admin'),
  ('templates', 'project_manager'),
  ('templates', 'admin_office'),
  ('templates', 'site_supervisor')
ON CONFLICT (option_id, role) DO NOTHING;

-- Architect
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('architect', 'admin'),
  ('architect', 'project_manager'),
  ('architect', 'architect')
ON CONFLICT (option_id, role) DO NOTHING;

-- Supervisor
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('supervisor', 'admin'),
  ('supervisor', 'site_supervisor')
ON CONFLICT (option_id, role) DO NOTHING;

-- Client Portal
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('client-portal', 'client'),
  ('client-portal', 'admin'),
  ('client-portal', 'project_manager')
ON CONFLICT (option_id, role) DO NOTHING;

-- Content Hub
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('content-hub', 'admin'),
  ('content-hub', 'project_manager'),
  ('content-hub', 'site_supervisor'),
  ('content-hub', 'admin_office'),
  ('content-hub', 'viewer'),
  ('content-hub', 'accountant'),
  ('content-hub', 'editor')
ON CONFLICT (option_id, role) DO NOTHING;

-- Content Hub Admin
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('content-hub-admin', 'admin'),
  ('content-hub-admin', 'editor')
ON CONFLICT (option_id, role) DO NOTHING;

-- Documentation
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('documentation', 'admin'),
  ('documentation', 'project_manager'),
  ('documentation', 'site_supervisor'),
  ('documentation', 'admin_office'),
  ('documentation', 'viewer'),
  ('documentation', 'accountant')
ON CONFLICT (option_id, role) DO NOTHING;

-- Settings
INSERT INTO public.sidebar_option_permissions (option_id, role)
VALUES 
  ('settings', 'admin')
ON CONFLICT (option_id, role) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.sidebar_option_permissions IS
  'Stores role-based access permissions for main sidebar options. Replaces hardcoded allowedRoles arrays.';

COMMENT ON TABLE public.sidebar_tab_permissions IS
  'Stores role-based access permissions for child tabs within collapsible sidebar options.';

COMMENT ON FUNCTION public.has_sidebar_option_access(UUID, TEXT) IS
  'Checks if a user has access to a sidebar option based on their roles.';

COMMENT ON FUNCTION public.has_sidebar_tab_access(UUID, TEXT, TEXT) IS
  'Checks if a user has access to a specific tab within a sidebar option based on their roles.';

COMMIT;
