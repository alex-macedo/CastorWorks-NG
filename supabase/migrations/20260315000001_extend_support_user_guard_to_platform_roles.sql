-- Extend the is_support_user guard to super_admin and platform roles.
-- Previously only global_admin was restricted to support users.
-- super_admin, platform_owner, platform_support, and platform_sales are also
-- internal-only roles and must follow the same constraint.

CREATE OR REPLACE FUNCTION public.check_global_admin_support_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IN ('global_admin', 'super_admin', 'platform_owner', 'platform_support', 'platform_sales') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = NEW.user_id
        AND is_support_user = TRUE
    ) THEN
      RAISE EXCEPTION '% role can only be assigned to support users. User must have is_support_user = TRUE in user_profiles.', NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
