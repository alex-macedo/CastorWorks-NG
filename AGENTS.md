# CastorWorks

## Implementation Standards for AI Features

### 1. Edge Function Recovery Cache
When calling heavy AI models (e.g., Llama 3.2), implement a recovery cache in the Edge Function. If the model takes longer than the Gateway Timeout (60s), the engine should work in the background and store the result. Subsequent UI requests should check for recent existing results before re-triggering the AI.

### 2. Context Injection
Always inject live project context (status, area, manager, budget) into system prompts for `CastorMind AI`. This ensures narratives are data-driven and actionable rather than generic.

### 3. Internationalization (i18n)
Every new UI component and AI-generated segment MUST be localized.
- Use `namespace:key` format for `t()` functions.
- The `LocalizationContext.tsx` automatically resolves namespaces based on the first segment.
- Ensure `npm run validate:json` is green before delivery.

### 4. Database Schema
Always check for existing tables before creating new ones. Use standard naming conventions (`financial_*`, `project_*`, etc.).
- RLS is mandatory on all new tables.
- Use `has_project_access(auth.uid(), project_id)` for row-level security.

## Overview

CastorWorks is a TypeScript + React **construction / engineering project management platform** built on Vite, Supabase, shadcn/ui (Radix), and i18next (multi-language).

Core capabilities span Projects, Financials, Procurement/Materials, Schedule/Calendars, Daily logs/photos, and role-based portals (including Architect + Client Portal experiences).

## Development Commands

### Build & Development

## 🚨 CRITICAL: Use the CastorWorks helper script (required)

./castorworks.sh start         # Start Vite dev server
./castorworks.sh restart       # Restart dev server
./castorworks.sh clean         # Clean build and restart

## ❌ DO NOT use npm directly - it will fail due to missing environment setup

$ npm run dev                  # Will not work properly
$ npm run dev:full             # Will not work properly

### Code Quality

- `npm run lint` - Run ESLint on all files
- `npm run lint:hooks` - Lint only source files with hooks config
- `npm run validate:json` - Validate JSON files
- `npm run ci` - Full CI pipeline (validate + build + test)

Always run the full Code Quality commands before committing code.

### Testing

**IMPORTANT – E2E stack:** We do **not** use Playwright. We use **Vercel agent-browser** for all end-to-end and browser automation. Do not add or use Playwright; use agent-browser only (e.g. `e2e/*.agent-browser.cjs` scripts and `bash scripts/agent-browser-e2e.sh <pattern>`). This avoids wasted effort and tokens.

- `npm test` - Run tests in watch mode (vitest)
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- **Single test**: `npm test -- YourTestName` or `npm run test:run -- YourTestName`
- `npm run test:e2e` - agent-browser end-to-end / interactive QA tests (no Playwright)
- `npm run test:security` - Security testing
- `npm run test:rls:policies` - Validate RLS policies

Note: Test login credentials used by automated QA (e.g. `agent-browser`) are available in the project's `.env.testing` file under `ACCOUNT_TEST_EMAIL` and `ACCOUNT_TEST_EMAIL_PASSWORD`.

Agent-browser login automation

- When running interactive QA with `agent-browser`, ensure the script performs an authenticated login before interacting with protected pages.
- Use the `.env.testing` values `ACCOUNT_TEST_EMAIL` and `ACCOUNT_TEST_EMAIL_PASSWORD` for credentials.
- Example automation steps (pseudocode):

  1. Navigate to `/login`
  2. Fill email input selector (e.g. `#email`) with `$ACCOUNT_TEST_EMAIL`
  3. Fill password input selector (e.g. `#password`) with `$ACCOUNT_TEST_EMAIL_PASSWORD`
  4. Click the sign-in button (e.g. `text="Sign in"` or `button[type=submit]`)
  5. Wait for navigation or protected route (e.g. `/architect`)
  6. Continue with screenshots or interactions (e.g. `/architect/time-tracking`)

Example (shell / CLI conceptual):

```bash
# export ACCOUNT_TEST_EMAIL and ACCOUNT_TEST_EMAIL_PASSWORD from .env.testing
agent-browser --session qa1 run ./e2e/login-and-time-tracking.js
```

Where `e2e/login-and-time-tracking.js` contains the page actions to fill the login form, submit, wait for navigation, and then run the rest of the scenario.

### Post-Delivery Verification with agent-browser

**CRITICAL**: After delivering UI features or changes, always create and run temporary agent-browser test scripts to verify the implementation works correctly in the browser.

