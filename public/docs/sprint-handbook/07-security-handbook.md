# Security Handbook (Non‑Negotiables)

This project relies on Supabase + RLS for its security boundary. Client-side checks improve UX, but **do not** enforce security.

## Database security (RLS)

### Rules

- **RLS must be enabled on every table.**
- Policies must avoid permissive patterns (`USING (true)`, `WITH CHECK (true)`).
- Prefer access helper functions:
  - `has_project_access(auth.uid(), ...)`
  - `has_project_admin_access(auth.uid(), ...)`
  - `has_role(auth.uid(), 'admin')`
- Roles are modeled via `user_roles` (do not store a single role column on `user_profiles`).

### Enforced checks

Run:

```bash
npm run test:security
```

This is the gate that catches:

- dangerous RLS patterns in migrations
- permissive policies
- security-focused tests

## Edge functions security

### Rules

- Authenticate first (before any DB ops):
  - Prefer `authenticateRequest(req)` from `supabase/functions/_shared/authorization.ts`.
- For privileged operations:
  - Use `createServiceRoleClient()` server-side only.
  - Never expose service role keys to the client.
- For project-scoped operations:
  - Validate project access via `verifyProjectAccess(...)` or `verifyProjectAdminAccess(...)`.
- For admin operations:
  - Validate `verifyAdminRole(...)`.

### Error responses

Prefer returning safe errors to clients:

- `createErrorResponse(error, corsHeaders)` from `_shared/errorHandler.ts`.

## Storage security

### Rules

- Treat buckets as private unless explicitly meant to be public.
- Store **storage paths** in DB and resolve them to signed URLs at access time.
- Signed URL TTL guidance:
  - ≤ 3600 seconds for most UI access
  - longer TTL only when required (e.g., long-lived external emails), and only if acceptable for the threat model

### Canonical helpers

- Frontend: `src/utils/storage.ts` → `resolveStorageUrl(...)`
- Shared helper: `src/utils/supabaseStorage.ts` → `getSignedUrl(...)`

## XSS safety (DOM / HTML rendering)

### Rules

- Never render user-generated HTML without sanitization.
- If you must use `dangerouslySetInnerHTML`, sanitize via DOMPurify with a strict allowlist.

### Current hotspots to be aware of

This repo contains `dangerouslySetInnerHTML` in a few locations (example categories):

- **Email preview rendering** (HTML preview)
- **CSS injection for chart theming** (style tag generation)

Guidance:

- For HTML previews: sanitize using DOMPurify before rendering.
- For CSS injection: ensure inputs are constrained to safe tokens (colors), and never include user-provided strings.

## Secrets management

- Client code must not contain service role keys.
- All secrets live in env vars:
  - `VITE_*` for client-exposed values (public anon key only)
  - `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc. in edge function secrets

## Quick “before you ship” checklist (security-sensitive changes)

If your change touches:

- `supabase/migrations/*`
- `supabase/functions/*`
- auth / authorization
- file upload/download
- any HTML rendering

Then:

- run `npm run test:security`
- check for `dangerouslySetInnerHTML` usage and ensure sanitization
- check for `getPublicUrl` usage on private buckets; use signed URLs instead


