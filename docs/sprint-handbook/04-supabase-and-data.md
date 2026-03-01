# Supabase & Data (Auth, RLS, Storage, Migrations)

## Supabase client (frontend)

The frontend uses a single `supabase-js` client exported from:

- `src/integrations/supabase/client.ts`

Key behaviors:

- Reads base URL from `VITE_SUPABASE_URL`.
- Uses `VITE_SUPABASE_PUBLISHABLE_KEY` if set, otherwise `VITE_SUPABASE_ANON_KEY`.
- Uses localStorage-based session persistence (`persistSession: true`) and token refresh (`autoRefreshToken: true`).

## Authentication model

### Browser auth

- Login is via Supabase Auth.
- Most app pages are protected by `AuthGuard` (client-side routing guard).
- **Do not rely on client-side guards for security**: RLS + server-side authorization must still hold.

### Edge function auth

Many edge functions use the shared helper:

- `supabase/functions/_shared/authorization.ts`

Important functions:

- `authenticateRequest(req)`
  - Requires `Authorization: Bearer <jwt>` header
  - Uses anon key client (`supabase.auth.getUser(token)`) to validate token
  - Returns `{ user, token }` or throws `"Unauthorized"`
- `createServiceRoleClient()`
  - Uses `SUPABASE_SERVICE_ROLE_KEY`
  - Used for privileged queries or operations (e.g., storage, multi-user email)
- `verifyProjectAccess(userId, projectId)`
  - Calls Postgres function `has_project_access`
- `verifyProjectAdminAccess(userId, projectId)`
  - Calls Postgres function `has_project_admin_access`
- `verifyAdminRole(userId)`
  - Calls Postgres function `has_role(userId, 'admin')`

## RLS (Row Level Security): the core invariant

In this codebase, **RLS is not optional**.

Expectations:

- Every table in `public` should have RLS enabled.
- Policies should rely on DB helper functions:
  - `has_project_access(auth.uid(), project_id_or_table_id)`
  - `has_role(auth.uid(), 'admin')`
- Avoid permissive patterns like `USING (true)` / `WITH CHECK (true)`.

### Security scanners

There is an enforced security suite:

- `npm run test:security`

This runs:

- migration scanners (dangerous policy patterns)
- RLS policy checks
- Vitest security tests
- JSON validation
- TypeScript compilation

See `scripts/test-security.sh`.

## Storage: signed URLs over public URLs

Most storage buckets are treated as private.

Patterns:

- Store **stable storage paths** in DB (e.g., `projectId/file.pdf`)
- Resolve to a signed URL at access time (1h+ TTL depending on use case)

Frontend helper:

- `src/utils/storage.ts` → `resolveStorageUrl(pathOrUrl, ttlSeconds)`

Shared helper used by edge functions:

- `src/utils/supabaseStorage.ts`
  - Provides `getSignedUrl(supabaseClient, bucket, path, ttl)`
  - Default TTLs: short (1h), medium (7d), long (1y)

**Note:** Some edge functions dynamically import `src/utils/supabaseStorage.ts` to reuse this helper.

## Database migrations

- Location: `supabase/migrations/`
- Migrations should:
  - be transactional when possible
  - enable RLS on new tables
  - add appropriate policies immediately
  - prefer helper functions for access checks

## PostgREST usage

Most frontend DB operations happen through `supabase-js`, not by calling PostgREST directly.

Examples:

- `supabase.from("scheduled_maintenance").select("*")`
- `supabase.from("project_team_members").select(...).eq(...).maybeSingle()`
- `supabase.rpc("get_client_project_summary")`

If you must reason about the underlying HTTP API:

- PostgREST base path: `/rest/v1/<table>`
- Auth: `Authorization: Bearer <jwt>` (Supabase client handles this)
- Responses: JSON, with error payloads including `code` and `message`


