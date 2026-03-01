-- Financial Module Phase 2b: Collection Orchestrator - Sprint Setup
-- Sprint 2026-06 (Week 3: Feb 15-22, 2026)
--
-- This migration creates Sprint 2026-06 and 7 roadmap items for Phase 2b

BEGIN;

-- ============================================================
-- Step 1: Create Sprint 2026-06
-- ============================================================

INSERT INTO public.sprints (sprint_identifier, year, week_number, title, description, start_date, end_date, status)
VALUES (
  '2026-06',
  2026,
  6,
  'Sprint 2026-06: Financial Module Phase 2b',
  E'# Sprint 2026-06: Collection Orchestrator

## Overview
Phase 2b delivers automated collections workflows with multi-channel communication (email, WhatsApp, SMS) and AI-powered priority scoring.

## Key Features
- Collection sequence configuration (6-step workflows)
- Email/WhatsApp/SMS integration
- Priority scoring algorithm (0-100 score)
- Collections Dashboard UI
- Automated follow-up execution

## Deliverables
1. Database Schema: financial_collection_sequences, financial_collection_actions
2. Edge Function: trigger-collection-actions
3. Priority Scoring Algorithm: score_collection_priority()
4. Collections Dashboard: Collections workspace with priority queue
5. Email/WhatsApp Templates
6. E2E Test Suite

## Success Metrics
- 1,000+ overdue invoices processed in <10 seconds
- 6-step automated sequences executing on schedule
- Priority queue visible in Collections Dashboard
- Email/WhatsApp integration working

## Timeline
- Week 3: Feb 15-22, 2026
- Dependencies: Phase 2a (Cashflow Forecast) complete
- Follows: Phase 2a (Sprint 2026-05)
- Precedes: Phase 2c (Reconciliation Assistant)
  ',
  '2026-02-15',
  '2026-02-22',
  'open'
)
ON CONFLICT (sprint_identifier) DO NOTHING;

-- ============================================================
-- Step 2: Create Phase 2b Roadmap Items
-- ============================================================

-- P2b.0: Parent Task
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.0',
  'Phase 2b: Collection Orchestrator',
  E'# Collection Orchestrator

Parent task tracking overall Phase 2b progress.

## Sub-Tasks
- P2b.1: Database Schema (collection tables)
- P2b.2: Edge Function (sequence execution)
- P2b.3: Priority Scoring Algorithm
- P2b.4: Email/WhatsApp Integration
- P2b.5: Collections Dashboard UI
- P2b.6: E2E Test Suite

## Completion Criteria
All 6 sub-tasks completed and tested in production.
  ',
  '2026-06',
  'epic'::roadmap_item_type,
  'in_progress'::roadmap_item_status,
  'high'::roadmap_priority,
  'xlarge'::roadmap_effort,
  '2026-02-15',
  '2026-02-22',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.1: Database Schema
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.1',
  'Database Schema: Collection Tables',
  E'# Database Schema

Create two tables for collection orchestration:

## Tables
1. **financial_collection_sequences**
   - Workflow definitions (6-step default sequence)
   - JSONB steps array with triggers and actions
   - Company-scoped configuration

2. **financial_collection_actions**
   - Execution tracking for individual actions
   - Status: pending → scheduled → sent → delivered/failed
   - Metrics: opened_at, clicked_at, replied_at

## Deliverables
- Migration file: 20260209_add_collection_tables.sql
- RLS policies for project access
- Indexes for performance
- Helper function: schedule_collection_actions()
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'high'::roadmap_priority,
  'medium'::roadmap_effort,
  '2026-02-15',
  '2026-02-16',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.2: Edge Function
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.2',
  'Edge Function: Collection Sequence Execution',
  E'# Collection Sequence Execution

Edge Function to trigger and execute collection sequences.

## Endpoint
POST /functions/v1/trigger-collection-actions

## Request
{
  "invoice_id": "uuid",        // Optional: specific invoice
  "dry_run": false             // Optional: preview without sending
}

## Functionality
- Query overdue invoices (status in [''overdue'', ''partial''])
- Match invoices to collection sequences
- Schedule actions based on days overdue
- Send emails/WhatsApp messages via integrations
- Create manual tasks for escalations

## Performance
- Process 1,000+ invoices in <10 seconds
- Batch send emails/messages within 5 minutes

## Deliverables
- Edge Function file: trigger-collection-actions/index.ts
- Integration with SendGrid (email)
- Integration with Twilio (WhatsApp/SMS)
- Error handling and retry logic
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'high'::roadmap_priority,
  'large'::roadmap_effort,
  '2026-02-16',
  '2026-02-18',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.3: Priority Scoring Algorithm
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.3',
  'Priority Scoring Algorithm',
  E'# Collection Priority Scoring

Algorithm to rank overdue invoices by collection priority (0-100 score).

## Factors
- **Amount Overdue**: Higher amount = higher priority (0-30 points)
- **Days Overdue**: More days = higher priority (0-25 points)
- **Customer Payment History**: % on-time payments (0-20 points)
- **Customer Relationship Value**: Lifetime revenue (0-15 points)
- **Late Payment Probability**: ML prediction from Phase 2a (0-10 points)

## Implementation
- Database function: score_collection_priority(invoice_id)
- Edge Function: GET /functions/v1/collection-priority-queue
- Returns sorted list of invoices by priority score

