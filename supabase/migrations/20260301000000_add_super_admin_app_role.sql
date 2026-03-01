-- Phase 1 Wave 1: Add super_admin to app_role for tenant RLS bypass.
-- Must run and commit before 20260301000001; PostgreSQL does not allow
-- using a new enum value in the same transaction that added it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'super_admin'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;
