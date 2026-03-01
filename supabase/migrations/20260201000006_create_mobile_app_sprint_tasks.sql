-- Mobile App Infrastructure Sprint Tasks
-- Sprint: 2026-05 (February 2026)

-- First, ensure sprint exists
INSERT INTO public.sprints (code, title, description, start_date, end_date, status)
VALUES (
  '2026-05',
  'Mobile App Infrastructure Sprint',
  'Core infrastructure setup for mobile app features including hooks, Edge Functions, and database schema',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '4 weeks',
  'active'
) ON CONFLICT (code) DO NOTHING;

-- Get sprint ID for reference
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
)

-- PHASE 0: Infrastructure Setup (Master Task)
INSERT INTO public.roadmap_items (
  sprint_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  'Phase 0: Infrastructure Setup (Critical Path)',
  'Setup data layer, Edge Functions, and external API integrations. This is the critical blocker for all other features.',
  'Infrastructure',
  'critical',
  'in_progress',
  40,
  CURRENT_DATE + INTERVAL '3 days',
  auth.uid()
FROM sprint_data;

-- Get the Phase 0 task ID for creating subtasks
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
),
phase_0_task AS (
  SELECT id FROM public.roadmap_items 
  WHERE sprint_id = (SELECT id FROM sprint_data)
  AND title = 'Phase 0: Infrastructure Setup (Critical Path)'
  LIMIT 1
)

