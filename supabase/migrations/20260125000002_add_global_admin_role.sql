-- ============================================================================
-- Add Global Admin Role (Part 1/2): Enum value only
-- Migration: 20260125000002
-- Description: Add global_admin to app_role enum.
--              Must run and commit before part 2; PostgreSQL does not allow
--              using a new enum value in the same transaction that added it.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'global_admin'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE app_role ADD VALUE 'global_admin';
    END IF;
END $$;

COMMENT ON TYPE app_role IS 'Application roles: admin, project_manager, viewer, accountant, client, site_supervisor, admin_office, editor, architect, global_admin';
