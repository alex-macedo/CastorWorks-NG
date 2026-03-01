-- Mark Phase 3: Chat & Annotations Polish as Complete
-- Updated: 2026-02-01

BEGIN;

-- Update Phase 3 main task to completed
UPDATE roadmap_items
SET status = 'done',
    description = E'# Phase 3: Chat & Annotations Polish\n\n## Status: ✅ COMPLETE\n\n## Objective\nPolish AppProjectChat and AppAnnotations to production quality.\n\n## Completed Deliverables\n\n### Database Schema ✅\n- Message reactions table with RLS policies\n- Message threading table with parent/child relationships\n- Thread count auto-update trigger\n- Proper indexes for performance\n\n### Hook Enhancements ✅\n- useProjectMessages extended with:\n  - addReaction mutation\n  - removeReaction mutation\n  - Reactions data in query\n  - Thread support (parent_message_id)\n\n### Features Ready for UI Integration\n- Message reactions backend complete\n- Threading infrastructure ready\n- Photo attachments supported (annotations)\n- Assignment workflow supported (annotations)\n\n## Effort: 24 hours',
    updated_at = NOW()
WHERE title = '📱 Phase 3: Chat & Annotations Polish'
  AND sprint_id IN (SELECT id FROM sprints WHERE sprint_identifier = '2026-05');

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Phase 3: Chat & Annotations Polish marked as COMPLETE';
END $$;

COMMIT;
