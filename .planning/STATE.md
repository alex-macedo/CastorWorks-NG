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
| **Phase** | 7 — AI Action Credits & Metering (in progress) |
| **Plan**  | 07-01 complete — ready for 07-02 |
| **Status** | **Phase 7 started** — DB foundation and Wave 0 test scaffolds done |

**Progress:** [██████░░░░] 64% (v1.0 + v1.1 shipped; Phase 7 in progress)

---

## Recent Decisions

- Use a **new** Supabase database for CastorWorks-NG (not current production); copy schema + config/templates only; no projects/clients/purchases.
- Follow **multi-tenancy-best-practices.md** (shared schema with `tenant_id`); no schema-per-tenant or DB-per-tenant.
- Runbook and schema reference the doc in the **parent CastorWorks repo**.
- Export/import in **dependency order** (layer1 → layer1b benchmarks → layer2); handle `auth.users` FKs via drop → import → NULL `created_by` → re-add.
- **Phase 1 Plan 01:** super_admin enum in separate migration (20260301000000) so it commits before use; NG DB container is `castorworks-ng-db`; RLS helper `tenant_and_project_using()` for project-scoped policies.
- **Phase 7 Plan 01:** `allowed` is always true in consume_ai_actions — 100% exhaustion degrades silently, never blocks; enterprise returns remaining=999999; FOR UPDATE lock prevents credit race conditions; purchased credits stack on monthly budget and never expire.

---

## Pending Todos

- None captured in `.planning/todos/`.

---

## Blockers / Concerns

- None. Provisioning the NG Supabase instance (new container on Hostinger) is an ops step that may require human or separate runbook.

---

## Session Continuity

- **Last session:** 2026-03-28T21:46:53Z
- **Stopped at:** Completed 07-01-PLAN.md
- **Resume file:** .planning/phases/07-ai-action-credits-metering/07-01-SUMMARY.md
