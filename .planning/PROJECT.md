# CastorWorks-NG: Multi-Tenant SaaS with Tiered Licensing

## Project Identity

- **Name**: CastorWorks-NG (Next Generation)
- **Type**: Multi-tenant SaaS transformation of CastorWorks construction management platform
- **Target Market**: Brazilian construction and architecture firms (expandable to LATAM)
- **Market Size**: USD 122M (2025) → USD 345M (2034), 12.24% CAGR
- **Base Codebase**: CastorWorks v1.56.x (React 19 + Vite 7 + Supabase)

## New Supabase Database (CastorWorks-NG Backend)

CastorWorks-NG runs against a **new Supabase database**, not the current production one. The new instance is created by copying **schema and configuration/template data only** from the current database — no projects, clients, purchases, or other transactional data.

### Hosting and Access

- **Current production Supabase**: Hostinger, inside a Docker container, reachable via SSH.
- **CastorWorks-NG Supabase**: New instance on the same Hostinger server (new Docker container or new Supabase project), also accessed via SSH for migrations and ops.

**SSH and database access (same pattern as current CastorWorks):**

```bash
# SSH config (~/.ssh/config)
Host castorworks
    HostName dev.castorworks.cloud
    User root
    IdentityFile ~/.ssh/castorworks_deploy

# Copy migration/script to remote
scp -i ~/.ssh/castorworks_deploy /path/to/script.sql castorworks:/tmp/

# Run against current DB (container: supabase-db)
ssh -i ~/.ssh/castorworks_deploy castorworks \
  "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/script.sql"

# For CastorWorks-NG: use the NG container name (e.g. supabase-ng-db) once provisioned
ssh -i ~/.ssh/castorworks_deploy castorworks \
  "docker exec -i supabase-ng-db psql -U postgres -d postgres < /tmp/script.sql"
```

- **Container name (current)**: `supabase-db`
- **Container name (NG)**: To be set when provisioning (e.g. `supabase-ng-db`)
- **Database**: `postgres`, **User**: `postgres`

### Migration Strategy

1. **Provision** the new Supabase instance (new Postgres container or new Supabase stack on Hostinger).
2. **Apply full schema** on the new DB by running all migrations from `supabase/migrations/` in order (creates all tables, RLS, functions, no data).
3. **Export from current DB** only the tables listed below (configuration, templates, reference data).
4. **Transform** exports if needed (e.g. reset sequences, fix FKs that point to auth.users if re-seeding users, or leave as global/shared config).
5. **Import** into the new CastorWorks-NG database.
6. **Point** CastorWorks-NG app (`.env`) at the new Supabase URL and anon key.

No project, client, purchase, or other transactional data is copied.

### Tables to Copy (Configuration, Templates, Reference)

**Application configuration**

| Table | Purpose |
|-------|---------|
| `app_settings` | Global app settings and system preferences |
| `company_settings` | Company-level settings |
| `maintenance_settings` | Maintenance windows |
| `integration_settings` | Third-party integration config (if global) |
| `user_preferences` | Optional: only if you want default preferences; otherwise leave empty |

**Templates**

| Table | Purpose |
|-------|---------|
| `activity_templates` | Activity/schedule templates |
| `document_templates` | Document templates |
| `folder_templates` | Default folder structure for projects |
| `phase_templates` | Phase templates (e.g. Residential, Commercial) |
| `project_wbs_templates` | WBS templates |
| `project_wbs_template_items` | WBS template items |
| `budget_templates` | Budget templates |
| `budget_template_items` | Budget template line items |
| `budget_template_phases` | Budget template phases |
| `budget_template_cost_codes` | Budget template cost codes |
| `simplebudget_materials_template` | Simple budget materials template |
| `simplebudget_labor_template` | Simple budget labor template |
| `simplebudget_materials_template_meta` | Materials template metadata |
| `simplebudget_labor_template_meta` | Labor template metadata |
| `sinapi_line_items_template` | SINAPI line items template |
| `sinapi_project_template_items` | SINAPI project template items |
| `whatsapp_templates` | WhatsApp message templates (if global) |
| `evolution_message_templates` | Evolution API message templates (if used) |

