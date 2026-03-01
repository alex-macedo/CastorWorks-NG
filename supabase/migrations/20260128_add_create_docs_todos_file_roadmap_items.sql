-- Migration: add 'Create docs/todos file' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_create_docs_todos_file_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Create docs/todos file',
  'Add documentation describing the migration steps, commands, and verification output in docs/todos.md.',
  'backlog', 'low', 'refinement', 'Documentation created in repo', NOW()
);

COMMIT;
