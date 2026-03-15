-- Add platform-team roles to app_role enum.
-- platform_owner: full access to platform workspace + customer admin + global templates
-- platform_support: Support Chat, Contacts, Forms, Task Management, Communication Log
-- platform_sales: Contacts, Campaigns, Forms, Task Management, Communication Log
-- Must run before any migration that uses the new values in the same transaction.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'platform_owner'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'platform_owner';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'platform_support'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'platform_support';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'platform_sales'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'platform_sales';
  END IF;
END $$;
