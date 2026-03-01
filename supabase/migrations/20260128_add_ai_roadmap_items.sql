-- Migration: add AI site diary / migration work items to roadmap_items
-- Run as a superuser (psql connected to the target database) or using the supabase migration tooling.

BEGIN;

INSERT INTO public.roadmap_items (title, description, status, priority, category, notes, created_at)
VALUES
('Review recent commits and migration diffs', 'Inspect Git commits and migration files to identify schema changes required for AI site diary and related features.', 'backlog', 'medium', 'refinement', 'Assigned to developer', NOW()),
('Inspect DB migration changes', 'Locate and analyze SQL migration files and determine required schema changes (roadmap_items, sprints, upvotes, comments).', 'backlog', 'medium', 'refinement', 'Verify against existing migrations in supabase/migrations', NOW()),
('Prepare migration SQL', 'Prepare and test SQL migration files, include rollback statements and tests where applicable.', 'backlog', 'high', 'refinement', 'Include idempotent checks and RLS considerations', NOW()),
('Obtain remote access', 'Obtain SSH credentials and DB connection info for the Supabase Docker host to apply migrations and run verification queries.', 'backlog', 'low', 'refinement', 'Require SSH host, user, and key or DB connection string', NOW()),
('Run migration on remote Supabase', 'SSH into remote host, apply migration SQL to Supabase Postgres container, and verify schema/data.', 'backlog', 'high', 'integration', 'Run inside supabase_postgres container or use supabase CLI', NOW()),
('Insert roadmap_items tasks', 'Insert the development tasks into the `roadmap_items` table and move status from backlog→done as work completes.', 'backlog', 'medium', 'refinement', 'Will be updated to done during development', NOW()),
('Run code quality checks', 'Run linting, unit tests, and build to ensure code is clean; fix issues discovered.', 'backlog', 'high', 'refinement', 'Commands: npm run lint && npm run test:run && npm run build', NOW()),
('Create docs/todos file', 'Add documentation describing the migration steps, commands, and verification output in docs/todos.md.', 'backlog', 'low', 'refinement', 'Documentation created in repo', NOW()),
('Commit, push, and report', 'Commit migration and docs changes to the feature branch, push and create a brief report summarizing applied changes and verification.', 'backlog', 'medium', 'refinement', 'Create PR if requested', NOW())
;

COMMIT;

-- Notes:
-- 1) This migration inserts roadmap items as a convenience. If you prefer RLS compliance, run these inserts as an authenticated user or set `created_by` to a valid user id.
-- 2) To apply inside the Supabase Docker setup via SSH: `docker exec -it supabase_postgres psql -U postgres -d postgres -f /path/to/this/file.sql` (adjust container name and path as needed).
