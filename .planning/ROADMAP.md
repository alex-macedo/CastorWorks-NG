# Roadmap: CastorWorks-NG

## Overview

Multi-tenant SaaS transformation. **v1.0 Foundation and Licensing** shipped 2026-03-01. Next: Phase 3 (Trial & Subscription Management).

## Milestones

- ✅ **v1.0 Foundation and Licensing** — Phases 0–2 (shipped 2026-03-01)
- 📋 **v1.1** — Phase 3 onward (planned)

## Phases

<details>
<summary>✅ v1.0 Foundation and Licensing (Phases 0–2) — SHIPPED 2026-03-01</summary>

- [x] **Phase 0: New Supabase DB** — NG DB provisioned, schema and config/templates in place
- [x] **Phase 1: Foundation** — Tenants, RLS, TenantContext, onboarding, super admin
- [x] **Phase 2: Module-Based Licensing** — Licensing schema, RPC, seed, useLicensedModules, ModuleGuard, UpgradePrompt, sidebar filter, verifyModuleAccess, TenantModules UI

</details>

### 📋 v1.1+ (Planned)

- [ ] **Phase 3: Trial & Subscription Management** — 30-day trial, payment, tier management, sandbox fallback
- [ ] **Phase 4: AI Action Credits & Metering** — ai_usage_log, consumeAIActions, model routing, graceful degradation
- [ ] **Phase 5: Storage & Data Isolation** — Tenant-prefixed storage, quota, usage dashboard
- [ ] **Phase 6: Edge Functions & API Security** — Tenant context audit, Client Portal token, Realtime, rate limiting
- [ ] **Phase 7: Super Admin & Operations** — Dashboard, suspension, export, alerts, impersonation
- [ ] **Phase 8: Polish & Launch Prep** — Load test, security audit, pricing page, beta

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 0. New Supabase DB | v1.0 | Complete | 2026-03-01 |
| 1. Foundation | v1.0 | Complete | 2026-03-01 |
| 2. Module-Based Licensing | v1.0 | Complete | 2026-03-01 |
| 3. Trial & Subscription | v1.1 | Not started | — |
| 4. AI Action Credits | v1.1 | Not started | — |
| 5–8 | v1.1+ | Not started | — |
