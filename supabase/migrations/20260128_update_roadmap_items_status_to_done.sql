BEGIN;

-- Update completed roadmap_items to 'done' status
UPDATE public.roadmap_items
SET status = 'done', updated_at = NOW()
WHERE title IN (
    'Review recent commits and migration diffs',
    'Prepare migration SQL',
    'Obtain remote access',
    'Run migration on remote Supabase',
    'Insert roadmap_items tasks',
    'Run code quality checks',
    'Create docs/todos file',
    'Commit, push, and report'
);

COMMIT;