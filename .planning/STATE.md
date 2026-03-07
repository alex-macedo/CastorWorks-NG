---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Trial & Subscription Management
status: unknown
stopped_at: Phase 7 context gathered
last_updated: "2026-03-07T23:04:59.529Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 64
---

# CastorWorks-NG — Project State

**Last updated:** 2026-03-01

---

## Project Reference

- **What this is:** Multi-tenant SaaS transformation of CastorWorks (construction/engineering management). Target: Brazilian construction and architecture firms. React 19 + Vite 7 + Supabase; shared-schema multi-tenancy; module-based licensing; AI Action credits.
- **Current focus:** v1.1+ Later Milestones — Phase 7 (AI Action Credits & Metering) is next.

---

## Current Position

| Item    | Value |
|---------|--------|
| **Phase** | 7 — AI Action Credits & Metering (next) |
| **Plan**  | Not yet planned |
| **Status** | **v1.1 complete** — ready to start Phase 7 |

**Progress:** [██████░░░░] 64% (v1.0 + v1.1 shipped; Phases 7–11 remaining)

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

- **Last session:** 2026-03-07T23:04:59.511Z
- **Stopped at:** Phase 7 context gathered
- **Resume file:** .planning/phases/07-ai-action-credits-metering/07-CONTEXT.md
