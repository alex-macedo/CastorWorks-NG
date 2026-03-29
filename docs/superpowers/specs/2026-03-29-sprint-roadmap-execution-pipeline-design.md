# Sprint roadmap execution pipeline — design

**Status:** Approved (user confirmation 2026-03-29)  
**Scope:** CastorWorks-NG — drive work from `roadmap_items` for the **current open sprint**, minimal code fixes only, GitHub PR workflow per item.

---

## 1. Goal

Provide an operational playbook so an agent (or human) can **drain** the current sprint’s backlog in the **correct order**, with **clear status transitions**, **local quality gates**, and **one GitHub PR per item** merged to `main` when checks pass.

---

## 2. Decisions (locked)

| Topic | Decision |
|--------|-----------|
| **Which rows** | Only items tied to the **current open sprint** (`sprint_id` = that sprint). |
| **GitHub workflow** | **One PR per roadmap item**; CI must be green before treating the GitHub side as complete. |
| **Who merges** | **Agent merges via CLI** (`gh pr merge`) **only when** CI is green and **no required reviews / branch rules block** merge. If merge is blocked, **stop and notify human**. |
| **Order within sprint** | **`priority` on `roadmap_items` — highest first.** Treat **NULL** as **lowest** (sort `ORDER BY priority DESC NULLS LAST`). |

---

## 3. Data model notes

- `roadmap_items` includes **`priority`** (see existing migrations and seed inserts). Implementation **must** confirm the exact type/semantics in generated types or `supabase/migrations` before automating sorts.
- **Status** is stored as **text** (see `20260221100000_roadmap_kanban_configurable_columns.sql`). Use the same canonical values the app uses (e.g. case-insensitive `next up`, `in progress`, `done` — align with `useSprints` / UI).

---

## 4. Status flow

1. **Next Up → In Progress** when work **starts** on that item (single active owner).
2. **In Progress → Done** only when:
   - PR is **merged** to the target branch (typically `main`), and
   - DB row is updated to reflect completion (and any existing fields such as sprint metadata — follow patterns in recent sprint migrations).

3. **Do not** mark **Done** if:
   - Lint/tests fail after reasonable fix attempts,
   - CI is red,
   - PR cannot merge,
   - The item is **not** a code defect (no fake “done”).

---

## 5. Recommended approach: sequential pipeline

**Parallel agents on multiple branches** are **out of scope** for this design (merge conflict and CI risk). Use **one item at a time** (sequential).

**“Spawn agents”** means: **orchestrated sessions** or focused subtasks (research, review) — **not** parallel edits on the same repo unless policy changes later.

---

## 6. Per-item pipeline

1. **Discovery (read-only):** Resolve **current open sprint**; list `roadmap_items` with `sprint_id` = that sprint and status in the active work set (`next up` / `in progress` as applicable); **order by `priority DESC NULLS LAST`**.

2. **Start work:** Set status to **In Progress** (if not already).

3. **Implement:** **Only fix broken code** — no drive-by refactors, no unrelated files. If the item is not a bugfix, **leave In Progress**, add a short note/comment, **escalate** (do not mark Done).

4. **Quality gates (local):** At minimum `npm run lint`. Align with repo norms: `npm run validate:json`, `npm run test:run`, and full `npm run ci` when feasible before push.

5. **Git:** Branch `roadmap/<item-id>-<short-slug>`, commit, push.

6. **GitHub:** `gh pr create` with title/body referencing roadmap **id** and title.

7. **CI:** Wait until **required checks** pass (e.g. `gh run watch`, or project `ci-watcher` pattern).

8. **Merge:** `gh pr merge` **only if** mergeable and policy allows automated merge.

9. **DB:** Update item to **Done** (and any sprint stamp fields if required by product rules).

10. **Next item:** Repeat from step 1.

---

## 7. Project conventions (AGENTS.md / READMEDev.md)

- Prefer **`./castorworks.sh`** for dev server when UI verification is needed.
- **E2E:** agent-browser only (no Playwright); use when the story requires UI proof.
- **Supabase:** RLS remains authoritative; no service role in client code. **Migrations** on remote DB follow documented SSH/ `docker exec` workflow when schema changes are needed (rare for “fix broken” only).
- **i18n:** If UI strings change, update all four locale bundles and keep `validate:json` green.

---

## 8. Error handling

| Situation | Action |
|------------|--------|
| Lint / test fail | Fix or revert; remain **In Progress** or revert to **Next Up** with note. |
| CI fail | Same; **do not** merge. |
| Merge blocked (reviews, branch protection) | **Stop**; notify human; **do not** set Done. |
| Item not implementable as code | Escalate; no Done. |

---

## 9. Testing / verification

- **Unit/integration:** Run `npm run test:run` (or relevant subset) for touched areas.
- **UI:** agent-browser smoke when applicable.
- **Regression:** No new failures in CI.

---

## 10. Spec review

**Reviewer:** Self-check against brainstorming checklist  
**Result:** PASS — structure complete, decisions explicit, risks and fallbacks documented.

---

## 11. Next step

After this design is merged, use **`writing-plans`** (or project equivalent) to produce a **concrete implementation plan** (scripts, queries, `gh` commands, optional automation hooks). **Do not** treat this document as executable code until that plan exists and is executed in a dedicated session.

---

## 12. Changelog

| Date | Change |
|------|--------|
| 2026-03-29 | Initial design; user approved scope, PR model, merge policy, priority ordering. |
