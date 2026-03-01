# Troubleshooting

## “I can’t log in”

### Check env

- Verify `.env.local` exists and includes:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)

### Check Supabase URL

- If using self-hosted Supabase, confirm the URL is reachable and HTTPS is correct.

### Check browser storage

- Supabase sessions are persisted in localStorage.
- Clearing localStorage can reset a wedged auth state.

## “App is stuck on Loading…”

The boot loader blocks on:

- i18n init
- maintenance-mode check

Steps:

- open console and look for `i18next:` logs
- verify translation bundles exist and parse
- ensure the maintenance-mode endpoint/DB query is functioning

## “Stale UI / changes not showing”

Possible causes:

- TanStack Query caching (staleTime/gcTime)
- Service worker caching (PWA)

Steps:

- hard refresh
- in dev, consider unregistering service worker in browser devtools
- invalidate specific queries in code when you mutate data

## “Edge function errors”

Common cases:

- `401 Unauthorized`: missing/expired session
- `403 Forbidden`: role/project access denied
- `500 Internal`: missing secrets or third-party API failures

Debugging steps:

- verify you’re logged in (session exists)
- verify the edge function has required secrets set (`RESEND_API_KEY`, `OPENAI_API_KEY`, etc.)
- check server logs for the function (Supabase dashboard / self-hosted logs)

## “Uploads/downloads fail”

Common cases:

- bucket is private and you are trying to use a public URL
- storage path is malformed (wrong bucket/key inference)

Preferred pattern:

- store storage paths in DB
- resolve via signed URL (`resolveStorageUrl`) at access time

## “RLS blocked my query”

Symptoms:

- Supabase returns an empty result set (common), or an RLS error depending on operation and policy.

Steps:

- verify the row contains required ownership / project_id fields
- verify the current user is a project member / admin as required
- when adding new tables:
  - ensure RLS enabled and policies exist

## “Security suite failed”

Run:

```bash
npm run test:security
```

Read the failing step output:

- migrations scanner → fix permissive policy patterns
- rls policy scan → align with helper functions
- security tests → implement missing constraints


