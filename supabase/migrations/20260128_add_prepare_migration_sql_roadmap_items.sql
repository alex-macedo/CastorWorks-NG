-- Migration: add 'Prepare migration SQL' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_prepare_migration_sql_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Prepare migration SQL',
  'Prepare and test SQL migration files, include rollback statements and tests where applicable.',
  'backlog', 'high', 'refinement', 'Include idempotent checks and RLS considerations', NOW()
);

COMMIT;
