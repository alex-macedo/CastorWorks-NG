-- Add 'supervisor' role to app_role enum
-- Required by: Story 0.1 RLS Policy Hardening (procurement module delivery workflows)
-- Generated: 2025-11-05
-- Phase: Prerequisite for procurement RLS policies migration

-- Context: The procurement RLS policies (migration 20251104065737) reference 'supervisor'
-- role for delivery_confirmations, delivery_photos, and delivery_items access control.
-- This migration must run BEFORE the procurement RLS policies migration.

-- IMPORTANT: ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- Supabase CLI handles this automatically by extracting these statements.
-- Do NOT wrap this in BEGIN/COMMIT.

-- Add 'supervisor' value to existing app_role enum
-- Check if it already exists to make migration idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'supervisor'
    AND enumtypid = 'public.app_role'::regtype
  ) THEN
    -- Add the new enum value after 'project_manager'
    ALTER TYPE public.app_role ADD VALUE 'supervisor' AFTER 'project_manager';
  END IF;
END
$$;

-- Verification query (for manual testing):
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype ORDER BY enumsortorder;
-- Expected output: admin, project_manager, supervisor, viewer, accountant

-- Rollback notes:
-- PostgreSQL does not support removing enum values directly.
-- If rollback is needed, the entire enum must be recreated:
--
-- 1. Find all tables/columns using app_role:
--    SELECT DISTINCT
--      n.nspname as schema,
--      t.typname as enum_name,
--      c.relname as table_name,
--      a.attname as column_name
--    FROM pg_type t
--    JOIN pg_enum e ON t.oid = e.enumtypid
--    JOIN pg_attribute a ON a.atttypid = t.oid
--    JOIN pg_class c ON a.attrelid = c.oid
--    JOIN pg_namespace n ON t.typnamespace = n.oid
--    WHERE t.typname = 'app_role';
--
-- 2. Create backup migration with DROP CASCADE and recreate:
--    BEGIN;
--    -- Save existing data
--    CREATE TEMP TABLE user_roles_backup AS SELECT * FROM public.user_roles;
--    
--    -- Drop and recreate enum (removes 'supervisor')
--    DROP TYPE public.app_role CASCADE;
--    CREATE TYPE public.app_role AS ENUM ('admin', 'project_manager', 'viewer', 'accountant');
--    
--    -- Recreate dependent tables/functions
--    -- (Copy from original migrations)
--    
--    -- Restore data
--    INSERT INTO public.user_roles SELECT * FROM user_roles_backup WHERE role != 'supervisor';
--    DROP TABLE user_roles_backup;
--    COMMIT;
