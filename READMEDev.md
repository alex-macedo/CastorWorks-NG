# CastorWorks-NG Developer Guide

This guide is the practical onboarding document for engineers working in
`CastorWorks-NG`. It reflects the current repository, the actual helper scripts,
and the current split between legacy CastorWorks and the NG app.

Read this together with [AGENTS.md](./AGENTS.md). `AGENTS.md` is the policy file.
This document is the compact developer handbook.

## What This Repo Is

CastorWorks-NG is a React + Vite application for construction and engineering
project management. It includes:

- project operations and dashboards
- procurement, financial, and schedule flows
- architect and client portal experiences
- platform admin and multi-tenant tooling
- AI-assisted features
- Supabase-backed auth, storage, realtime, and edge functions

This repo is large and active. Prefer the existing helper scripts and repo
conventions over ad hoc setup.

## First Rules

- Do not modify existing legacy CastorWorks configuration when adding NG support.
- Prefer additive changes for NG hosts, ports, nginx, deploy scripts, and envs.
- Treat `AGENTS.md` as required context.
- Prefer `./castorworks.sh` for local startup.
- Use `agent-browser` for browser automation. Do not add Playwright-based E2E.

## Quick Start

### Prerequisites

- Node.js and npm
- local shell access
- SSH access to the remote CastorWorks host for DB and infra work
- working `.env` and `.env.testing`

### Install Dependencies

```bash
npm install
```

### Start The App

Preferred:

```bash
./castorworks.sh start
```

Useful helper commands:

```bash
./castorworks.sh stop
./castorworks.sh restart
./castorworks.sh clean
```

What the helper does:

- starts the NG Vite app on `5181`
- starts the translation API on `3001`
- avoids touching legacy CastorWorks on `5173`
- records the Vite PID in `.vite.pid`

### Local URLs

