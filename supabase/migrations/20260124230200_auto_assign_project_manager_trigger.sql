-- ============================================================================
-- Auto-Assign Project Creator as Project Manager
-- Migration: 20260124230200
-- Description: 
-- Creates a database trigger that automatically assigns the project creator
-- (owner_id) as a Project Manager in project_team_members when a project is created.
-- This ensures architects and all project creators are automatically assigned
-- as project managers, regardless of how the project is created.
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION: Auto-assign project creator as project manager
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_assign_project_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_id UUID;
BEGIN
  -- Only proceed if owner_id is set
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.owner_id;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Get user display name from user_profiles, fallback to email
  SELECT COALESCE(up.display_name, au.email, au.raw_user_meta_data->>'full_name', 'Project Manager')
  INTO v_user_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.user_id = au.id
  WHERE au.id = v_user_id;

  -- Ensure we have at least an email
  IF v_user_email IS NULL THEN
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
  END IF;

  -- Insert project team member if not already exists
  -- Check first to avoid duplicates if application code also inserts
  IF NOT EXISTS (
    SELECT 1 FROM public.project_team_members
    WHERE project_id = NEW.id
    AND user_id = v_user_id
  ) THEN
    INSERT INTO public.project_team_members (
      project_id,
      user_id,
      user_name,
      email,
      role,
      title,
      is_visible_to_client,
      sort_order
    )
    VALUES (
      NEW.id,
      v_user_id,
      COALESCE(v_user_name, v_user_email, 'Project Manager'),
      v_user_email,
      'project_manager'::public.app_role,
      'Project Manager',
      true,
      0
    );
  ELSE
    -- If record exists but role is not set to project_manager, update it
    UPDATE public.project_team_members
    SET role = 'project_manager'::public.app_role,
        title = 'Project Manager'
    WHERE project_id = NEW.id
    AND user_id = v_user_id
    AND (role IS NULL OR role != 'project_manager'::public.app_role);
  END IF;

  -- Also set manager_id if it exists and is not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'manager_id'
  ) AND NEW.manager_id IS NULL THEN
    -- Update the project to set manager_id
    -- Note: We can't modify NEW.manager_id directly in AFTER trigger,
    -- so we'll do an UPDATE (this is safe because we're in the same transaction)
    UPDATE public.projects
    SET manager_id = v_user_id
    WHERE id = NEW.id AND manager_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================
-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trg_auto_assign_project_manager ON public.projects;

-- Create trigger that fires AFTER INSERT
CREATE TRIGGER trg_auto_assign_project_manager
  AFTER INSERT ON public.projects
  FOR EACH ROW
  WHEN (NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_assign_project_manager();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.auto_assign_project_manager() IS
'Automatically assigns the project creator (owner_id) as Project Manager in project_team_members when a project is created. Ensures architects and all project creators are automatically assigned as project managers.';

COMMIT;
