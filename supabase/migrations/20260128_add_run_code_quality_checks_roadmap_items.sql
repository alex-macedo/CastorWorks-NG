-- Migration: add 'Run code quality checks' roadmap item
-- Apply with: docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/20260128_add_run_code_quality_checks_roadmap_items.sql

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES (
  'Run code quality checks',
  'Run linting, unit tests, and build to ensure code is clean; fix issues discovered.',
  'backlog', 'high', 'refinement', 'Commands: npm run lint && npm run test:run && npm run build', NOW()
);

COMMIT;
