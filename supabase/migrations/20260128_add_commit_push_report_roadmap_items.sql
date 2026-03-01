-- Migration: add 'Commit, push, and report' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_commit_push_report_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Commit, push, and report',
  'Commit migration and docs changes to the feature branch, push and create a brief report summarizing applied changes and verification.',
  'backlog', 'medium', 'refinement', 'Create PR if requested', NOW()
);

COMMIT;
