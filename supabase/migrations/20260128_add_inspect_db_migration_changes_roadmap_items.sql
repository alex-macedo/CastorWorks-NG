-- Migration: add 'Inspect DB migration changes' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_inspect_db_migration_changes_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Inspect DB migration changes',
  'Locate and analyze SQL migration files and determine required schema changes (roadmap_items, sprints, upvotes, comments).',
  'backlog', 'medium', 'refinement', 'Verify against existing migrations in supabase/migrations', NOW()
);

COMMIT;