**Required Process**:
1. **Create test script** - Write an agent-browser script in `e2e/` (e.g. `e2e/my-feature.agent-browser.cjs`) covering the delivered features. Do not use Playwright.
2. **Run the test** - Execute `npm run test:e2e -- <pattern>` or `bash scripts/agent-browser-e2e.sh <pattern>` to verify functionality
3. **Capture evidence** - Tests should take screenshots saved to `test-results/` for visual verification
4. **Fix issues** - If tests fail, fix the code and re-run until passing

**Example workflow**:
```bash
# 1. Create agent-browser script (no Playwright)
e2e/my-feature.agent-browser.cjs

# 2. Run the test
npm run test:e2e -- my-feature

# 3. Check screenshots
ls test-results/

# 4. Fix any issues and re-run
npm run test:e2e -- my-feature-test
```

**Test Script Guidelines**:
- Test all user interactions (clicks, inputs, navigation)
- Verify visual states (expanded/collapsed, visible/hidden)
- Test across different modes (view vs edit)
- Include assertions for critical functionality
- Use flexible selectors that work across all 4 supported languages
- Save screenshots at key verification points

**Why this matters**:
- Catches bugs that unit tests miss (like the collapseAllRows bug where children remained visible)
- Verifies UI behavior matches requirements
- Provides visual evidence of working features
- Ensures i18n compatibility
- Documents expected behavior for future maintenance

**Common Issues**:
- **Role Permissions**: Ensure test user has appropriate role for the feature being tested (e.g., WBS Templates requires admin/project_manager/admin_office/site_supervisor, not architect)
- **Missing Data**: Verify test data exists before running tests
- **Timing**: Add appropriate waits for navigation and async operations
- **i18n**: Use flexible selectors that work across all supported languages

### Maintenance

- `npm run precommit` - Pre-commit checks
- `npm run backfill:signed-urls:dry` - Dry run for storage URL backfill
- `npm run backfill:signed-urls:apply` - Apply storage URL backfill

### AI Task Runner (browser)

The Roadmap page "AI To Work" button can run the task runner from the browser and stream output in a dialog. To use it:

1. Start the local bridge (required): `npm run task-runner:bridge`. This runs `scripts/task-runner-bridge.js` on `http://127.0.0.1:3847` (or `TASK_RUNNER_BRIDGE_PORT`).
2. Open Roadmap and click **AI To Work**. If the bridge is running, the run starts immediately and output streams in the dialog. If not, the dialog shows instructions to start the bridge and a copy-command fallback for running in a terminal.

- `npm run task-runner` - Run the task runner in the terminal (no bridge)
- `npm run task-runner:dry` - Dry run (preview items only)
- `npm run task-runner:bridge` - Start the bridge so "AI To Work" can run from the browser

## Code Style Guidelines

### Import Conventions

- Use `@/` alias for src imports (e.g., `@/hooks/useProjects`)
- Group imports: React hooks, external libraries, internal modules
- Always import types: `import type { User } from '@/types'`

### TypeScript Rules

- Use strict TypeScript mode
- Prefer interfaces over types for objects
- Use enums for constants with semantic meaning
- Never use `any` - use `unknown` or proper typing
- Use generated Supabase types from `@/integrations/supabase/types`

### Naming Conventions

- Components: PascalCase (`ProjectCard.tsx`)
- Files: kebab-case for utilities (`date-utils.ts`)
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- Hooks: `use` prefix (`useProjects`)
- Functions: verb-noun (`fetchProjects`)

### Formatting & Style

- 2-space indentation
- No semicolons
- Use single quotes
- Max line length: 100 characters
- No Prettier - use ESLint rules only

### Error Handling

- Use try/catch for async operations
- Return Result type or throw for errors
- Never return mixed success/error types
- Use React Error Boundaries for component errors
- Validate forms with Zod schemas

### Component Patterns

- Use React 19 features (Server Components where applicable)
- Functional components only - no classes
- Props interface required for all components
- Use children prop for composition
- Memoize expensive computations with `useMemo`
- Use `useCallback` for event handlers

- For Tailwind glass-style button variants: when defining `glass-style-*` variants
   (e.g. `glass-style-white`, `glass-style-dark`, `glass-style-destructive`),
   include the important modifier `!rounded-full` so that size classes
   (like `sm`, `lg`, or explicit `rounded-md`) do not override the desired
   fully-rounded glass appearance.

### State Management

- TanStack Query for server state
- Zustand for global client state
- React Context for theme/auth
- Local state with `useState`/`useReducer`

### Database Integration

- **CRITICAL**: NO MOCK DATA in production code
- All data must come from Supabase via hooks
- Use RLS policies for security
- Helper functions: `has_project_access()`, `has_role()`
- Never bypass RLS or use service role keys client-side

## Architecture

### Frontend Stack

