-- ============================================================================
-- Grant Admin Role for Seeding
-- ============================================================================
-- Migration: 20260125170000
-- Description: RPC function to grant admin role for seeding purposes
-- Uses SECURITY DEFINER to bypass RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_admin_role_for_seeding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has admin role
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Grant admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to grant admin role: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.grant_admin_role_for_seeding(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.grant_admin_role_for_seeding(UUID) IS 
  'Grants admin role to a user for seeding purposes. Uses SECURITY DEFINER to bypass RLS.';
