-- Mobile App Development Phases - Sprint Tasks
-- Sprint: 2026-05
-- Due: 2026-02-02
-- Last Updated: 2026-02-01

BEGIN;

-- Get the sprint ID and insert tasks
DO $$
DECLARE
  v_sprint_id UUID;
BEGIN
  SELECT id INTO v_sprint_id FROM sprints WHERE sprint_identifier = '2026-05';

  IF v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Sprint 2026-05 not found';
  END IF;

  -- =============================================================
  -- PHASE 0: Foundation Infrastructure (DONE)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 0: Foundation Infrastructure - Mobile App',
    E'# Phase 0: Foundation Infrastructure\n\n## Status: ✅ COMPLETE\n\n## Deliverables\n- ✅ 5 Core hooks: useAnnotations, useExpenses, useProjectMessages, useDailyLogs, useRecordMeeting\n- ✅ MobileAppLayout with sidebar and bottom nav\n- ✅ AppDashboard with project selector and stats\n- ✅ AppFinance redesigned with Stitch patterns\n- ✅ Route configuration in App.tsx\n- ✅ MobileAppSidebar with full menu structure\n- ✅ 9 Working pages: Dashboard, Notifications, Chat, DailyLog, Finance, Annotations, Tasks, Weather, Meeting\n\n## Verification\n- npm run lint: PASSED\n- npm run build: PASSED',
    'done',
    'urgent',
    'feature',
    'xlarge',
    '2026-02-01'
  );

  -- =============================================================
  -- PHASE 1: Critical Gaps (IN PROGRESS)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 1: Critical Gaps - Mobile App Feature Completion',
    E'# Phase 1: Critical Gaps\n\n## Status: 🏗️ IN PROGRESS\n\n## Objective\nComplete the critical UI gaps to make the mobile app fully functional.\n\n## Completed\n- ✅ AppAnnotations: Full moodboard with AI, comments, likes, search\n- ✅ AppLiveMeeting: Timer, pulsing indicator, pause/mute, notes\n- ✅ AppNotifications: Filter tabs, date grouping, mark as read\n- ✅ AppEmailReview: Email composition with templates and recipient selection\n- ✅ AppContacts: Stakeholder directory with search, filters, quick actions\n\n## Effort: 32 hours\n\n## Dependencies\n- Phase 0 infrastructure complete ✅',
    'in_progress',
    'urgent',
    'feature',
    'xlarge',
    '2026-02-02'
  );

  -- Task 1.1: AppAnnotations (ALREADY COMPLETE from Phase 0)
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '└── P1.1: AppAnnotations - Full Moodboard UI',
    E'## Task: AppAnnotations (Moodboard)\n\n### Status: ✅ COMPLETE\n\n### Delivered Features\n- Masonry grid layout with responsive design\n- AI Concept Engine panel for image generation\n- Comment drawer for client feedback\n- Like/favorite functionality\n- Search functionality with filtering\n- Review progress header with completion tracking\n- Style presets (Realistic, 3D Render, Sketch, Blueprint)\n- Aspect ratio selection',
    'done',
    'high',
    'feature',
    'medium',
    '2026-02-02'
  );

  -- Task 1.2: AppLiveMeeting (ALREADY COMPLETE from Phase 0)
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '└── P1.2: AppLiveMeeting - Recording Timer and Controls',
    E'## Task: AppLiveMeeting Enhancement\n\n### Status: ✅ COMPLETE\n\n### Delivered Features\n- Recording timer display (MM:SS format)\n- Pulsing recording indicator with ripple animations\n- Pause/Resume/Mute buttons (UI ready)\n- Quick notes modal with save functionality\n- Whisper mode AI notifications panel\n- Agenda progress bar with time tracking\n- Live transcript placeholder UI\n- Past meetings list with history',
    'done',
    'high',
    'feature',
    'medium',
    '2026-02-02'
  );

  -- Task 1.3: AppNotifications (ALREADY COMPLETE from Phase 0)
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '└── P1.3: AppNotifications - Filtering and Grouping',
    E'## Task: AppNotifications Enhancement\n\n### Status: ✅ COMPLETE\n\n### Delivered Features\n- Filter tabs (All, Unread, Critical)\n- Notification grouping by date (Today, Yesterday)\n- Mark all as read via Clear button\n- Urgency badges (Urgent, Critical)\n- Action buttons for actionable notifications\n- Type-based icons and color coding\n- Responsive card design',
    'done',
    'medium',
    'feature',
    'medium',
    '2026-02-02'
  );

  -- Task 1.4: AppEmailReview (NEW - JUST COMPLETED)
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '└── P1.4: Create AppEmailReview - Email Composition Page',
    E'## Task: AppEmailReview Implementation\n\n### Status: ✅ COMPLETE\n\n### Delivered Features\n- Email composer with template selection\n- Report type cards (Weekly, Monthly, Milestone, Custom)\n- Recipient selection with toggle checkboxes\n- Subject and body input fields\n- Email preview dialog\n- Sent/Scheduled/Draft filtering\n- Automated dispatch card with countdown\n- Success toast notifications\n- Send with loading state',
    'done',
    'high',
    'feature',
    'large',
    '2026-02-02'
  );

  -- Task 1.5: AppContacts (NEW - JUST COMPLETED)
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '└── P1.5: Create AppContacts - Stakeholder Directory',
    E'## Task: AppContacts Implementation\n\n### Status: ✅ COMPLETE\n\n### Delivered Features\n- Contact list with search functionality\n- Filter tabs (All, Client, Contractor, Consultant, Team)\n- Contact stats summary grid\n- Quick action buttons (Call, Email, Message)\n- Contact detail modal with full info\n- Type-based color coding and badges\n- Lead indicator stars\n- Last contact tracking\n- Responsive card design',
    'done',
    'high',
    'feature',
    'medium',
    '2026-02-02'
  );

  -- =============================================================
  -- PHASE 2: DailyLog Redesign (BACKLOG)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 2: DailyLog Redesign - Stitch Pattern Implementation',
    E'# Phase 2: DailyLog Redesign\n\n## Objective\nRedesign AppDailyLog to match Stitch DailyLog.tsx reference patterns.\n\n## Scope\n- Photo carousel with camera integration\n- Activity timeline with icons and timestamps\n- Team member list with avatars\n- Action buttons (Record, Quick Note)\n- Weather/stats integration\n- Entry type categorization\n\n## Effort: 24 hours\n\n## Dependencies\n- Phase 1 complete ✅',
    'backlog',
    'high',
    'feature',
    'large',
    '2026-02-03'
  );

  -- =============================================================
  -- PHASE 3: Chat & Annotations Polish (BACKLOG)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 3: Chat & Annotations Polish',
    E'# Phase 3: Chat & Annotations Polish\n\n## Objective\nPolish AppProjectChat and AppAnnotations to production quality.\n\n## Scope\n- Real-time message updates via Supabase Realtime\n- Message reactions and threading\n- Annotation photo attachments\n- Annotation assignment workflow\n- Push notification integration\n\n## Effort: 24 hours\n\n## Dependencies\n- Phase 2 complete',
    'backlog',
    'high',
    'feature',
    'large',
    '2026-02-04'
  );

  -- =============================================================
  -- PHASE 4: LiveMeeting & AI Features (BACKLOG)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 4: LiveMeeting & AI Features',
    E'# Phase 4: LiveMeeting & AI Features\n\n## Objective\nImplement AI-powered meeting summaries and transcription.\n\n## Scope\n- Audio recording with Web Audio API\n- Transcription via Edge Function\n- AI summary generation\n- Action item extraction\n- Meeting history with search\n\n## Effort: 32 hours\n\n## Dependencies\n- Phase 3 complete',
    'backlog',
    'medium',
    'feature',
    'xlarge',
    '2026-02-05'
  );

  -- =============================================================
  -- PHASE 5: Polish & Testing (BACKLOG)
  -- =============================================================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category, estimated_effort, due_date
  ) VALUES (
    v_sprint_id,
    '📱 Phase 5: Polish, PWA & Testing',
    E'# Phase 5: Polish, PWA & Testing\n\n## Objective\nFinal polish, PWA optimization, and comprehensive testing.\n\n## Scope\n- PWA manifest and service worker\n- Offline support with IndexedDB\n- Performance optimization\n- E2E testing with agent-browser\n- i18n verification (4 languages)\n- Accessibility audit\n\n## Effort: 24 hours\n\n## Dependencies\n- Phase 4 complete',
    'backlog',
    'medium',
    'refinement',
    'large',
    '2026-02-06'
  );

  -- Update sprint task counters
  UPDATE sprints
  SET total_items = total_items + 12,
      updated_at = NOW()
  WHERE id = v_sprint_id;

  RAISE NOTICE 'Mobile App Phase 0-5 tasks created successfully in Sprint 2026-05';
END $$;

COMMIT;
