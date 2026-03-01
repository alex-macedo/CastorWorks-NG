-- Phase 0 Mobile App Infrastructure Sprint Tasks
-- Sprint: 2026-05
-- Created: 2026-02-01

BEGIN;

-- Variables
DO $$
DECLARE
  sprint_id UUID := '85211285-d0ff-48b7-a3a0-2e76e9a7d335';
  admin_id UUID := '59211bd5-eb1c-4249-af35-1f0f853bbcea';
  phase0_id UUID;
  migration_task_id UUID;
  hooks_task_id UUID;
  edge_task_id UUID;
  components_task_id UUID;
BEGIN

  -- 1. Create Phase 0 Parent Task
  INSERT INTO roadmap_items (
    id, title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, position
  ) VALUES (
    gen_random_uuid(),
    'Phase 0: Mobile App Infrastructure',
    E'## Mobile App Infrastructure Setup\n\nCritical path infrastructure deployment for CastorWorks mobile app.\n\n### Deliverables:\n- 5 Production-Ready Hooks (useAnnotations, useExpenses, useProjectMessages, useDailyLogs, useRecordMeeting)\n- 4 Edge Function Scaffolds (send-email, record-meeting, generate-ai-images, weather-forecast)\n- Database migrations with RLS policies\n- Component integrations with real data\n\n### Key Files:\n- src/hooks/useAnnotations.tsx\n- src/hooks/useExpenses.tsx\n- src/hooks/useProjectMessages.tsx (with real-time)\n- src/hooks/useDailyLogs.tsx\n- src/hooks/useRecordMeeting.tsx\n\n### Critical Path Blocker:\nMigrations must be deployed to remote Supabase via SSH before any other work.',
    'in_progress'::roadmap_status,
    'urgent'::roadmap_priority,
    'feature'::roadmap_category,
    '2026-02-02'::DATE,
    'xlarge'::roadmap_effort,
    'See docs/PHASE_0_QUICKSTART.md for step-by-step instructions',
    sprint_id,
    admin_id,
    1
  ) RETURNING id INTO phase0_id;

  -- 2. Database Migrations Task (CRITICAL - blocks everything)
  INSERT INTO roadmap_items (
    id, title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    gen_random_uuid(),
    'Deploy database migrations via SSH',
    E'**CRITICAL PATH BLOCKER** - Must complete before any other task.\n\nDeploy 3 migration files to remote Supabase:\n1. 20260201000004_create_mobile_app_tables.sql (9 tables, RLS policies)\n2. 20260201000005_create_roadmap_tables.sql (Sprint planning)\n3. 20260201000006_create_mobile_app_sprint_tasks.sql (22 tasks)\n\nSSH Commands:\n```bash\ncd /Users/amacedo/github/CastorWorks/supabase/migrations\nscp -i ~/.ssh/castorworks_deploy 20260201000004_*.sql castorworks:/tmp/\nssh castorworks \"docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260201000004_*.sql\"\n```\n\nVerify: Check tables exist with \\dt floor_plan_annotations',
    'done'::roadmap_status,
    'urgent'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Est: 20 minutes. Blocks all other Phase 0 work.',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', phase0_id, 'type', 'parent')),
    2
  ) RETURNING id INTO migration_task_id;

  -- 3. Hook Verification Task
  INSERT INTO roadmap_items (
    id, title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    gen_random_uuid(),
    'Verify hooks import correctly',
    E'Verify all 5 production hooks import without errors:\n\n```typescript\nimport { useAnnotations } from ''@/hooks/useAnnotations''\nimport { useExpenses } from ''@/hooks/useExpenses''\nimport { useProjectMessages } from ''@/hooks/useProjectMessages''\nimport { useDailyLogs } from ''@/hooks/useDailyLogs''\nimport { useRecordMeeting } from ''@/hooks/useRecordMeeting''\n```\n\n**Expected:** No TypeScript errors, all hooks available\n**If error:** Check if migrations were applied correctly',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'small'::roadmap_effort,
    'Est: 10 minutes. Requires migrations to be complete.',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', migration_task_id, 'type', 'blocks')),
    3
  ) RETURNING id INTO hooks_task_id;

  -- 4. AppFinance Integration
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Integrate AppFinance with useExpenses hook',
    E'Update AppFinance.tsx to use real expense data:\n\n```typescript\nimport { useExpenses } from ''@/hooks/useExpenses''\n\nconst AppFinance = () => {\n  const { expenses, totalAmount, createExpense, isCreating } = useExpenses(selectedProjectId)\n  // Replace hardcoded stats with real expenses\n  // Connect FAB button to createExpense\n}\n```\n\n**Tests:**\n- Expense FAB creates real database entry\n- Total amount reflects actual expenses\n- List updates on new expense creation',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 3 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    4
  );

  -- 5. AppProjectChat Integration
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Integrate AppProjectChat with useProjectMessages hook',
    E'Update AppProjectChat.tsx to use real-time messages:\n\n```typescript\nimport { useProjectMessages } from ''@/hooks/useProjectMessages''\n\nconst AppProjectChat = () => {\n  const { messages, sendMessage, isSending } = useProjectMessages(selectedProjectId)\n  // Replace mock messages with real messages\n  // Messages now update in real-time\n}\n```\n\n**Tests:**\n- Messages appear instantly in both components\n- Real-time subscription working\n- Send message persists to database',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Real-time enabled. Part of Step 3 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    5
  );

  -- 6. AppAnnotations Integration
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Integrate AppAnnotations with useAnnotations hook',
    E'Update AppAnnotations.tsx to use real annotation data:\n\n```typescript\nimport { useAnnotations } from ''@/hooks/useAnnotations''\n\nconst AppAnnotations = () => {\n  const { annotations, createAnnotation } = useAnnotations(selectedProjectId)\n  // Stop redirecting to tasks\n  // Implement annotation UI with real data\n}\n```\n\n**Key Change:** Remove redirect behavior, implement actual annotation functionality\n\n**Tests:**\n- Annotations load from database\n- Create annotation persists\n- Page refresh retains data',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Remove redirect behavior. Part of Step 3 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    6
  );

  -- 7. AppLiveMeeting Integration
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Integrate AppLiveMeeting with useRecordMeeting hook',
    E'Update AppLiveMeeting.tsx to use real meeting data:\n\n```typescript\nimport { useRecordMeeting } from ''@/hooks/useRecordMeeting''\n\nconst AppLiveMeeting = () => {\n  const { meetings, createMeeting, updateNotes, finishMeeting } = useRecordMeeting(selectedProjectId)\n  // Wire up meeting controls to hooks\n}\n```\n\n**Tests:**\n- Create meeting starts recording\n- Notes update in real-time\n- Finish meeting saves complete record',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 3 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    7
  );

  -- 8. AppDailyLog Integration
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Integrate AppDailyLog with useDailyLogs hook',
    E'Update AppDailyLog.tsx to use real log data:\n\n```typescript\nimport { useDailyLogs } from ''@/hooks/useDailyLogs''\n\nconst AppDailyLog = () => {\n  const { logs, createLog } = useDailyLogs(selectedProjectId)\n  // Replace hardcoded logs with real data\n}\n```\n\n**Tests:**\n- Daily logs load from database\n- Create log entry persists\n- Weather data displays (after API integration)',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 3 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    8
  );

  -- 9. Edge Functions - Send Email
  INSERT INTO roadmap_items (
    id, title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    gen_random_uuid(),
    'Configure send-email Edge Function',
    E'Enable email service integration in Edge Function:\n\n**Location:** supabase/functions/send-email/index.ts\n\n**Task:** Uncomment and configure email service (SendGrid or Resend)\n\n```typescript\n// Lines 50-55: Uncomment email service integration\nconst response = await fetch(''https://api.sendgrid.com/...'', {})\n```\n\n**Requirements:**\n- API key in Supabase secrets\n- Test with dev email recipient\n- Verify email delivery',
    'backlog'::roadmap_status,
    'medium'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 5 in PHASE_0_QUICKSTART.md. Can be done incrementally.',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', migration_task_id, 'type', 'blocks')),
    9
  ) RETURNING id INTO edge_task_id;

  -- 10. Edge Functions - AI Image Generation
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Configure generate-ai-images Edge Function',
    E'Enable AI image generation in Edge Function:\n\n**Location:** supabase/functions/generate-ai-images/index.ts\n\n**Task:** Implement Replicate or Stability API integration\n\n```typescript\n// Lines 40-50: Call Replicate API\n```\n\n**Requirements:**\n- Replicate or Stability API key\n- Handle rate limiting\n- Store generated images in Storage bucket',
    'backlog'::roadmap_status,
    'medium'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'large'::roadmap_effort,
    'Part of Step 5 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', edge_task_id, 'type', 'relates_to')),
    10
  );

  -- 11. Edge Functions - Weather Forecast
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Configure weather-forecast Edge Function',
    E'Replace mock weather data with real API:\n\n**Location:** supabase/functions/weather-forecast/index.ts\n\n**Task:** Implement OpenWeatherMap API integration\n\n```typescript\n// Lines 40-50: Replace mock data with real API call\n```\n\n**Requirements:**\n- OpenWeatherMap API key\n- Cache weather data (15-30 min TTL)\n- Handle location from project address',
    'backlog'::roadmap_status,
    'medium'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 5 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', edge_task_id, 'type', 'relates_to')),
    11
  );

  -- 12. Edge Functions - Record Meeting
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Configure record-meeting Edge Function',
    E'Complete meeting recording functionality:\n\n**Location:** supabase/functions/record-meeting/index.ts\n\n**Tasks:**\n- Audio transcription service integration\n- Store recordings in Storage bucket\n- Generate meeting summaries\n\n**Requirements:**\n- Transcription API (Deepgram, AssemblyAI, or Whisper)\n- Secure storage policies\n- Meeting notes extraction',
    'backlog'::roadmap_status,
    'medium'::roadmap_priority,
    'integration'::roadmap_category,
    '2026-02-02'::DATE,
    'large'::roadmap_effort,
    'Part of Step 5 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', edge_task_id, 'type', 'relates_to')),
    12
  );

  -- 13. Manual Testing Checklist
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Execute manual testing checklist',
    E'Complete Phase 0 testing verification:\n\n**Environment:** http://localhost:5173\n\n**Checklist:**\n- [ ] Navigate to /app/finance - FAB creates expense\n- [ ] Navigate to /app/chat - Messages appear real-time\n- [ ] Check browser console - No ''Table does not exist'' errors\n- [ ] Check browser console - No ''has_project_access not defined'' errors\n- [ ] Refresh pages - Data persists\n- [ ] Test with valid project ID\n\n**Commands:**\n```bash\n./castorworks.sh start\n# Navigate and test manually\n```',
    'backlog'::roadmap_status,
    'high'::roadmap_priority,
    'refinement'::roadmap_category,
    '2026-02-02'::DATE,
    'medium'::roadmap_effort,
    'Part of Step 4 in PHASE_0_QUICKSTART.md',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', hooks_task_id, 'type', 'blocks')),
    13
  );

  -- 14. Documentation Review
  INSERT INTO roadmap_items (
    title, description, status, priority, category,
    due_date, estimated_effort, notes, sprint_id, created_by, dependencies, position
  ) VALUES (
    'Review and update Phase 0 documentation',
    E'Ensure all documentation is accurate:\n\n**Files to review:**\n- docs/MOBILE_APP_INFRASTRUCTURE.md\n- docs/MOBILE_APP_PHASE0_DELIVERABLES.md\n- PHASE_0_QUICKSTART.md\n\n**Tasks:**\n- Update progress tracking checklist\n- Document any issues encountered\n- Note any deviations from original plan\n- Prepare handoff for Phase 1',
    'backlog'::roadmap_status,
    'low'::roadmap_priority,
    'refinement'::roadmap_category,
    '2026-02-02'::DATE,
    'small'::roadmap_effort,
    'Final task before Phase 1',
    sprint_id,
    admin_id,
    jsonb_build_array(jsonb_build_object('id', phase0_id, 'type', 'parent')),
    14
  );

  RAISE NOTICE 'Successfully created Phase 0 tasks. Phase ID: %', phase0_id;

END $$;

-- Update sprint total_items count
UPDATE sprints
SET total_items = (SELECT COUNT(*) FROM roadmap_items WHERE sprint_id = '85211285-d0ff-48b7-a3a0-2e76e9a7d335'),
    completed_items = (SELECT COUNT(*) FROM roadmap_items WHERE sprint_id = '85211285-d0ff-48b7-a3a0-2e76e9a7d335' AND status = 'done')
WHERE id = '85211285-d0ff-48b7-a3a0-2e76e9a7d335';

COMMIT;
