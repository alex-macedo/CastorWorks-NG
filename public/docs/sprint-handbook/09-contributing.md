# Contributing (How We Change This Codebase Safely)

## Guiding principles

- Prefer small, incremental changes.
- Preserve security invariants:
  - RLS everywhere
  - server-side auth checks for privileged operations
  - signed URLs for private storage
  - sanitize user-controlled HTML
- Optimize for maintainability over cleverness.

## Where to put new code

- **New routes/pages**: `src/pages/<Feature>.tsx`
- **New feature components**: `src/components/<Feature>/...`
- **New shared UI primitives**: `src/components/ui/...` (shadcn/ui style)
- **New data hooks**: `src/hooks/...`
- **New utilities**: `src/utils/...`
- **New types**: `src/types/...`
- **New edge function**: `supabase/functions/<name>/index.ts`
- **New migration**: `supabase/migrations/<timestamp>_<name>.sql`

## Pull request checklist

### Frontend-only change

- `npm run lint`
- `npm run test:run` (or targeted tests)
- manually sanity-check affected pages

### Any backend/security-sensitive change

If you touched:

- `supabase/migrations/*`
- `supabase/functions/*`
- auth/authorization
- storage access patterns

Then:

- `npm run test:security`

## Code style conventions

- TypeScript is in relaxed mode; still prefer explicitness for public APIs.
- Use `@/*` alias imports.
- Keep components small and focused; extract logic into hooks.
- Use TanStack Query for server state (avoid ad-hoc global state for backend data).

## Documenting changes

This handbook is sprint-oriented; if you add a new major capability:

- update the relevant handbook file(s) under `docs/sprint-handbook/`
- keep content practical: “how to use / extend / debug”

## Notes on AI assistants / agents

This repository has explicit safety expectations for agents:

- documentation files should live under `docs/` (this handbook follows that)
- major feature work is expected to be planned and validated with the security suite