## Deliverables
- SQL function: score_collection_priority()
- Edge Function: collection-priority-queue/index.ts
- Unit tests for scoring logic
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'high'::roadmap_priority,
  'medium'::roadmap_effort,
  '2026-02-17',
  '2026-02-18',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.4: Email/WhatsApp Integration
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.4',
  'Email/WhatsApp Integration',
  E'# Multi-Channel Communication

Integrate SendGrid (email) and Twilio (WhatsApp/SMS) for automated collections.

## Email Integration (SendGrid)
- Template system with variable substitution
- Track opens/clicks via webhooks
- Batch sending (up to 1,000 emails)
- Bounce/spam complaint handling

## WhatsApp Integration (Twilio)
- Message templates with variable substitution
- Read receipts and delivery status
- Link shortening for payment URLs
- Media attachments (invoice PDFs)

## Templates
- Day 0: Friendly reminder
- Day 3: WhatsApp nudge
- Day 7: Formal collection notice
- Day 14: Manual task assigned
- Day 21: Escalation to management

## Deliverables
- Shared utility: _shared/sendgrid-client.ts
- Shared utility: _shared/twilio-client.ts
- Template manager: collection-templates.ts
- Webhook handlers for status updates
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'high'::roadmap_priority,
  'large'::roadmap_effort,
  '2026-02-16',
  '2026-02-19',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.5: Collections Dashboard UI
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.5',
  'Collections Dashboard UI',
  E'# Collections Dashboard

React UI for managing collection workflows and priority queue.

## Components
1. **Priority Queue Panel**
   - Table: invoice_id, customer, amount, days_overdue, priority_score
   - Sort by priority score (descending)
   - Filter by risk level, customer type
   - Manual action buttons (send now, skip, mark paid)

2. **Sequence Configuration Panel**
   - CRUD for collection sequences
   - Step builder with drag-and-drop
   - Template selector for each step
   - Test sequence button (dry run)

3. **Activity Timeline**
   - Recent collection actions (last 30 days)
   - Status indicators (sent, delivered, opened, replied)
   - Click-through rates and response rates

4. **Performance Metrics Cards**
   - Total overdue amount
   - Average days to payment
   - Response rate by channel
   - Collections success rate

## Deliverables
- Page: src/pages/FinancialCollections.tsx
- Component: src/components/Financial/CollectionPriorityQueue.tsx
- Component: src/components/Financial/CollectionSequenceBuilder.tsx
- Hook: src/hooks/useCollectionActions.ts
- i18n translations (all 4 languages)
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'high'::roadmap_priority,
  'xlarge'::roadmap_effort,
  '2026-02-18',
  '2026-02-21',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- P2b.6: E2E Test Suite
INSERT INTO public.roadmap_items (
  code,
  title,
  description,
  sprint_identifier,
  type,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  'P2b.6',
  'E2E Test Suite',
  E'# E2E Testing for Collection Orchestrator

Comprehensive Playwright tests for Phase 2b.

## Test Coverage
1. Edge Function: trigger-collection-actions (dry run and live)
2. Database: collection sequences and actions tables
3. Priority Scoring: score_collection_priority() function
4. Email Integration: SendGrid mock tests
5. WhatsApp Integration: Twilio mock tests
6. UI: Collections Dashboard rendering and interactions

## Test Scenarios
- Create/update collection sequence
- Trigger collection for overdue invoice
- Verify email/WhatsApp sent
- Check priority queue sorting
- Test manual override actions
- Verify metrics tracking

## Deliverables
- Test file: e2e/financial-collection-orchestrator-phase2b.spec.ts
- Mock SendGrid/Twilio responses
- Test data fixtures
  ',
  '2026-06',
  'task'::roadmap_item_type,
  'todo'::roadmap_item_status,
  'medium'::roadmap_priority,
  'large'::roadmap_effort,
  '2026-02-20',
  '2026-02-22',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Step 3: Verify Sprint and Tasks Created
-- ============================================================

DO $$
DECLARE
  v_sprint_exists BOOLEAN;
  v_task_count INTEGER;
BEGIN
  -- Check sprint exists
  SELECT EXISTS(
    SELECT 1 FROM public.sprints WHERE sprint_identifier = '2026-06'
  ) INTO v_sprint_exists;

  -- Count tasks
  SELECT COUNT(*) INTO v_task_count
  FROM public.roadmap_items
  WHERE sprint_identifier = '2026-06';

  -- Raise notices
  IF v_sprint_exists THEN
    RAISE NOTICE '✅ Sprint 2026-06 created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create Sprint 2026-06';
  END IF;

  IF v_task_count = 7 THEN
    RAISE NOTICE '✅ All 7 Phase 2b roadmap items created';
    RAISE NOTICE '   - P2b.0: Parent Task (epic)';
    RAISE NOTICE '   - P2b.1: Database Schema (medium)';
    RAISE NOTICE '   - P2b.2: Edge Function (large)';
    RAISE NOTICE '   - P2b.3: Priority Scoring (medium)';
    RAISE NOTICE '   - P2b.4: Email/WhatsApp Integration (large)';
    RAISE NOTICE '   - P2b.5: Collections Dashboard UI (xlarge)';
    RAISE NOTICE '   - P2b.6: E2E Test Suite (large)';
  ELSE
    RAISE WARNING '⚠️  Expected 7 tasks, found %', v_task_count;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- Display Sprint Summary
-- ============================================================

SELECT
  code,
  title,
  status,
  priority,
  estimated_effort,
  start_date,
  end_date
FROM public.roadmap_items
WHERE sprint_identifier = '2026-06'
ORDER BY code;