**Reference / lookup data**

| Table | Purpose |
|-------|---------|
| `cost_codes` | Cost code hierarchy |
| `company_profiles` | Default or seed company profile(s) if needed for templates |
| `currencies` | Supported currencies |
| `exchange_rates` | Latest or seed exchange rates (optional) |
| `project_task_statuses` | Configurable task statuses |
| `dropdown_options` | Global dropdown options |
| `sinapi_items` | SINAPI item catalog (if small enough; otherwise load from official source) |
| INSS reference tables | `inss_rates_history`, `inss_fator_social_brackets`, `inss_category_reductions`, `inss_labor_percentages`, `inss_destination_factors`, `inss_fator_ajuste_rules`, `inss_prefab_rules`, `inss_usinados_rules` |
| `construction_cost_benchmark_*` | Benchmark reference tables (if used for defaults) |

**AI / product config**

| Table | Purpose |
|-------|---------|
| `castormind_prompt_templates` | CastorMind prompt templates |
| `castormind_tool_permissions` | AI tool permission config |
| `ai_configurations` | AI feature configuration (if global) |

**UI / permissions config**

| Table | Purpose |
|-------|---------|
| `sidebar_option_permissions` | Sidebar options and role mapping |
| `sidebar_tab_permissions` | Sidebar tabs and role mapping |
| `notification_reminder_settings` | Default reminder config (if global) |
| `financial_collection_sequences` | Default collection sequences (if global) |

**Auth-related (required for app)**

| Table | Purpose |
|-------|---------|
| `user_roles` (or equivalent) | App roles; seed default roles. Users themselves are created at runtime (signup/invite). |

**Optional / conditional**

- `seed_data_registry`: If you use it to track what was seeded; can be recreated or copied.
- Any other table that is purely “global config” or “reference” and has no project/client/purchase data.

### Data to Exclude (Do Not Copy)

- **Projects and project-related**: `projects`, `project_phases`, `project_materials`, `project_labor`, `project_budgets`, `project_photos`, `project_milestones`, `project_resources`, `project_wbs_items`, `project_wbs_nodes`, `project_inventory`, `project_deliveries`, `project_expenses`, `project_messages`, `project_team_members`, etc.
- **Clients and suppliers**: `clients`, `suppliers`, `contacts`, `client_portal_tokens`, `client_tasks`, `client_meetings`, etc.
- **Financial transactions**: `purchase_orders`, `quotes`, `financial_*` (ledger, invoices, payments, collection_actions), `recurring_expense_patterns`, etc.
- **Procurement**: `quote_expiration_notifications`, campaign/campaign_logs (transactional), etc.
- **Roadmap/sprints (tenant data)**: `roadmap_items`, `roadmap_tasks`, `sprints`, `roadmap_suggestions`, etc.
- **Content and comms**: `content_hub` (tenant content), `outbound_campaigns`, `campaign_recipients`, `evolution_messages`, `evolution_contacts`, etc.
- **Estimates, proposals, AI usage (tenant data)**: `estimates`, `proposals`, `ai_usage_logs`, `ai_chat_messages`, `voice_recordings`, `meeting_recordings`, etc.
- **Storage**: No object storage copy; buckets are recreated empty on the new instance (structure only).

### Export/Import Mechanics

- **Export**: From the **current** Hostinger container (`supabase-db`), use `pg_dump` with `--data-only` and `--table=...` for each table (or a list of tables in one run). Example:

  ```bash
  ssh castorworks "docker exec supabase-db pg_dump -U postgres -d postgres --data-only --table=app_settings --table=phase_templates ..." > config_and_templates.sql
  ```

- **Import**: After migrations have created the same tables on the **new** DB, run the data-only SQL against the new container (e.g. `supabase-ng-db`). Handle foreign keys (e.g. `created_by` → `auth.users`) by either exporting minimal auth seed or leaving those columns NULL where acceptable.
- **Order**: Export/import in dependency order (e.g. `cost_codes` before `budget_template_cost_codes`, `company_profiles` before `budget_templates` if they reference it).

