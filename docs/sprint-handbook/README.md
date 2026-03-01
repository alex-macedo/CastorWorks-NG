# CastorWorks Sprint Handbook (Brownfield)

This handbook is a **fresh, sprint-oriented** documentation set intended to help engineers ramp up quickly on the CastorWorks brownfield codebase and ship safely in upcoming sprints.

It is intentionally **self-contained**: it does **not** rely on (or assume correctness of) any other documentation in this repository.

## What you’ll find here

- **Getting started**: local dev, env vars, scripts, troubleshooting basics
- **Architecture**: runtime composition root, routing “sub-apps”, providers, state/data flow
- **Supabase**: auth, RLS expectations, storage patterns, migrations, and data access conventions
- **APIs**: Edge Functions (request/response/error contracts) + how the frontend uses PostgREST via `supabase-js`
- **Security**: guardrails that must be preserved in future work (RLS, storage signed URLs, XSS hygiene)
- **Testing**: unit/integration/e2e, and the project’s security test suite
- **Contributing**: conventions, where to add things, and “how we change safely”

## Quick navigation

- `01-getting-started.md`
- `02-architecture.md`
- `03-frontend-patterns.md`
- `04-supabase-and-data.md`
- `05-edge-functions-api.md`
- `06-testing-and-quality.md`
- `07-security-handbook.md`
- `08-troubleshooting.md`
- `09-contributing.md`
- `10-domain-map.md`
- `11-code-reference.md`
- `12-agents-and-automation.md`

## When you’re new (recommended path)

1. Read `02-architecture.md` to understand the 3 “apps” inside the SPA (desktop, supervisor mobile, client portal).
2. Read `04-supabase-and-data.md` to understand the data + auth boundary.
3. Skim `05-edge-functions-api.md` and focus on the “Front-end invoked functions” section.
4. Keep `07-security-handbook.md` open while developing.