-- Phase 0 Subtasks
INSERT INTO public.roadmap_items (
  sprint_id,
  parent_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  phase_0_task.id,
  task_title,
  task_desc,
  'Infrastructure',
  'critical',
  'todo',
  task_effort,
  CURRENT_DATE + INTERVAL '2 days',
  auth.uid()
FROM (
  VALUES
    ('Create TanStack Query hooks', 'Create useAnnotations, useExpenses, useProjectMessages, useDailyLogs, useRecordMeeting hooks with optimistic updates', 16),
    ('Setup Edge Functions', 'Create send-email, record-meeting, generate-ai-images, weather-forecast Edge Functions', 12),
    ('Create database migrations', 'Create tables: annotations, expenses, messages, meetings, emails, moodboard_images with RLS policies', 12)
) AS tasks(task_title, task_desc, task_effort)
CROSS JOIN sprint_data
CROSS JOIN phase_0_task;

-- PHASE 1: Critical Gaps (Master Task)
INSERT INTO public.roadmap_items (
  sprint_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  'Phase 1: Critical Gaps (High Priority)',
  'Implement annotations, live meeting controls, email sending, and expense recording',
  'Features',
  'critical',
  'todo',
  32,
  CURRENT_DATE + INTERVAL '10 days',
  auth.uid()
FROM sprint_data;

-- Get Phase 1 task ID
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
),
phase_1_task AS (
  SELECT id FROM public.roadmap_items 
  WHERE sprint_id = (SELECT id FROM sprint_data)
  AND title = 'Phase 1: Critical Gaps (High Priority)'
  LIMIT 1
)

-- Phase 1 Subtasks
INSERT INTO public.roadmap_items (
  sprint_id,
  parent_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  phase_1_task.id,
  task_title,
  task_desc,
  'Features',
  'critical',
  'backlog',
  task_effort,
  CURRENT_DATE + INTERVAL '8 days',
  auth.uid()
FROM (
  VALUES
    ('AppAnnotations - Floor Plan Integration', 'Create annotation list UI, map integration, pin placement, real-time sync', 20),
    ('AppLiveMeeting - Audio Controls', 'Implement mic toggle, recording start/stop, notes sync, finish meeting flow', 16),
    ('AppEmailReview - Send Implementation', 'Email service integration, template rendering, schedule persistence, confirmation', 12),
    ('AppFinance - Record Expense FAB', 'Expense form dialog, file upload, category selection, mutation, dashboard refresh', 8)
) AS tasks(task_title, task_desc, task_effort)
CROSS JOIN sprint_data
CROSS JOIN phase_1_task;

-- PHASE 2: Data Integration (Master Task)
INSERT INTO public.roadmap_items (
  sprint_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  'Phase 2: Data Integration & Real-Time',
  'Replace mock data with real API integration and real-time subscriptions',
  'Features',
  'high',
  'todo',
  24,
  CURRENT_DATE + INTERVAL '17 days',
  auth.uid()
FROM sprint_data;

-- Get Phase 2 task ID
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
),
phase_2_task AS (
  SELECT id FROM public.roadmap_items 
  WHERE sprint_id = (SELECT id FROM sprint_data)
  AND title = 'Phase 2: Data Integration & Real-Time'
  LIMIT 1
)

-- Phase 2 Subtasks
INSERT INTO public.roadmap_items (
  sprint_id,
  parent_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  phase_2_task.id,
  task_title,
  task_desc,
  'Features',
  'high',
  'backlog',
  task_effort,
  CURRENT_DATE + INTERVAL '15 days',
  auth.uid()
FROM (
  VALUES
    ('AppProjectChat - Real Messages', 'Query real data, Supabase subscriptions, replace mock messages, real-time updates', 8),
    ('AppDashboard - Real Stats', 'Real expense totals, task metrics, progress percentages from live data', 6),
    ('AppDailyLog - Weather & Real Entries', 'Weather API integration, real log queries, photo associations, add entry FAB', 10)
) AS tasks(task_title, task_desc, task_effort)
CROSS JOIN sprint_data
CROSS JOIN phase_2_task;

-- PHASE 3: Advanced Features (Master Task)
INSERT INTO public.roadmap_items (
  sprint_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  'Phase 3: Advanced Features',
  'Implement AI image generation, interactive floor plans, contact management, and PDF reports',
  'Features',
  'high',
  'todo',
  32,
  CURRENT_DATE + INTERVAL '24 days',
  auth.uid()
FROM sprint_data;

-- Get Phase 3 task ID
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
),
phase_3_task AS (
  SELECT id FROM public.roadmap_items 
  WHERE sprint_id = (SELECT id FROM sprint_data)
  AND title = 'Phase 3: Advanced Features'
  LIMIT 1
)

-- Phase 3 Subtasks
INSERT INTO public.roadmap_items (
  sprint_id,
  parent_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  phase_3_task.id,
  task_title,
  task_desc,
  'Features',
  'high',
  'backlog',
  task_effort,
  CURRENT_DATE + INTERVAL '22 days',
  auth.uid()
FROM (
  VALUES
    ('AppMoodboard - AI Image Generation', 'AI API integration (Replicate/Stability), generate button, gallery display, tag filtering', 16),
    ('AppFloorPlan - Interactive Annotations', 'Canvas drawing, layer management, measurements, pin annotations, persistence', 20),
    ('AppContacts & AppBranding', 'Add/edit contact forms, delete with confirmation, color picker UI, settings save', 8)
) AS tasks(task_title, task_desc, task_effort)
CROSS JOIN sprint_data
CROSS JOIN phase_3_task;

-- PHASE 4: Polish & Testing (Master Task)
INSERT INTO public.roadmap_items (
  sprint_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  'Phase 4: Polish & Testing',
  'E2E tests, accessibility audit, performance optimization, UI refinement',
  'Quality',
  'high',
  'todo',
  20,
  CURRENT_DATE + INTERVAL '28 days',
  auth.uid()
FROM sprint_data;

-- Get Phase 4 task ID
WITH sprint_data AS (
  SELECT id FROM public.sprints WHERE code = '2026-05' LIMIT 1
),
phase_4_task AS (
  SELECT id FROM public.roadmap_items 
  WHERE sprint_id = (SELECT id FROM sprint_data)
  AND title = 'Phase 4: Polish & Testing'
  LIMIT 1
)

-- Phase 4 Subtasks
INSERT INTO public.roadmap_items (
  sprint_id,
  parent_id,
  title,
  description,
  category,
  priority,
  status,
  estimated_effort,
  due_date,
  created_by
)
SELECT
  sprint_data.id,
  phase_4_task.id,
  task_title,
  task_desc,
  'Quality',
  'high',
  'backlog',
  task_effort,
  CURRENT_DATE + INTERVAL '26 days',
  auth.uid()
FROM (
  VALUES
    ('E2E Testing - Core Workflows', 'Test add task, expense, annotation, message flows using agent-browser', 12),
    ('Accessibility & Performance', 'Keyboard navigation, ARIA labels, image lazy loading, bundle optimization', 8)
) AS tasks(task_title, task_desc, task_effort)
CROSS JOIN sprint_data
CROSS JOIN phase_4_task;

COMMIT;
