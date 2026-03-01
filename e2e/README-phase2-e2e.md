# Phase 2 Module-Based Licensing — Automated E2E

Automated agent-browser E2E for Phase 2: licensing schema, sidebar filtering by module, super admin tenant module overrides.

## Prerequisites

- CastorWorks-NG dev server on **port 5181** (`./castorworks.sh start`)
- Phase 2 migrations applied on NG DB (`20260302000000`, `20260302000001`, `20260302000002`)
- `.env.testing` with:
  - `ACCOUNT_TEST_EMAIL` / `ACCOUNT_TEST_EMAIL_PASSWORD` (for licensing-sidebar)
  - For admin-tenant-modules: test user must have `super_admin` in `user_roles` (e.g. `ACCOUNT_SUPER_ADMIN_EMAIL` / `ACCOUNT_SUPER_ADMIN_PASSWORD` or same as `ACCOUNT_TEST_EMAIL`)

## Run

```bash
# All Phase 2 E2E (admin tenant modules, licensing sidebar)
npm run test:e2e -- phase2

# Individual flows
npm run test:e2e -- phase2-admin-tenant-modules
npm run test:e2e -- phase2-licensing-sidebar
```

Base URL defaults to `http://localhost:5181` for `phase2*` patterns.

## Scripts

| Script | What it verifies |
|--------|-------------------|
| `e2e/phase2-admin-tenant-modules.agent-browser.cjs` | Login (super_admin) → /admin/tenants → click Modules link → Tenant modules page (add/remove overrides UI) |
| `e2e/phase2-licensing-sidebar.agent-browser.cjs` | Login → / → dashboard with sidebar; sidebar filtered by tenant license (useLicensedModules) |

Screenshots: `test-results/phase2-admin-tenant-modules/`, `test-results/phase2-licensing-sidebar/`.

## Validation completion

After Phase 2 execution, the agent runs:

1. Migrations on NG DB (schema + seed + backfill `subscription_tier_id`).
2. Phase 2 E2E via `npm run test:e2e -- phase2` to validate admin tenant modules page and licensing sidebar.
