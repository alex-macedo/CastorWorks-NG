-- Migration: add 'Review recent commits and migration diffs' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_review_commits_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Review recent commits and migration diffs',
  'Inspect Git commits and migration files to identify schema changes required for AI site diary and related features.',
  'backlog', 'medium', 'refinement', 'Assigned to developer', NOW()
);

COMMIT;
