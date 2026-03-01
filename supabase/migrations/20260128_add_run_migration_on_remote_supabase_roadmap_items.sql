-- Migration: add 'Run migration on remote Supabase' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_run_migration_on_remote_supabase_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Run migration on remote Supabase',
  'SSH into remote host, apply migration SQL to Supabase Postgres container, and verify schema/data.',
  'backlog', 'high', 'integration', 'Run inside supabase_postgres container or use supabase CLI', NOW()
);

COMMIT;
