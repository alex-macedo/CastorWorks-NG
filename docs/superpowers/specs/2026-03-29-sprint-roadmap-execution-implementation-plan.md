# Sprint roadmap execution — implementation plan

**Derived from:** [2026-03-29-sprint-roadmap-execution-pipeline-design.md](./2026-03-29-sprint-roadmap-execution-pipeline-design.md)  
**Status:** Draft for execution sessions

---

## Phase A — Preconditions (once per environment)

1. Confirm `gh` CLI authenticated (`gh auth status`) and repo default branch matches merge target.
2. Confirm branch protection: if **required reviews** block bots, document that automated merge (design §6 step 8) **cannot** run without human approval.
3. Optional: add a read-only SQL snippet or Studio query template to list **current open sprint** and ordered items (`priority DESC NULLS LAST`).

---

## Phase B — Per roadmap item (repeat)

| Step | Action | Done when |
|------|--------|-----------|
| B1 | Resolve sprint + next row (see design §6.1) | Row selected |
| B2 | Set `roadmap_items.status` → In Progress | DB updated |
| B3 | Branch `roadmap/<uuid-or-id>-<slug>` | Branch exists locally |
| B4 | Fix only what the item requires; run `npm run lint` (+ `npm run ci` if time) | Green locally |
| B5 | Commit, push, `gh pr create` | PR open |
| B6 | Wait CI | All required checks green |
| B7 | `gh pr merge` if mergeable | Merged |
| B8 | Set status → Done (+ sprint fields if product requires) | DB reflects Done |

---

## Phase C — Optional automation (future)

- Scripted `gh` wrapper that fails closed on non-mergeable PRs.
- Query module in `scripts/` that outputs next item JSON (requires service role or admin-only path — **do not** put secrets in repo; use CI or local env).

---

## Verification

- No regression: `npm run ci` on branch before merge.
- Design §8 error table exercised only via dry-run or docs until first real item.
