# Testing & Quality

## Test layers

- **Unit / integration**: Vitest + Testing Library
- **E2E**: Playwright (Chromium project)
- **Security suite**: migration + RLS scanners + security-focused tests

## Commands

```bash
# Lint
npm run lint

# Unit/integration tests
npm run test:run

# Coverage
npm run test:coverage

# E2E tests (Chromium)
npm run test:e2e

# Security suite (required for backend/security changes)
npm run test:security

# CI-style gate
npm run ci
```

## What the security suite runs

`npm run test:security` executes `scripts/test-security.sh`, which runs:

- migration security scan (`scripts/check-migration-security.js`)
- permissive RLS policy scan (`scripts/check-rls-policies.js`)
- Vitest security tests (`src/__tests__/security/`)
- JSON validation (`npm run validate:json`)
- TypeScript compilation (`tsc --noEmit`)

## Where tests live

- Unit/component tests:
  - `src/__tests__/...`
  - plus co-located `*.test.ts(x)` in feature folders
- E2E:
  - `e2e/*.spec.ts`

## Writing new tests (local conventions)

### Component tests (Testing Library)

- Prefer user-centric queries:
  - `getByRole`, `findByRole`, `getByLabelText`
- Avoid testing implementation details (component internals).

### Hook tests

- Use `renderHook` and wrap with providers (QueryClientProvider, etc.) as needed.

### E2E tests

- Keep E2E for critical user flows:
  - authentication
  - client portal smoke
  - documents flow
  - accessibility checks (there is an axe test in `e2e/axe-auth.spec.ts`)

## Practical sprint workflow

When touching frontend-only UI:

- run `npm run lint`
- run `npm run test:run` (or targeted tests)

When touching anything in:

- `supabase/migrations/`
- `supabase/functions/`
- auth/authorization

Always run:

- `npm run test:security`


