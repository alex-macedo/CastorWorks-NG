-- Fix check_global_admin_support_user trigger: was querying user_profiles.id
-- (surrogate PK, gen_random_uuid()) instead of user_profiles.user_id (auth FK).
-- The wrong column made the EXISTS check always false for every user.

CREATE OR REPLACE FUNCTION public.check_global_admin_support_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IN ('global_admin', 'super_admin', 'platform_owner', 'platform_support', 'platform_sales') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = NEW.user_id   -- was: id = NEW.user_id (wrong column)
        AND is_support_user = TRUE
    ) THEN
      RAISE EXCEPTION '% role can only be assigned to support users. User must have is_support_user = TRUE in user_profiles.', NEW.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
