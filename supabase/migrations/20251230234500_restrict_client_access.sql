-- Migration to restrict client access and cleanup project RLS policies
-- Created at 2025-12-30 23:45

-- 1. Remove unintended project access for specific user (Alex Macedo (CLI))
-- Project: Complexo Residencial - Fase 1 (0f3e4962-92e7-43dd-aac3-d580c47ba620)
-- User: 1dba5c8a-7780-4dd2-a812-b29c4e22b556 (Alex Macedo (CLI))
DELETE FROM public.project_team_members 
WHERE user_id = '1dba5c8a-7780-4dd2-a812-b29c4e22b556' 
  AND project_id = '0f3e4962-92e7-43dd-aac3-d580c47ba620';

-- also check for Edifício Comercial Centro (89c7cd94-1d02-46d6-a25c-d246bf187fab)
DELETE FROM public.project_team_members 
WHERE user_id = '1dba5c8a-7780-4dd2-a812-b29c4e22b556' 
  AND project_id = '89c7cd94-1d02-46d6-a25c-d246bf187fab';

-- 2. Drop redundant and overly permissive policies on projects table
DROP POLICY IF EXISTS "Project owners can insert projects" ON public.projects;
DROP POLICY IF EXISTS "project_scoped_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "project_scoped_update_projects" ON public.projects;
DROP POLICY IF EXISTS "project_scoped_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "project_scoped_delete_projects" ON public.projects;

-- 3. Ensure INSERT and UPDATE are restricted to appropriate roles
-- These policies already exist and are restricted to admin/project_manager:
-- "Admins and PMs can create projects" (INSERT)
-- "Admins can insert records" (INSERT)
-- "Project admins can update projects" (UPDATE)
-- "Project managers can update projects" (UPDATE)

-- 4. Keep SELECT policies as they are (they use has_project_access which is correct)
-- "Users can view accessible projects"
-- "Project members can view projects"
-- "project_scoped_select_projects"
