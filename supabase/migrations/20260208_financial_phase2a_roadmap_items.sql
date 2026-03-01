-- Financial Module Phase 2a: Cashflow Forecast Engine - Roadmap Items
-- Sprint: 2026-05
-- Created: 2026-02-08
--
-- This migration creates Sprint 2026-05 and Phase 2a roadmap items
-- Note: financial_cashflow_snapshots table already exists from Phase 1

BEGIN;

-- =============================================================
-- Step 1: Create Sprint 2026-05 (if not exists)
-- =============================================================

INSERT INTO public.sprints (sprint_identifier, year, week_number, title, description, start_date, end_date, status)
VALUES (
  '2026-05',
  2026,
  5,
  'Sprint 2026-05: Financial Module Phase 2a',
  E'# Sprint 2026-05: Financial Module Phase 2a - AI-Powered Financial Intelligence\n\n## Focus Areas\n- Cashflow Forecast Engine (Edge Function)\n- AI-powered financial insights\n- Automated forecasting with ML components\n\n## Timeline\n- Start: 2026-02-08\n- End: 2026-02-22\n- Duration: 2 weeks',
  '2026-02-08',
  '2026-02-22',
  'open'
)
ON CONFLICT (sprint_identifier) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =============================================================
-- Step 2: Insert Phase 2a Roadmap Items
-- =============================================================

