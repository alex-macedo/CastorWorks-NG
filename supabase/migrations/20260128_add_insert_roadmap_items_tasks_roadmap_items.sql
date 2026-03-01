-- Migration: add 'Insert roadmap_items tasks' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_insert_roadmap_items_tasks_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Insert roadmap_items tasks',
  'Insert the development tasks into the roadmap_items table and move status from backlog→done as work completes.',
  'backlog', 'medium', 'refinement', 'Will be updated to done during development', NOW()
);

COMMIT;
