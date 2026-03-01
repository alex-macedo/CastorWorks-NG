# Getting Started (Local Dev)

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- (Optional) Supabase CLI / Docker if you run a local Supabase stack (this repo also supports remote self-hosted Supabase)

## Install

```bash
npm install
```

## Environment variables

The frontend expects Supabase configuration via Vite env vars:

```bash
# .env.local (not committed)
VITE_SUPABASE_URL=https://dev.castorworks.cloud
VITE_SUPABASE_ANON_KEY=...
```

Notes:

- The code uses `VITE_SUPABASE_PUBLISHABLE_KEY` **if present**, otherwise falls back to `VITE_SUPABASE_ANON_KEY` (see `src/integrations/supabase/client.ts`).
- In browser contexts, `src/integrations/supabase/client.ts` normalizes the URL for HTTPS and clears the port for `dev.castorworks.cloud`.

## Run the app

Recommended:

```bash
./castorworks.sh start
```

Direct:

```bash
npm run dev
```

Full dev (frontend + translation API):

```bash
npm run dev:full
```

Default dev server port is **5173** (configurable via `VITE_PORT` in `vite.config.ts`).

## Key scripts (what you actually use in sprints)

- **dev**: `npm run dev`
- **build**: `npm run build`
- **lint**: `npm run lint`
- **unit tests**: `npm run test:run`
- **e2e tests**: `npm run test:e2e`
- **security suite**: `npm run test:security`
- **precommit gate**: `npm run precommit` (runs security checks + validations)

## First-run checklist (sanity)

- Can load `/login`
- Can authenticate against Supabase
- Can load `/` (Dashboard) after login
- Can open a Project page and see data load

## Common gotchas

### “Invalid API key” / Supabase auth failing

- Ensure `.env.local` is loaded and uses **VITE_** prefix.
- Ensure the configured Supabase URL matches your target environment (self-hosted vs local).

### “White screen” during boot

The app does a gated boot:

- i18n initialization (critical bundles)
- maintenance-mode check

If either hangs, you’ll see a loader. Check browser console for `i18next:` logs and maintenance logs.

### Allowed hosts / remote testing

`vite.config.ts` has `server.allowedHosts` including `*.castorworks.cloud` variants.

## Repo orientation (where things live)

High-signal directories:

- `src/App.tsx`: composition root (routing + providers)
- `src/pages/`: route-level pages
- `src/components/`: UI components (feature-based)
- `src/hooks/`: data/business logic hooks (TanStack Query lives here a lot)
- `src/utils/`: pure utilities
- `src/integrations/supabase/`: Supabase client and types
- `supabase/functions/`: Edge Functions (Deno runtime)
- `supabase/migrations/`: database schema + RLS policies
- `scripts/`: validation, security scanners, and operational scripts