- **React 19 + React Router 7** with **Vite 7**
- **UI**: Tailwind + shadcn/ui (Radix primitives)
- **Data**: TanStack Query + Supabase client
- **Forms**: React Hook Form + Zod validation
- **i18n**: i18next (en-US, es-ES, fr-FR, pt-BR)

### Backend (Supabase)

- **URL**: `https://dev.castorworks.cloud` (self-hosted)
- **Services**: Auth + Postgres + Storage + Realtime + Edge Functions
- **Access**: Remote HTTPS only (no local CLI)
- **Security**: RLS mandatory on all tables

### Running SQL Scripts & Migrations

Since Supabase is self-hosted in a remote Docker container, SQL scripts and migrations must be executed directly on the remote database container. **DO NOT** attempt to use local Supabase CLI or direct database connections.

#### SSH Access Configuration

**CRITICAL**: Use the configured SSH host alias and key for all remote operations:

```bash
# SSH config (~/.ssh/config) contains:
Host castorworks
    HostName dev.castorworks.cloud
    User root
    IdentityFile ~/.ssh/castorworks_deploy

# Test connection:
ssh -i ~/.ssh/castorworks_deploy castorworks "echo 'SSH connection successful'"
```

**Common Issues:**

- ❌ `ssh amacedo@castorworks.cloud` - Wrong username (use configured alias)
- ❌ `ssh user@castorworks.cloud` - Wrong username and hostname
- ❌ Using `id_rsa` key - Wrong SSH key (use `castorworks_deploy`)

#### File Transfer Process

1. **Copy SQL files to remote host:**

   ```bash
   scp -i ~/.ssh/castorworks_deploy /path/to/script.sql castorworks:/tmp/
   ```

2. **Execute SQL script in database container:**

   ```bash
   ssh -i ~/.ssh/castorworks_deploy castorworks \
     "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/script.sql"
   ```

#### Complete Migration Workflow

```bash
# 1. Copy migration file to remote
scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260128_example.sql castorworks:/tmp/

# 2. Execute migration
ssh -i ~/.ssh/castorworks_deploy castorworks \
  "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260128_example.sql"

# 3. Verify results (optional)
ssh -i ~/.ssh/castorworks_deploy castorworks \
  "docker exec -i supabase-db psql -U postgres -d postgres -c 'SELECT * FROM your_table;'"
```

#### Container Details

- **Container Name**: `supabase-db` (NOT `supabase_postgres`)
- **Database**: `postgres`
- **User**: `postgres`
- **Location**: `/root/supabase-CastorWorks/` on remote host

#### Troubleshooting

**"Permission denied" errors:**

- Verify SSH key: Use `~/.ssh/castorworks_deploy` (not `id_rsa`)
- Use host alias: `castorworks` (not direct hostname)
- Check SSH config: `cat ~/.ssh/config`

**"Container not found" errors:**

- Container name is `supabase-db` (not `supabase_postgres`)
- Verify container is running: `ssh castorworks "docker ps"`

**SQL execution fails:**

- Ensure file was copied correctly to `/tmp/` on remote host
- Check SQL syntax (BEGIN/COMMIT blocks, semicolons)
- Verify database connection: `docker exec -it supabase-db psql -U postgres -d postgres`

**File transfer issues:**

- Use absolute paths for local files
- Ensure remote `/tmp/` directory is writable
- Check file permissions after transfer

#### Migration File Naming Convention

- Format: `YYYYMMDD_description.sql`
- Example: `20260128_add_roadmap_items_status_update.sql`
- Location: `supabase/migrations/`

## Access Application

- Frontend: <http://localhost:5173>
- Supabase: Runs in Docker container on remote provider at `/root/supabase-CastorWorks/`
- Access Studio via SSH tunnel: `ssh -L 54323:localhost:54323 user@castorworks.cloud` then visit `http://localhost:54323`
- Or access directly via API: `https://dev.castorworks.cloud`

## AI Agent Usage (OpenCode)

When using OpenCode agents with this codebase:

### Getting Started

```bash
opencode                    # Start interactive mode
opencode --help             # List available commands
opencode --version          # Check version
```

### Common Workflows

- File analysis: `opencode analyze src/components/ProjectCard.tsx`
- Bug fixes: `opencode fix --file src/hooks/useProjects.ts`
- Feature development: `opencode create --type component --name NewFeature`
- Test writing: `opencode test --component ProjectCard`

### Testing with OpenCode

- Generate unit tests: `opencode test --unit src/components/ProjectCard.tsx`
- Generate integration tests: `opencode test --integration src/hooks/useProjects.tsx`
- Run tests: `opencode test:run`
- Coverage report: `opencode test:coverage`

### Code Review

