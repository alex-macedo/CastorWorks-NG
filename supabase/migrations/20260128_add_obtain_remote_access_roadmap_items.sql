-- Migration: add 'Obtain remote access' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_obtain_remote_access_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Obtain remote access',
  'Obtain SSH credentials and DB connection info for the Supabase Docker host to apply migrations and run verification queries.',
  'backlog', 'low', 'refinement', 'Require SSH host, user, and key or DB connection string', NOW()
);

COMMIT;