### Post-migration

- CastorWorks-NG `.env` (or `.env.local`) uses the new Supabase URL and anon key for the new instance.
- Auth (signup, login) runs against the new Supabase Auth; no user accounts are copied from the old DB.
- New tenants and users are created only in the new database.

---

## Strategic Context

### What CastorWorks-NG Is

A full transformation of the existing CastorWorks platform into a production-grade multi-tenant SaaS product with:
- Strong tenant isolation at the database level (shared schema, tenant_id approach)
- Flexible module-based licensing where tiers are commercial bundles of runtime modules
- AI Action credit system with graceful degradation (never hard-blocks)
- Mobile-first PWA with on-site AI capabilities (unique market differentiator)

### What Makes CastorWorks Unique in Brazil

1. **20+ AI capabilities** across budgeting, procurement, voice, meetings, proposals, and communications
2. **Full PWA mobile app** with voice input, photo upload, and AI processing on-site
3. **Integrated WhatsApp automation** for client communication and campaign management
4. **Architect + Client + Supervisor portals** in a single platform
5. **Brazilian tax engine** (INSS de Obra, ISS, CNO, SERO, DCTFWeb)

### Competitive Landscape

| Competitor | Price Range | Strengths | Gaps CastorWorks Fills |
|-----------|------------|-----------|----------------------|
| Construflow | R$699-1,699/mo | Established, 5-15 projects | No AI, desktop-first, no mobile field app |
| Obra Prima | from R$399/mo | Named tiers (Monet, da Vinci) | Limited AI, no WhatsApp integration |
| Sienge | Custom pricing | 72 of top 100 Brazilian builders | Enterprise-only, no SMB play, complex |
| VIGHA | Tiered by users | User-count pricing | No AI, no architect portal |
| Vobi | Architecture focus | Covers arch offices + construction | Limited financial features |
| Veja Obra | Free trial | Focused on small builders | Limited feature set |

---

## Multi-Tenancy Architecture

**Reference**: The Supabase schema and multi-tenant design follow **`docs/plans/multi-tenant/multi-tenancy-best-practices.md`** (in the parent CastorWorks repo). Use that document as the authoritative reference when adding or changing tenant-related schema, RLS, or migration strategy. CastorWorks-NG was created without copying `docs/`; the file lives at `CastorWorks/docs/plans/multi-tenant/multi-tenancy-best-practices.md`.

### Approach: Shared Schema with Tenant ID

All tables share a single PostgreSQL schema. Every row that belongs to a tenant includes a `tenant_id` column. Row-Level Security (RLS) policies enforce isolation at the database level.

**Why this approach (over alternatives):**
- Schema-per-tenant creates massive operational overhead at scale (100+ tenants = 100+ schemas to migrate)
- Database-per-tenant is overkill for this market segment and increases infrastructure costs 10x
- Shared schema with tenant_id is the industry standard for B2B SaaS (Notion, Linear, Figma all use this pattern)

### Core Tenant Infrastructure

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,     -- subdomain/URL identifier
  subscription_tier_id VARCHAR(50) REFERENCES subscription_tiers(id),
  status VARCHAR(20) DEFAULT 'trial',    -- trial, active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,
  max_projects INT DEFAULT 1,
  max_users INT DEFAULT 3,
  max_storage_gb INT DEFAULT 5,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenant_users (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  is_owner BOOLEAN DEFAULT false,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, user_id)
);
```

### Tenant Isolation Enforcement

**Database level** -- RLS policies on every table:
```sql
CREATE POLICY "tenant_isolation" ON projects
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Application level** -- `TenantContext.tsx` sets tenant on every request:
```typescript
// Sets Supabase session variable for RLS enforcement
await supabase.rpc('set_tenant_context', { tenant_id: currentTenant.id })
```

**Edge Functions** -- `_shared/authorization.ts` extended with tenant verification:
```typescript
const tenantId = await verifyTenantAccess(supabase, userId, requestedTenantId)
if (!tenantId) return new Response('Forbidden', { status: 403 })
```