- Review changes: `opencode review --branch feature/new-project`
- Security scan: `opencode security --scan`
- Performance check: `opencode performance --analyze`

## Critical Security Rules

### Database Access

- ✅ RLS enabled on ALL tables
- ✅ Use helper functions for policies
- ✅ Admin access: `has_role(auth.uid(), 'admin')`
- ❌ Never expose service role keys
- ❌ No direct SQL queries client-side

### Storage

- ✅ Use signed URLs for private buckets (≤ 3600s)
- ✅ Avoid `getPublicUrl()` for private data
- ❌ No unprotected file access

### Client Security

- ✅ Sanitize HTML with DOMPurify
- ✅ All config via `VITE_*` environment variables
- ❌ No hardcoded secrets or keys

## Internationalization

- All strings must use i18n system
- Support 4 languages: en-US, es-ES, fr-FR, pt-BR
- JSON bundles in `src/locales/`
- No hardcoded strings in components
- Use `useTranslation()` hook

## File Structure

```
src/
  components/
    ui/                     shadcn/ui primitives
    Architect/              architect portal
    ClientPortal/           client portal
    Schedule/               calendar components
    Financial/              financial components
    Settings/               settings panels
  hooks/                    Supabase + business logic
  contexts/                 global contexts
  utils/                    pure utilities
  locales/                  i18n bundles
  integrations/supabase/    Supabase client
```

## What We DON'T Use

- Vue/Angular/Next.js
-- Jest/Cypress (use Vitest/agent-browser)
- Prettier/Husky
- Webpack/Rollup/esbuild (use Vite)
- Redux (use Zustand/TanStack Query)

## Complete QA Workflow for Production Readiness

This workflow ensures code is clean, tested, and ready for deployment. Follow these steps meticulously:

### Phase 1: Initial Assessment

1. **Read Documentation**
   - Read `AGENTS.md` (this file) for project context
   - Read `READMEDev.md` for detailed setup and guidelines
   - Understand the codebase structure and conventions

### Phase 2: Local Quality Checks

2. **Run Full CI Pipeline Locally**
   ```bash
   npm run ci
   ```
   This runs: `lint` → `validate:json` → `test:run` → `build`

3. **Identify and Fix Issues**
   
   **Common Issues to Watch For:**
   
   - **ESLint Errors**: Fix all linting errors (e.g., `prefer-const`, unused variables)
   - **JSON Validation**: Ensure all translation files are valid and consistent across languages
   - **Test Failures**: Fix any failing tests (check for wrong error types, incorrect mocks)
   - **Build Errors**: Resolve TypeScript or Vite build issues
   
   **Translation Consistency**: If adding new UI features, ensure all 4 languages have translations:
   - `src/locales/en-US/common.json`
   - `src/locales/pt-BR/common.json`
   - `src/locales/es-ES/common.json`
   - `src/locales/fr-FR/common.json`

4. **Deno/Edge Function Checks**
   ```bash
   cd supabase/functions && deno lint
   ```
   - Fix any unused variables (prefix with `_` if intentional)
   - Ensure all TypeScript is valid

### Phase 3: Pre-Commit Validation

5. **Stage Changes and Run Pre-Commit**
   ```bash
   git add <files>
   git commit -m "<descriptive message>"
   ```
   The pre-commit hook will automatically:
   - Validate JSON files
   - Run security tests (RLS policies, data leakage)
   - Check TypeScript compilation
   - Bump version in package.json

### Phase 4: GitHub CI Monitoring

6. **Push and Monitor CI**
   ```bash
   git push origin main
   ```
   
   **Monitor These Workflows:**
   - `Deno` - Edge function linting (should pass in ~20s)
   - `Lint Hooks` - Full test suite (takes ~2-3 minutes)
   - `Deploy to Production` - Build and deploy (takes ~4-5 minutes)

7. **Fix Any CI Failures**
   
   If CI fails:
   - Check logs with: `gh run view <run-id> --log`
   - Fix issues locally
   - Commit and push again
   - Repeat until all workflows pass

### Phase 5: Verification

8. **Confirm All Green**
   ```bash
   gh run list --limit 5
   ```
   Ensure all recent runs show `success` status.

### Success Criteria

✅ All workflows passing:
- Deno linting
- Lint & Test
- Deploy to Production

✅ No errors in:
- ESLint
- JSON validation
- TypeScript compilation
- Unit tests

✅ Version bumped appropriately

## Required Workflow

1. Create branch from main
2. Run tests before committing
3. Use `npm run lint` and `npm run test:run`
4. Create PR with detailed description
5. Ensure CI passes before merge
6. Update CHANGELOG.md for releases

You must read `READMEDev.md` for additional setup and contribution guidelines.
