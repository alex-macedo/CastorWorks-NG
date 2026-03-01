---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Trial & Subscription Management
status: ready_for_planning
stopped_at: "Roadmap v1.1 created; Phase 3 next."
last_updated: "2026-03-01T18:45:18.003Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# CastorWorks-NG — Project State

**Last updated:** 2026-03-01

---

## Project Reference

- **What this is:** Multi-tenant SaaS transformation of CastorWorks (construction/engineering management). Target: Brazilian construction and architecture firms. React 19 + Vite 7 + Supabase; shared-schema multi-tenancy; module-based licensing; AI Action credits.
- **Current focus:** v1.1 Trial & Subscription Management — Phase 3 (Trial Experience) ready for planning.

---

## Current Position

| Item    | Value |
|---------|--------|
| **Phase** | 3 — Trial Experience |
| **Plan**  | — |
| **Status** | **Ready for planning** — Roadmap v1.1 complete |

**Progress:** [░░░░░░░░░░] 0% (v1.1: 0/4 phases)

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
- **Stopped at:** Phase 2 complete. Migrations run on castorworks-ng-db; E2E phase2 passed (admin-tenant-modules, licensing-sidebar). Summaries: `.planning/phases/02-module-based-licensing/02-01-SUMMARY.md` through `02-03-SUMMARY.md`.

**Next:** `/gsd:plan-phase 3` to create Phase 3 (Trial Experience) plan.