**Storage** -- Bucket policies include tenant_id path prefix:
```
architect-moodboards/{tenant_id}/{project_id}/{filename}
```

---

## Licensing Architecture

### Design Principle: Tiers Are Marketing, Modules Are Engineering

The system has two layers:
- **Tiers** = commercial packages customers see on the pricing page
- **Modules** = granular feature gates the code enforces at runtime

All runtime permission checks operate on **modules, never tier names**. Tiers resolve to a set of modules when a subscription is created. Super admins can override individual modules per tenant for custom deals.

### Module Inventory (~25 modules)

#### Core (Always Included)
| Module ID | Description |
|-----------|-------------|
| `core` | Dashboard, Projects, Settings, Contacts |

#### Functional Modules
| Module ID | Description |
|-----------|-------------|
| `financial_basic` | Per-project P&L, budget view |
| `financial_full` | Ledger, cashflow, AR/AP, collections, budget control |
| `procurement` | POs, purchase requests, quotes, approvals, suppliers |
| `schedule_basic` | Timeline view, milestones |
| `schedule_full` | Gantt, critical path, EVM, scenarios |
| `roadmap` | Kanban, task management |
| `reports` | Project status, budget vs actual, PDF export |
| `campaigns` | Email/WhatsApp campaigns |
| `forms` | Form builder, distribution, analytics |
| `content_hub` | News, articles, FAQ, documents |
| `templates` | Budget, WBS, phase, material templates |

#### Portal Modules
| Module ID | Description |
|-----------|-------------|
| `architect_portal` | Full architect experience |
| `client_portal` | Client-facing project views |
| `supervisor_portal` | Mobile supervisor hub |
| `mobile_app` | PWA field app |
| `field_logistics` | QR scanner, inventory, deliveries |

#### AI Modules (Additive)
| Module ID | Description |
|-----------|-------------|
| `ai_core` | CastorMind chat, AI insights |
| `ai_financial` | Budget intelligence, cashflow forecast, anomaly detection |
| `ai_procurement` | Spend prediction, inventory prediction |
| `ai_voice` | Transcription, voice-to-task |
| `ai_architect` | Site diary AI, financial advisor, proposal generation |
| `ai_comms` | WhatsApp auto-responder, campaign personalization, reply suggestions |

#### Enterprise Modules
| Module ID | Description |
|-----------|-------------|
| `tax_engine` | INSS, ISS, CNO, SERO, DCTFWeb |
| `white_label` | Custom branding on client portal |
| `sso` | SSO/SAML authentication |
| `api_access` | External API access |
| `multi_currency` | Exchange rates, multi-currency support |

### Tier Definitions

#### Pricing Model
- 30-day full-access trial (not freemium -- avoids brand dilution)
- After trial: permanent sandbox with 1 project, core-only modules
- Annual billing discount: ~20%
- No per-user pricing (flat-rate per tier, aligned with Brazilian market preference)

#### Tier-to-Module Matrix

| Module | Trial (30d) | Sandbox | Arch Office | Arch+AI | Construction | Constr+AI | Enterprise |
|--------|:-----------:|:-------:|:-----------:|:-------:|:------------:|:---------:|:----------:|
| `core` | x | x | x | x | x | x | x |
| `financial_basic` | x | x | x | x | x | x | x |
| `financial_full` | x | - | - | - | x | x | x |
| `procurement` | x | - | - | - | x | x | x |
| `schedule_basic` | x | x | x | x | x | x | x |
| `schedule_full` | x | - | - | - | x | x | x |
| `roadmap` | x | x | x | x | x | x | x |
| `reports` | x | - | x | x | x | x | x |
| `templates` | x | - | x | x | x | x | x |
| `campaigns` | x | - | - | - | x | x | x |
| `forms` | x | - | - | - | - | - | x |
| `content_hub` | x | - | - | - | - | - | x |
| `architect_portal` | x | - | x | x | - | - | x |
| `client_portal` | x | - | x | x | x | x | x |
| `supervisor_portal` | x | - | - | - | x | x | x |
| `mobile_app` | x | x | x | x | x | x | x |
| `field_logistics` | x | - | - | - | x | x | x |
| `ai_core` | x | - | - | x | - | x | x |
| `ai_financial` | x | - | - | - | - | x | x |
| `ai_procurement` | x | - | - | - | - | x | x |
| `ai_voice` | x | - | - | x | - | x | x |
| `ai_architect` | x | - | - | x | - | - | x |
| `ai_comms` | x | - | - | - | - | x | x |
| `tax_engine` | - | - | - | - | - | - | x |
| `white_label` | - | - | - | - | - | - | x |
| `sso` | - | - | - | - | - | - | x |
| `api_access` | - | - | - | - | - | - | x |
| `multi_currency` | - | - | - | - | - | - | x |