- NG app: [http://localhost:5181](http://localhost:5181)
- legacy CastorWorks may still use `http://localhost:5173`

## Daily Workflow

### Core Scripts

```bash
npm run lint
npm run validate:json
npm run i18n:validate
npm run test:run
npm run build
npm run ci
npm run ci:check
```

What they do:

- `npm run ci` runs `lint`, `i18n:validate`, `test:run`, and `build`
- `npm run ci:check` runs the local CI helper in `scripts/local-ci-check.sh`
- `npm run build` also copies `docs/` into `public/docs/`

### Before A Commit

The repo has a custom pre-commit flow in `scripts/pre-commit.js`. Depending on
what changed, it may:

- validate locale JSON
- scan edge functions and migrations for security issues
- run `bash scripts/test-security.sh`
- run a build
- bump the app version
- update the daily changelog

Do not be surprised if a commit changes versioning or changelog files.

## Testing

### Unit And Integration

```bash
npm test
npm run test:run
npm run test:coverage
```

Vitest is configured in [`vitest.config.ts`](./vitest.config.ts). The app also
defines test settings inside [`vite.config.ts`](./vite.config.ts).

### E2E And Browser Automation

Repo policy is `agent-browser`, not Playwright:

```bash
npm run test:e2e -- <pattern>
bash scripts/agent-browser-e2e.sh <pattern>
```

Important details:

- credentials come from `.env.testing`
- login automation is handled in `scripts/agent-browser-e2e.sh`
- screenshots are written to `test-results/`
- phase-specific docs live in `e2e/README-phase1-e2e.md` and
  `e2e/README-phase2-e2e.md`

Important gotcha:

- `scripts/agent-browser-e2e.sh` defaults most runs to port `5173`
- only selected patterns like `phase1*`, `phase2*`, `auth-signin-signup`, and
  `add-user` default to `5181`
- if you are testing NG features, verify the target `BASE_URL` before assuming
  the script is hitting the NG app

Another gotcha:

- the repo still contains legacy `e2e/*.spec.ts` files and a Playwright dev
  dependency
- policy is still to use `agent-browser` for E2E work in this repo

### Security And Policy Checks

```bash
npm run test:security
npm run test:rls:policies
```

## Repo Map

### Main App Entry

- [`src/main.tsx`](./src/main.tsx): bootstraps React, registers the PWA service
  worker, and mounts the app
- [`src/App.tsx`](./src/App.tsx): top-level providers, routing, guards, and lazy
  page loading

### Important Top-Level Directories

- [`src/components`](./src/components): UI and feature components
- [`src/pages`](./src/pages): route-level screens
- [`src/hooks`](./src/hooks): data access and business logic hooks
- [`src/contexts`](./src/contexts): auth, localization, tenant, tracking, and
  other shared providers
- [`src/integrations/supabase`](./src/integrations/supabase): Supabase client and
  generated types
- [`src/lib`](./src/lib): shared runtime utilities, logging, i18n, and AI helpers
- [`src/locales`](./src/locales): language bundles for `en-US`, `es-ES`,
  `fr-FR`, and `pt-BR`
- [`src/stores`](./src/stores): Zustand stores
- [`src/__tests__`](./src/__tests__): test suites
- [`e2e`](./e2e): browser automation scripts and E2E references
- [`scripts`](./scripts): developer, CI, security, migration, i18n, and testing
  helpers
- [`supabase`](./supabase): edge functions, config, and migrations
- [`docs/sprint-handbook`](./docs/sprint-handbook): deeper engineering handbook

### High-Level Route Areas

The app is broad. Major route groups currently include:

- core project and financial pages
- forms
- procurement and purchase orders
- roadmap and AI task runner flows
- architect workflows under `src/pages/architect`
- client portal flows under `src/pages/ClientPortal`
- mobile app pages under `src/pages/app`
- platform admin pages under `src/pages/Platform`

## Tech Stack

- React 19
- React Router 7
- Vite 7
- TypeScript with relaxed strictness
- Tailwind CSS 4 plus shadcn/ui and Radix primitives
- TanStack Query
- Zustand
- Supabase
- Vitest
- `agent-browser` for browser automation
- Vite PWA plugin

Important reality check:

- the codebase is not running TypeScript in strict mode
- `tsconfig.json` and `tsconfig.app.json` explicitly relax settings like
  `strict`, `noImplicitAny`, and `strictNullChecks`

## Internationalization

This repo is heavily localized. If you add UI text, update all language bundles.

Useful commands:

```bash
npm run i18n:scan
npm run i18n:check
npm run i18n:validate
npm run i18n:types
```

Key rules:

- use the existing i18n system instead of hardcoded strings
- validate JSON and translation consistency before finishing
- locale files live under `src/locales/*`

## Supabase And Database Workflow

This project uses a remote, self-hosted Supabase deployment. Do not assume a
local Supabase CLI workflow for migrations.

### What To Know

- API target in local Vite proxy defaults to `https://devng.castorworks.cloud`
- app auth, storage, realtime, and edge function requests are proxied through
  Vite during local development
- migrations live under [`supabase/migrations`](./supabase/migrations)
- edge functions live under [`supabase/functions`](./supabase/functions)

### Running Migrations

Use the remote Dockerized Postgres container over SSH.

Example flow:

```bash
scp -i ~/.ssh/castorworks_deploy supabase/migrations/<file>.sql castorworks:/tmp/
ssh -i ~/.ssh/castorworks_deploy castorworks \
  "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/<file>.sql"
```

Important details:

- SSH host alias: `castorworks`
- SSH key: `~/.ssh/castorworks_deploy`
- DB container: `supabase-db`
- DB name: `postgres`
- remote project path: `/root/supabase-CastorWorks/`

## PWA And Runtime Notes

The app is configured as a PWA through [`vite.config.ts`](./vite.config.ts).

Also note:

- service workers are explicitly disabled and cleared on
  `devng.castorworks.cloud` and `studiong.castorworks.cloud`
- local development still boots through the PWA registration path

## Conventions That Matter

- use `@/` imports for app code
- keep business logic in hooks, utils, and context layers rather than bloating
  pages
- use Supabase-backed data, not mock production data
- preserve RLS expectations for any new table or query path
- prefer additive NG changes over modifying legacy CastorWorks behavior

## Common Gotchas

- `README.md` still contains stale information like React 18, local Docker
  Supabase, and Playwright-based testing. Prefer this file and `AGENTS.md`.
- `READMEDev.md` used to be an oversized dump of mixed-current and stale facts.
  If this file drifts again, trust scripts and config over prose.
- `npm run dev` exists, but repo policy prefers `./castorworks.sh start` because
  it handles the expected NG port and the translation API.
- E2E targeting is inconsistent unless you check `scripts/agent-browser-e2e.sh`.
- pre-commit is not lightweight; it can build, run security checks, bump version,
  and update changelog files.

## Deeper Documentation

For deeper context, use the sprint handbook:

- [docs/sprint-handbook/README.md](./docs/sprint-handbook/README.md)
- [docs/sprint-handbook/02-architecture.md](./docs/sprint-handbook/02-architecture.md)
- [docs/sprint-handbook/04-supabase-and-data.md](./docs/sprint-handbook/04-supabase-and-data.md)
- [docs/sprint-handbook/06-testing-and-quality.md](./docs/sprint-handbook/06-testing-and-quality.md)
- [docs/sprint-handbook/12-agents-and-automation.md](./docs/sprint-handbook/12-agents-and-automation.md)

## Recommended First Read For New Engineers

1. [AGENTS.md](./AGENTS.md)
2. [READMEDev.md](./READMEDev.md)
3. [src/main.tsx](./src/main.tsx)
4. [src/App.tsx](./src/App.tsx)
5. [package.json](./package.json)
6. [scripts/agent-browser-e2e.sh](./scripts/agent-browser-e2e.sh)
7. [docs/sprint-handbook/README.md](./docs/sprint-handbook/README.md)