DO $$
DECLARE
  v_sprint_id UUID;
  v_phase_2a_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Get sprint ID
  SELECT id INTO v_sprint_id FROM public.sprints WHERE sprint_identifier = '2026-05';

  IF v_sprint_id IS NULL THEN
    RAISE EXCEPTION 'Sprint 2026-05 not found';
  END IF;

  -- Get first admin user for created_by (fallback to any user if no admin)
  SELECT u.id INTO v_admin_user_id
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.role = 'admin'
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    SELECT id INTO v_admin_user_id FROM auth.users LIMIT 1;
  END IF;

  -- =============================================================
  -- PHASE 2a: Cashflow Forecast Engine (Parent Task)
  -- =============================================================
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '💰 Phase 2a: Cashflow Forecast Engine - Edge Functions Foundation',
    E'# Phase 2a: Cashflow Forecast Engine\n\n## Status: 🏗️ IN PROGRESS\n\n## Objective\nBuild AI-powered cashflow forecasting engine using Edge Functions and ML components.\n\n## Deliverables\n- ✅ Database schema (financial_cashflow_snapshots table - already exists from Phase 1)\n- ⏳ Cashflow Forecast Edge Function deployed\n- ⏳ Cron job scheduled (nightly at 2 AM)\n- ⏳ API endpoints documented\n- ⏳ E2E tests passing\n- ⏳ Cashflow Command Center UI\n\n## Technical Requirements\n- Process 500+ AR invoices + 500+ AP bills in <5 seconds\n- p95 latency <500ms for API calls\n- 90% accuracy for 30-day forecasts\n- 13-week rolling forecast updated nightly\n\n## Timeline\n- Duration: 2 weeks (Feb 8-22, 2026)\n- Resources: 1 Senior Backend Engineer, 1 ML Engineer\n\n## Dependencies\n- Phase 1 complete ✅\n- financial_ar_invoices table ✅\n- financial_ap_bills table ✅\n- financial_recurring_expenses table ✅\n- financial_cashflow_snapshots table ✅',
    'in_progress',
    'urgent',
    'feature',
    'xlarge', -- xlarge effort (40 hours)
    '2026-02-22',
    v_admin_user_id
  ) RETURNING id INTO v_phase_2a_id;

  -- Task 2a.1: Database Schema (COMPLETED - exists from Phase 1)
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.1: Database Schema - financial_cashflow_snapshots',
    E'## Task: Database Schema\n\n### Status: ✅ COMPLETE (from Phase 1)\n\n### Deliverables\n- ✅ financial_cashflow_snapshots table created\n- ✅ Columns: project_id, week_start_date, week_number, projected_inflow/outflow, balance\n- ✅ Indexes for performance (project_id, week_start_date, risk_level)\n- ✅ RLS policies with has_project_access\n- ✅ Support for weekly forecast rows\n\n### Schema Features\n- Weekly forecast rows (one row per week)\n- Risk level enumeration (low, medium, high, critical)\n- Confidence level tracking (0-100)\n- Audit trail (generated_at, generated_by)',
    'done',
    'high',
    'feature',
    'small',
    '2026-02-07',
    v_admin_user_id
  );

  -- Task 2a.2: Edge Function Implementation
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.2: Cashflow Forecast Edge Function',
    E'## Task: Implement Forecast Engine\n\n### Status: 📋 BACKLOG\n\n### Scope\n1. **Data Collection**\n   - Fetch AR invoices with due dates\n   - Fetch AP bills with payment terms\n   - Load historical payment patterns\n   - Get recurring expenses\n   - Read bank balances\n\n2. **Forecast Algorithm**\n   - 13-week rolling window\n   - Payment probability scoring\n   - Confidence decay (0.9 → 0.3)\n   - Risk level calculation\n\n3. **ML Components**\n   - Logistic regression for payment probability\n   - Seasonal adjustment factors\n   - Customer payment behavior models\n\n4. **Output Generation**\n   - Insert 13 rows (one per week)\n   - Calculate projected_inflow/outflow/balance\n   - Assign confidence_level and risk_level\n   - Store generated_by = "ai-forecast-engine"\n\n### Files\n- `supabase/functions/financial-cashflow-forecast/index.ts`\n- `supabase/functions/_shared/cashflow-ml.ts`\n\n### Performance Targets\n- <5s for 500+ invoices\n- <500ms p95 API latency\n- 90%+ accuracy (30-day window)',
    'backlog',
    'urgent',
    'feature',
    'large',
    '2026-02-15',
    v_admin_user_id
  );

  -- Task 2a.3: Cron Job Configuration
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.3: Cron Job - Nightly Forecast Updates',
    E'## Task: Configure Cron Job\n\n### Status: 📋 BACKLOG\n\n### Requirements\n- Schedule: Daily at 2:00 AM (server time)\n- Trigger: Edge Function execution\n- Scope: All active projects\n- Error handling: Retry logic + alerts\n\n### Implementation\n1. Configure pg_cron or Supabase Cron\n2. Set up job to call Edge Function\n3. Implement error notification system\n4. Add monitoring/logging\n\n### Files\n- Migration: `supabase/migrations/XXX_configure_cashflow_cron.sql`\n- Edge Function: `financial-cashflow-forecast`',
    'backlog',
    'high',
    'feature',
    'small',
    '2026-02-16',
    v_admin_user_id
  );

  -- Task 2a.4: API Documentation
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.4: API Documentation',
    E'## Task: Document API Endpoints\n\n### Status: 📋 BACKLOG\n\n### Endpoints to Document\n\n1. **POST /functions/v1/financial-cashflow-forecast**\n   - Input: `{ projectId, forecastHorizon, confidenceDecay }`\n   - Output: `{ success, weeklyForecasts[], summaryMetrics }`\n\n2. **GET /rest/v1/financial_cashflow_snapshots**\n   - Query: Filter by project_id, date range\n   - Returns: Weekly forecast rows\n\n3. **GET /rest/v1/financial_cashflow_snapshots?project_id=eq.{id}&order=week_start_date.asc**\n   - Returns: Ordered forecast for single project\n\n### Documentation Format\n- OpenAPI/Swagger specification\n- cURL examples\n- TypeScript types\n- Error codes and handling\n\n### Files\n- `docs/api/financial-cashflow-forecast.md`\n- `docs/openapi/cashflow-endpoints.yaml`',
    'backlog',
    'medium',
    'feature',
    'small',
    '2026-02-18',
    v_admin_user_id
  );

  -- Task 2a.5: E2E Tests
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.5: E2E Tests - Cashflow Forecast',
    E'## Task: Write End-to-End Tests\n\n### Status: 📋 BACKLOG\n\n### Test Coverage\n\n1. **Data Preparation Tests**\n   - Create test AR invoices (10+)\n   - Create test AP bills (10+)\n   - Seed historical payment data\n   - Set up bank account balances\n\n2. **Edge Function Tests**\n   - Test forecast generation\n   - Verify 13-week output (13 rows)\n   - Check confidence decay logic\n   - Validate risk level calculation\n\n3. **Database Tests**\n   - Verify snapshot storage (13 rows inserted)\n   - Test query performance\n   - Validate RLS policies\n\n4. **UI Integration Tests** (agent-browser)\n   - Navigate to Cashflow Command Center\n   - Verify forecast chart rendering\n   - Test risk alerts display\n   - Validate export functionality\n\n### Files\n- `e2e/financial-cashflow-forecast.spec.ts`\n- `supabase/functions/financial-cashflow-forecast/index.test.ts`\n\n### Success Criteria\n- All tests passing\n- 90%+ code coverage\n- <10s test suite execution',
    'backlog',
    'high',
    'feature',
    'medium',
    '2026-02-20',
    v_admin_user_id
  );

  -- Task 2a.6: Cashflow Command Center UI
  INSERT INTO public.roadmap_items (
    sprint_id,
    title,
    description,
    status,
    priority,
    category,
    estimated_effort,
    due_date,
    created_by
  ) VALUES (
    v_sprint_id,
    '└── P2a.6: Cashflow Command Center UI',
    E'## Task: Build Forecast Visualization UI\n\n### Status: 📋 BACKLOG\n\n### Components\n\n1. **Cashflow Chart** (Recharts)\n   - Line chart: Expected inflows (green)\n   - Line chart: Expected outflows (red)\n   - Line chart: Running balance (blue)\n   - Area chart: Confidence bands (shaded)\n   - Risk zones highlighted\n\n2. **Summary Cards**\n   - Total expected inflows (sum)\n   - Total expected outflows (sum)\n   - Net cashflow (inflows - outflows)\n   - Ending balance (final week)\n   - Weeks with negative balance (count)\n   - Max deficit amount (min balance)\n\n3. **Risk Alerts Panel**\n   - Critical weeks highlighted\n   - Shortage warnings\n   - Action recommendations\n\n4. **Forecast Controls**\n   - Horizon selector (4/8/13 weeks)\n   - Refresh button (calls Edge Function)\n   - Export to Excel/PDF\n\n### Data Source\n- Query: `SELECT * FROM financial_cashflow_snapshots WHERE project_id = ? ORDER BY week_start_date ASC LIMIT 13`\n\n### Files\n- `src/pages/Finance/CashflowCommandCenter.tsx`\n- `src/components/Financial/CashflowForecastChart.tsx`\n- `src/hooks/useCashflowForecast.ts`\n\n### i18n\n- Add translations to all 4 languages',
    'backlog',
    'high',
    'feature',
    'large',
    '2026-02-22',
    v_admin_user_id
  );

  RAISE NOTICE 'Phase 2a roadmap items created successfully in Sprint 2026-05';
  RAISE NOTICE 'Parent task ID: %', v_phase_2a_id;
  RAISE NOTICE 'Total items created: 7 (1 parent + 6 subtasks)';

END $$;

COMMIT;