#### Indicative Pricing (BRL)

| Tier | Monthly | Annual (per month) | Max Projects | Max Users | Max Storage |
|------|---------|-------------------|-------------|-----------|-------------|
| Trial | Free (30 days) | - | Unlimited | 10 | 10 GB |
| Sandbox | Free (permanent) | - | 1 | 3 | 1 GB |
| Architect Office | R$349 | R$279 | 10 | 10 | 20 GB |
| Architect Office+AI | R$599 | R$479 | 15 | 15 | 50 GB |
| Construction | R$999 | R$799 | 30 | 30 | 100 GB |
| Construction+AI | R$1,499 | R$1,199 | 50 | 50 | 250 GB |
| Enterprise | Custom (from R$2,000) | Custom | Unlimited | Unlimited | 1 TB+ |

### Database Schema for Licensing

```sql
CREATE TABLE public.license_modules (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,  -- 'core', 'functional', 'portal', 'ai', 'enterprise'
  depends_on VARCHAR(50)[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subscription_tiers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_monthly_brl DECIMAL(10,2),
  price_annual_brl DECIMAL(10,2),
  max_projects INT,
  max_users INT,
  max_storage_gb INT,
  trial_days INT DEFAULT 0,
  display_order INT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.tier_modules (
  tier_id VARCHAR(50) REFERENCES subscription_tiers(id),
  module_id VARCHAR(50) REFERENCES license_modules(id),
  PRIMARY KEY (tier_id, module_id)
);

CREATE TABLE public.tenant_licensed_modules (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_id VARCHAR(50) REFERENCES license_modules(id),
  source VARCHAR(20) DEFAULT 'tier',  -- 'tier' or 'override'
  monthly_quota INT,                  -- for metered modules (AI)
  current_usage INT DEFAULT 0,
  quota_resets_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, module_id)
);
```

### Runtime Enforcement Pattern

**Frontend hook** -- `useLicensedModules()`:
```typescript
function useLicensedModules(): {
  modules: string[]
  hasModule: (moduleId: string) => boolean
  isLoading: boolean
}
```

**Frontend guard** -- `ModuleGuard`:
```tsx
<ModuleGuard module="financial_full" fallback={<UpgradePrompt module="financial_full" />}>
  <FinancialLedgerPage />
</ModuleGuard>
```

**Sidebar filtering** -- Extend `useSidebarPermissions`:
- Add `required_module` to sidebar option configuration
- Filter: show option only if user has matching role AND tenant has matching module

**Edge Functions** -- Extend `_shared/authorization.ts`:
```typescript
async function verifyModuleAccess(supabase, userId, moduleId): Promise<boolean>
```

---

## AI Strategy

### Positioning: Name the Actions, Not the Technology

Customers do not understand "tokens" or "AI models." Each AI capability is positioned as a named time-saver:

| AI Feature Name | What It Does | User Value |
|----------------|-------------|------------|
| Meeting Summary | Record meeting, get structured minutes with action items | 2 hours → 60 seconds |
| Site Diary Writer | Upload site photos, AI writes the daily report | 45 min → 5 min |
| Proposal Draft | Describe the project, get a professional proposal | 3 hours → 10 min |
| Financial Advisor | Ask questions about project finances in plain Portuguese | Instant CFO insights |
| Voice Notes | Speak on-site, AI converts to tasks | No typing in the field |
| Smart Replies | AI suggests responses based on project context | Faster client communication |
| Budget Intelligence | Anomaly detection, spend forecasting | Catch overruns early |
| Cashflow Forecast | 13-week predictive liquidity modeling | Plan cash 3 months ahead |
| Procurement Predictor | AI-ranked priority for purchasing | Never run out of material |

