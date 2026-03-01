# AI Agents & Automation (How to Work With This Repo)

This repo is “agent-aware”: it includes rules and automation intended to keep changes safe—especially around Supabase/RLS and edge functions.

## What `AGENTS.md` is (in practice)

`AGENTS.md` acts as a **project-level operating manual** for AI coding agents and humans. The important parts for sprint work are:

- **Repository conventions** (where code lives, naming, import patterns)
- **Security invariants** (RLS + role checks + secrets rules)
- **Required validation commands** (`precommit`, `test:security`)
- **Documentation rules** (new docs under `docs/`)

Even if you do not use an AI agent, the same conventions reduce regressions and make the codebase consistent.

## Automation you should know

### Precommit gate

Run before pushing a risky change:

```bash
npm run precommit
```

This is designed to block changes that violate security expectations.

### Security suite

Use when you touch migrations, edge functions, auth, storage access, or HTML rendering:

```bash
npm run test:security
```

It runs:

- migration scanners for dangerous patterns
- RLS policy checks
- security-focused unit tests
- JSON validation
- TypeScript compilation

## Documentation workflow

For sprint work:

- Add/adjust documentation under `docs/` (this handbook lives in `docs/sprint-handbook/`).
- Keep docs practical:
  - “how to change X safely”
  - “how to debug X”
  - “API contract for X”

## Planning larger changes

When a change will:

- touch multiple subsystems (frontend + edge + RLS),
- or introduce a new domain model/table,
- or restructure routes/providers,

create a short plan document before implementation (many teams use `plan-<feature>.md` conventions).

## Safety recap (agent or human)

- **RLS is the security boundary**: keep it tight.
- **Edge functions must authenticate and authorize** before doing work.
- **Storage uses signed URLs** for private buckets.
- **Sanitize HTML** when using `dangerouslySetInnerHTML`.


