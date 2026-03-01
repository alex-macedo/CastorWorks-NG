---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executed
stopped_at: Completed 01-foundation-01-01-PLAN.md (Foundation Migrations)
last_updated: "2026-03-01"
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 50
---

# CastorWorks-NG — Project State

**Last updated:** 2026-03-01

---

## Project Reference

- **What this is:** Multi-tenant SaaS transformation of CastorWorks (construction/engineering management). Target: Brazilian construction and architecture firms. React 19 + Vite 7 + Supabase; shared-schema multi-tenancy; module-based licensing; AI Action credits.
- **Current focus:** Phase 1 — Foundation (tenant DB, RLS, TenantContext). Plan 01-01 executed.

---

## Current Position

| Item    | Value |
|---------|--------|
| **Phase** | 1 of 9 — Foundation |
| **Plan**  | 01-01 completed; next 01-02 (TenantContext, tenant-client, signup) |
| **Status** | **Executed** — Plan 01-01 (migrations) complete on castorworks-ng-db |

**Progress:** Phase 1 █████░░░░░ ~50% (1 of 2 plans in phase complete)

---

## Recent Decisions

- Use a **new** Supabase database for CastorWorks-NG (not current production); copy schema + config/templates only; no projects/clients/purchases.
- Follow **multi-tenancy-best-practices.md** (shared schema with `tenant_id`); no schema-per-tenant or DB-per-tenant.
- Runbook and schema reference the doc in the **parent CastorWorks repo**.
- Export/import in **dependency order** (layer1 → layer1b benchmarks → layer2); handle `auth.users` FKs via drop → import → NULL `created_by` → re-add.
- **Phase 1 Plan 01:** super_admin enum in separate migration (20260301000000) so it commits before use; NG DB container is `castorworks-ng-db`; RLS helper `tenant_and_project_using()` for project-scoped policies.

---

## Pending Todos

- None captured in `.planning/todos/`.

---

## Blockers / Concerns

- None. Provisioning the NG Supabase instance (new container on Hostinger) is an ops step that may require human or separate runbook.

---

## Session Continuity

- **Last session:** 2026-03-01
- **Stopped at:** Completed 01-foundation-01-01-PLAN.md (Foundation Migrations). All 8 tasks committed; SUMMARY at `.planning/phases/01-foundation/01-01-SUMMARY.md`.

**Next action:**  
Execute Plan 01-02 (TenantContext, tenant-client, signup/onboarding). Ensure app calls `set_tenant_context(tenant_id)` when tenant is set; migrations are applied on castorworks-ng-db.