**Mobile differentiator message:**
> AI that works at the construction site, not just in the office. Walk the site, take photos, speak your observations. CastorWorks AI turns it into a structured daily report before you get back to your truck.

### AI Action Credits (Token Abstraction)

Raw tokens are never exposed to customers. Instead, each AI feature consumes a fixed number of "AI Actions":

| Feature | AI Actions per Use |
|---------|-------------------|
| Chat question (CastorMind) | 1 |
| Reply suggestion | 1 |
| Voice note transcription | 2 |
| Site photo analysis | 2 |
| Meeting summary | 5 |
| Site diary generation | 3 |
| Budget intelligence report | 5 |
| Cashflow forecast | 10 |
| Proposal draft | 10 |
| WhatsApp auto-response | 1 |

### Monthly AI Budgets per Tier

| Tier | Monthly AI Actions | Estimated CW Cost | Covers |
|------|-------------------|-------------------|--------|
| Trial (30 days) | 100 | ~R$15 | Try everything 2-3 times |
| Architect Office+AI | 500 | ~R$40-60 | ~10 meetings + 30 diaries + 100 chats + 5 proposals |
| Construction+AI | 2,000 | ~R$100-180 | Full team usage across all features |
| Enterprise | 10,000 | ~R$400-800 | Unlimited practical usage + custom top-up |

### Four-Layer Token Protection

**Layer 1 -- Right-sized budgets.**
Set default at the 95th percentile of actual usage. 90% of users never see a limit.

**Layer 2 -- Intelligent model routing (invisible cost savings).**
```
AI Request Router:
├── Cached? → Return cached (R$0.00)
├── Simple (reply suggestion, classification) → Gemini Flash (~R$0.003)
├── Medium (chat, transcription, diary) → Claude Sonnet (~R$0.03-0.10)
└── Complex (forecast, intelligence, proposal) → Claude Opus/GPT-4.1 (~R$0.50-2.00)
```
Reduces average cost per action by 40-60%.

**Layer 3 -- Graceful degradation (never a hard block).**
| Usage Level | Behavior |
|-------------|----------|
| 0-80% | Normal operation |
| 80% | Subtle notification |
| 90% | Banner with upgrade CTA |
| 100% | Degrade to cheapest model, never disable AI |
| Enterprise | Never limited; overage invoiced quarterly |

**Layer 4 -- Purchasable action packs (escape valve).**
| Pack | Actions | Price |
|------|---------|-------|
| Boost 200 | 200 | R$29 |
| Boost 500 | 500 | R$59 |
| Boost 2000 | 2,000 | R$199 |

### AI Metering Infrastructure

```sql
CREATE TABLE public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,
  feature VARCHAR(50) NOT NULL,
  actions_consumed INT NOT NULL,
  model_used VARCHAR(50),
  actual_tokens_in INT,
  actual_tokens_out INT,
  actual_cost_brl DECIMAL(8,4),
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_tenant_month ON ai_usage_log(tenant_id, created_at);
CREATE INDEX idx_ai_usage_feature ON ai_usage_log(feature);
```

Edge Function metering pattern:
```typescript
// supabase/functions/_shared/ai-metering.ts
export async function consumeAIActions(
  supabase, tenantId, userId, feature, actionsRequired
): Promise<{ allowed: boolean; degraded: boolean; remaining: number }>
```

Every AI Edge Function calls `consumeAIActions()` before processing and selects the model based on the `degraded` flag.

### Customer-Facing AI Dashboard

Settings page component showing:
- Progress bar: "412 / 500 AI Actions used this month"
- Top features breakdown (Chat: 186, Meetings: 45, Diary: 36, etc.)
- Reset date
- [Get More Actions] and [View History] CTAs

