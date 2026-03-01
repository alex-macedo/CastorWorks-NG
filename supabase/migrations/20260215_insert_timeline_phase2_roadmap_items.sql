-- ============================================================================
-- Insert Project Timeline Phase 2 tasks into roadmap_items
-- Sprint: 2026-08
-- Plan: docs/plans/castorworks-project-timeline-ai-updates.md
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_sprint_id UUID;
  v_count INTEGER;
BEGIN
  -- Find or create Sprint 2026-08
  SELECT id INTO v_sprint_id
  FROM sprints
  WHERE sprint_identifier = '2026-08'
  LIMIT 1;

  IF v_sprint_id IS NULL THEN
    INSERT INTO sprints (
      sprint_identifier, year, week_number, title, description,
      start_date, end_date, status
    ) VALUES (
      '2026-08', 2026, 8,
      'Sprint 2026-08: Timeline Phase 2',
      'Delay Documentation, Client Definitions, Dependencies, Cascade, Comments, Analytics',
      '2026-02-16', '2026-03-08', 'active'
    )
    RETURNING id INTO v_sprint_id;
    RAISE NOTICE 'Created Sprint 2026-08: %', v_sprint_id;
  ELSE
    RAISE NOTICE 'Found Sprint 2026-08: %', v_sprint_id;
  END IF;

  -- ============================
  -- Phase A: Delay Documentation
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-A: Delay Documentation System',
    'Structured delay documentation with root cause, responsible party, and impact tracking for milestone delays.',
    'backlog', 'high', 'feature',
    'Phase A - DB migration + hook + dialog + i18n. Highest-value addition.', NOW()),

  (v_sprint_id, 'TL2-A.1: Delay Database Migration',
    'Create milestone_delays table with enums (delay_root_cause, delay_responsible_party, delay_impact_type), RLS, and indexes.',
    'backlog', 'high', 'refinement',
    'Migration: 20260216_create_milestone_delays.sql', NOW()),

  (v_sprint_id, 'TL2-A.2: Delay Hook + UI',
    'Create useDelayDocumentation.ts hook and DelayDocumentationDialog.tsx component with shadcn Dialog + React Hook Form + Zod.',
    'backlog', 'high', 'feature',
    'Integrate into ProjectsTimelinePage.tsx and DeadlinesPanel.tsx', NOW());

  -- ============================
  -- Phase B: Client Definitions
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-B: Client Definitions Tracking',
    'Track client decisions (material selections, design approvals) with status tracking, overdue counters, and impact scores.',
    'backlog', 'high', 'feature',
    'Phase B - DB migration + hook + panel + i18n. Independent of Phase A.', NOW()),

  (v_sprint_id, 'TL2-B.1: Client Definitions Database Migration',
    'Create client_definitions table with client_definition_status enum, RLS, and indexes.',
    'backlog', 'high', 'refinement',
    'Migration: 20260217_create_client_definitions.sql', NOW()),

  (v_sprint_id, 'TL2-B.2: Client Definitions Hook + UI',
    'Create useClientDefinitions.ts hook and ClientDefinitionsPanel.tsx with status badges and follow-up logging.',
    'backlog', 'high', 'feature',
    'Add Client Definitions tab to ProjectsTimelinePage.tsx', NOW());

  -- ============================
  -- Phase C: Milestone Dependencies
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-C: Milestone Dependencies',
    'Model predecessor/successor relationships between milestones (FS, SS, FF, SF) with lag days and SVG arrows.',
    'backlog', 'medium', 'feature',
    'Phase C - DB migration + hook + dialog + SVG arrows. Enables Phase D cascade.', NOW()),

  (v_sprint_id, 'TL2-C.1: Dependencies Database Migration',
    'Create milestone_dependencies table with milestone_dependency_type enum, constraints, RLS, and indexes.',
    'backlog', 'medium', 'refinement',
    'Migration: 20260218_create_milestone_dependencies.sql', NOW()),

  (v_sprint_id, 'TL2-C.2: Dependencies Hook + SVG Arrows',
    'Create useMilestoneDependencies.ts hook, MilestoneDependencyDialog.tsx, and draw SVG arrows on timeline canvas.',
    'backlog', 'medium', 'feature',
    'Reuse UX pattern from existing DependencyDialog.tsx', NOW());

  -- ============================
  -- Phase D: Cascade Recalculation
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-D: Cascade Recalculation Engine',
    'Dependency-aware cascade: when a delay is documented, automatically shift downstream milestones via topological sort.',
    'backlog', 'high', 'feature',
    'Phase D - Depends on A+C. Modify Edge Function + add adjusted_target_date column.', NOW());

  -- ============================
  -- Phase E: Enhanced Comments
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-E: Enhanced Comments System',
    'Migrate JSONB comments to milestone_comments table with threading, attachments, and delay linkage.',
    'backlog', 'medium', 'feature',
    'Phase E - Depends on A (delay_id FK). DB migration + data migration + hook + thread UI.', NOW()),

  (v_sprint_id, 'TL2-E.1: Comments Database Migration + Data Migration',
    'Create milestone_comments table, migrate existing JSONB comment data, add RLS and indexes.',
    'backlog', 'medium', 'refinement',
    'Migration: 20260220_create_milestone_comments.sql. Includes INSERT...SELECT from JSONB.', NOW()),

  (v_sprint_id, 'TL2-E.2: Comments Thread UI',
    'Create useMilestoneComments.ts hook and MilestoneCommentsThread.tsx with reply and attachment support.',
    'backlog', 'medium', 'feature',
    'Replace window.prompt comment flow in ProjectsTimelinePage.tsx', NOW());

  -- ============================
  -- Phase F: Analytics Summary
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-F: Analytics Summary',
    'Inline analytics on timeline page: delays by root cause/party, client response time, on-time completion rate.',
    'backlog', 'medium', 'feature',
    'Phase F - Depends on A+B. Recharts bar/donut charts in collapsible card.', NOW());

  -- ============================
  -- Cross-Cutting
  -- ============================
  INSERT INTO roadmap_items (
    sprint_id, title, description, status, priority, category,
    notes, created_at
  ) VALUES
  (v_sprint_id, 'TL2-X: Phase 2 i18n + Cross-Language Testing',
    'Add all new timeline i18n keys for 4 languages (en-US, pt-BR, es-ES, fr-FR) and verify across all locales.',
    'backlog', 'medium', 'refinement',
    'delays.*, clientDefinitions.*, dependencies.*, comments.*, analytics.* keys', NOW()),

  (v_sprint_id, 'TL2-X: Phase 2 Final QA & CI Pipeline',
    'Run npm lint, validate:json, test:run, ci. Agent-browser E2E tests per phase. Cross-language verification.',
    'backlog', 'high', 'refinement',
    'Zero errors, all 4 languages, <2s load time, 100% RLS verified', NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Inserted % roadmap_items for Timeline Phase 2', v_count;
END $$;

COMMIT;
