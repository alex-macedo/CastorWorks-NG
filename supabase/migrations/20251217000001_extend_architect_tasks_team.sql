-- Extend architect_tasks table to support team member assignment
-- This allows tasks to be assigned to non-authenticated team members via project_team_members

BEGIN;

-- Add team_member_id column to support assignment to project team members
ALTER TABLE public.architect_tasks
  ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES public.project_team_members(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_architect_tasks_team_member_id
  ON public.architect_tasks(team_member_id);

-- Add constraint to ensure only one assignee (either user OR team member, not both)
ALTER TABLE public.architect_tasks
  ADD CONSTRAINT check_single_assignee
  CHECK (
    (assignee_id IS NOT NULL AND team_member_id IS NULL) OR
    (assignee_id IS NULL AND team_member_id IS NOT NULL) OR
    (assignee_id IS NULL AND team_member_id IS NULL)
  );

-- Helper function to search for potential team members across auth users and contacts
-- Returns results in a consistent format for the UI to handle
CREATE OR REPLACE FUNCTION public.search_potential_team_members(search_email TEXT)
RETURNS TABLE (
  source TEXT,
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  -- First check auth.users via user_profiles (authenticated users)
  RETURN QUERY
  SELECT
    'auth'::TEXT as source,
    up.user_id as id,
    up.display_name as name,
    up.email as email,
    COALESCE(ur.role::TEXT, 'user') as role,
    up.avatar_url as avatar_url
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.email ILIKE search_email
  LIMIT 10;

  -- Then check contacts table (non-auth contacts)
  RETURN QUERY
  SELECT
    'contact'::TEXT as source,
    c.id,
    c.full_name as name,
    c.email as email,
    COALESCE(c.role, 'contact') as role,
    NULL::TEXT as avatar_url
  FROM public.contacts c
  WHERE c.email ILIKE search_email
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_potential_team_members(TEXT) TO authenticated;

COMMIT;