---

## Implementation Phases

### Phase 0: New Supabase Database & Config/Template Migration (Weeks 0–1)
**Goal**: Provision CastorWorks-NG’s own Supabase database and populate it with schema plus configuration/templates only (no projects, clients, purchases, or other transactional data).

- [ ] Provision new Supabase instance on Hostinger (new Docker container, e.g. `supabase-ng-db`, or new Supabase project)
- [ ] Run all migrations from `supabase/migrations/` on the new database (schema only)
- [ ] From current DB (container `supabase-db`), export data for config/template/reference tables only (see “Tables to Copy” above)
- [ ] Resolve export order and FKs (e.g. `cost_codes`, `company_profiles` before templates that reference them)
- [ ] Import exported data into the new CastorWorks-NG database
- [ ] Configure CastorWorks-NG app (`.env`) to use the new Supabase URL and anon key
- [ ] Document which tables were copied and which excluded; keep an export/import runbook for future refreshes if needed

**Success criteria**: CastorWorks-NG app connects to the new Supabase; schema exists; config and templates are present; no project/client/purchase data exists in the new DB.

---

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Tenant infrastructure and basic isolation

- [ ] Create `tenants`, `tenant_users` tables with RLS
- [ ] Build `TenantContext.tsx` provider
- [ ] Create `tenant-client.ts` Supabase wrapper (auto-injects tenant_id)
- [ ] Add `tenant_id` column to all existing tables via migration
- [ ] Update all RLS policies to include tenant_id checks
- [ ] Build tenant signup/onboarding flow
- [ ] Create super admin role and panel
- [ ] Seed initial tenant for existing data migration

**Success criteria**: A user can sign up, create a tenant, and access only their tenant's data.

### Phase 2: Module-Based Licensing (Weeks 5-8)
**Goal**: Flexible feature gating that works at every layer

- [ ] Create `license_modules`, `subscription_tiers`, `tier_modules`, `tenant_licensed_modules` tables
- [ ] Seed all 25 modules and 7 tiers with correct mappings
- [ ] Build `useLicensedModules()` hook
- [ ] Build `ModuleGuard` component
- [ ] Extend `_shared/authorization.ts` with `verifyModuleAccess()`
- [ ] Update sidebar filtering to respect modules
- [ ] Wrap all feature routes with `ModuleGuard`
- [ ] Build `UpgradePrompt` component with tier comparison
- [ ] Build super admin module override UI

**Success criteria**: Switching a tenant's tier instantly changes which features they can access. Super admin can add/remove individual modules.

### Phase 3: Trial & Subscription Management (Weeks 9-12)
**Goal**: Self-service trial, payment, and tier management

- [ ] Implement 30-day trial flow (full access, countdown UI)
- [ ] Build trial-to-paid conversion flow
- [ ] Integrate payment gateway (Stripe or local Brazilian gateway)
- [ ] Build subscription management page (upgrade/downgrade/cancel)
- [ ] Implement sandbox fallback when trial expires
- [ ] Build billing history and invoice generation
- [ ] Create automated email sequences (trial reminders, expiration warnings)

**Success criteria**: A user can start a trial, convert to paid, upgrade/downgrade tiers, and see billing history.

### Phase 4: AI Action Credits & Metering (Weeks 13-16)
**Goal**: AI usage tracking, model routing, and graceful degradation

- [ ] Create `ai_usage_log` table
- [ ] Build `consumeAIActions()` shared Edge Function utility
- [ ] Implement intelligent model routing (cache → Flash → Sonnet → Opus)
- [ ] Extend AI cache manager for tenant-aware caching
- [ ] Update all AI Edge Functions to call metering before processing
- [ ] Implement graceful degradation (switch to cheaper model at quota)
- [ ] Build customer-facing AI usage dashboard
- [ ] Implement action pack purchase flow
- [ ] Build automated usage alerts (80%, 90%, 100% thresholds)

**Success criteria**: AI features meter correctly, degrade gracefully at quota limits, and customers can see their usage and buy more actions.

