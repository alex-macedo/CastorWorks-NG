# Phase 1 Foundation — Automated E2E

Automated agent-browser E2E for Phase 1 (tenant infrastructure): onboarding, super admin panel, tenant switch.

## Prerequisites

- CastorWorks-NG dev server on **port 5181** (`./castorworks.sh start`)
- `.env.testing` with:
  - `ACCOUNT_TEST_EMAIL` / `ACCOUNT_TEST_EMAIL_PASSWORD` (used for admin-tenants and tenant-switch)
  - Optional: `ACCOUNT_ONBOARDING_EMAIL` / `ACCOUNT_ONBOARDING_PASSWORD` for a user with **no tenants** (onboarding flow)
  - Optional: `ACCOUNT_SUPER_ADMIN_EMAIL` / `ACCOUNT_SUPER_ADMIN_PASSWORD` for **super_admin** (admin-tenants flow)

For **admin-tenants**, the test user must have `super_admin` in `user_roles`.  
For **tenant-switch**, the test user should belong to **at least 2 tenants** (or the script still verifies picker and first tenant).

## Run

```bash
# All Phase 1 E2E (onboarding, admin-tenants, tenant-switch)
npm run test:e2e -- phase1

# Individual flows
npm run test:e2e -- phase1-onboarding
npm run test:e2e -- phase1-admin-tenants
npm run test:e2e -- phase1-tenant-switch
```

Base URL defaults to `http://localhost:5181` for `phase1*` patterns. Override:

```bash
BASE_URL=http://localhost:5181 npm run test:e2e -- phase1
```

## Scripts

| Script | What it verifies |
|--------|-------------------|
| `e2e/phase1-onboarding.agent-browser.cjs` | Login → /onboarding (if no tenants) → fill company name → submit → redirect to / |
| `e2e/phase1-admin-tenants.agent-browser.cjs` | Login (super_admin) → /admin/tenants → page shows tenants list/title |
| `e2e/phase1-tenant-switch.agent-browser.cjs` | Login → tenant picker (or /) → /projects → /tenant-picker → select another tenant → /projects |

Screenshots are saved under `test-results/phase1-onboarding/`, `test-results/phase1-admin-tenants/`, `test-results/phase1-tenant-switch/`.

### Auth sign-in / sign-up / onboarding E2E

```bash
npm run test:e2e -- auth-signin-signup
# or
bash scripts/agent-browser-e2e.sh auth-signin-signup
```

- Uses `ACCOUNT_TEST_EMAIL` / `ACCOUNT_TEST_EMAIL_PASSWORD` from `.env.testing`.
- After sign-in, if redirected to **/onboarding**, completes onboarding with workspace name from `E2E_ONBOARDING_WORKSPACE_NAME` (default **"Eagle Construtora"**). Uses a unique slug per run to avoid duplicate-tenant errors.
- Optional: `ACCOUNT_SIGNUP_EMAIL` / `ACCOUNT_SIGNUP_PASSWORD` to also validate sign-up then sign-in. See `docs/runbooks/auth-signup-api-error-ng.md` §5.

**If onboarding stays on /onboarding:** Ensure migrations `20260301000001`, `20260301100000`, and `20260301100001_tenant_users_insert_allow_after_tenant_create.sql` are applied on the CastorWorks-NG DB (container `castorworks-ng-db`). Check `test-results/auth-signin-signup/*.png` for toast errors.

**If you see "Daemon failed to start":** agent-browser’s daemon could not start (e.g. no display, or agent-browser not installed in that environment). Run the command in an environment where agent-browser works (e.g. local terminal with app on 5181).