### Phase 5: Storage & Data Isolation (Weeks 17-18)
**Goal**: Complete tenant isolation for files and media

- [ ] Update all storage bucket policies to include tenant_id path prefix
- [ ] Migrate existing storage objects to tenant-prefixed paths
- [ ] Enforce storage quota per tenant (based on tier)
- [ ] Build storage usage dashboard for tenant admins

### Phase 6: Edge Functions & API Security (Weeks 19-20)
**Goal**: Every serverless function validates tenant context

- [ ] Audit all Edge Functions for tenant context verification
- [ ] Update Client Portal token system to include tenant_id
- [ ] Add tenant_id to all Realtime channel subscriptions
- [ ] Build rate limiting per tenant for API endpoints

### Phase 7: Super Admin & Operations (Weeks 21-22)
**Goal**: Platform management capabilities

- [ ] Build super admin dashboard (tenant list, health, usage metrics)
- [ ] Implement tenant suspension/reactivation flows
- [ ] Build data export for tenant offboarding
- [ ] Create operational alerts (failed payments, quota abuse, trial expiration)
- [ ] Build tenant impersonation for support debugging

### Phase 8: Polish & Launch Prep (Weeks 23-24)
**Goal**: Production readiness

- [ ] Load testing with 50+ simulated tenants
- [ ] Security audit of tenant isolation
- [ ] Pricing page and marketing site
- [ ] Documentation for tenant onboarding
- [ ] Beta testing with 5-10 real customers
- [ ] Performance optimization for multi-tenant query patterns

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy model | Shared schema + tenant_id | Industry standard, manageable at CastorWorks scale, single migration path |
| Licensing enforcement | Module-based, DB-driven | Tiers change without deploys; custom enterprise deals possible |
| AI pricing abstraction | AI Action credits | Customers understand "actions" not "tokens"; hides model cost variability |
| AI quota enforcement | Graceful degradation | Never block AI; switch to cheaper model at quota. Preserves UX. |
| Trial model | 30-day full-access + permanent sandbox | Avoids freemium brand dilution; sandbox keeps leads warm |
| Pricing model | Flat-rate per tier (not per-user) | Brazilian market prefers predictable pricing; competitive with Construflow/Obra Prima |
| Payment integration | Stripe + local fallback | Stripe supports BRL; fallback needed for boleto/PIX |
| CastorWorks-NG database | New Supabase instance, copy config/templates only | Isolates NG from production; no migration of project/client/purchase data; same Hostinger/Docker/SSH ops pattern |

## References

| Document | Purpose |
|----------|---------|
| **CastorWorks/docs/plans/multi-tenant/multi-tenancy-best-practices.md** | Authoritative reference for multi-tenancy schema: shared schema with tenant_id, RLS patterns, migration strategy, and why schema-per-tenant / DB-per-tenant are not used. Consult when designing or changing tenant-related Supabase schema. |

## Constraints

- CastorWorks-NG uses a **new** Supabase database (new container on Hostinger); it is not the current production DB
- Only schema and configuration/template data are migrated from the current DB; no projects, clients, purchases, or other transactional data
- Supabase is self-hosted on Hostinger in Docker; access for migrations and ops is via SSH
- All migrations run via SSH to the appropriate Docker container (current: `supabase-db`; NG: e.g. `supabase-ng-db`)
- Edge Functions deployed via remote `supabase/functions/`
- No breaking changes to existing user data during migration
- Must maintain i18n support (en-US, pt-BR, es-ES, fr-FR) for all new UI

## Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Trial-to-paid conversion | >12% | Within 6 months of launch |
| Time-to-value (first meaningful action in trial) | <15 minutes | From signup |
| AI Action utilization rate | 60-80% of budget | Monthly average |
| Tenant isolation: zero cross-tenant data leaks | 0 incidents | Ongoing |
| Churn rate | <5% monthly | After first 3 months |
| Average revenue per tenant | R$600-800/mo | Within 12 months |

---
*Last updated: 2026-03-01 after v1.0 Foundation and Licensing milestone*
