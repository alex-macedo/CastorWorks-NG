# Frontend Patterns (How We Build Features)

## Folder conventions

- `src/pages/`: route-level pages (fetch and compose)
- `src/components/`: UI components (feature folders + `ui/` primitives)
- `src/hooks/`: data/business logic, usually TanStack Query wrappers
- `src/utils/`: pure helpers (formatting, storage URL resolution, etc.)
- `src/contexts/`: app-wide context providers (localization, config, chat, supervisor project)

## Data fetching (TanStack Query + Supabase)

### Query pattern

- **Queries** are typically small hooks under `src/hooks/`.
- Query keys are usually string arrays like `["scheduled-maintenance"]`.
- Errors are generally surfaced via:
  - thrown Supabase errors (Query handles them)
  - toast notifications on mutations.

### Mutation pattern

Mutations typically:

- do the `supabase.from(...).insert/update/delete(...)`
- invalidate query keys on success
- show toast notifications (success/error)

## Supabase client usage

Use the shared client:

```ts
import { supabase } from "@/integrations/supabase/client";
```

Key practice:

- Assume **RLS is enforced** server-side; always include required ownership/project IDs.
- Prefer **RPC functions** for complex access checks (e.g., `has_project_access`) and domain helpers.

## Client Portal authentication (RBAC)

The client portal uses role-based access, not “magic tokens”.

Key pieces:

- `validateClientPortalToken(projectId)` in `src/lib/clientPortalAuth.ts`
  - checks auth session
  - grants admin access if user has `user_roles.role = 'admin'`
  - else checks `project_team_members` membership for the given project
  - enforces an allowlist of roles for portal access:
    - `client`, `owner`, `project_manager`, `manager`, `admin`
- `useClientPortalAuth()` in `src/hooks/clientPortal/useClientPortalAuth.tsx`
  - runs validation via a query
  - stores the projectId in sessionStorage for convenience
  - redirects to `/login` on session expiry, `/portal-error` on access denied

### Usage example

In route guards/components, read the hook:

```ts
const { isLoading, isAuthenticated, role, projectId } = useClientPortalAuth();
```

## Storage access: always signed URLs for private buckets

The frontend resolves stored storage paths into signed URLs:

- `src/utils/storage.ts` exports `resolveStorageUrl(pathOrUrl, ttlSeconds)`
  - If `pathOrUrl` is a full `https://...` URL, it returns it unchanged.
  - Otherwise, it infers bucket + key and calls `supabase.storage.from(bucket).createSignedUrl(...)`.

This enables DB rows to store stable storage paths instead of expiring URLs.

## i18n patterns

- Initialization: `src/lib/i18n/i18n.ts`
  - synchronous “initial language” to prevent UI flash
  - critical bundles embedded
  - larger route-driven bundles can be loaded later
- Consumption:
  - `useTranslation()` from `react-i18next`, or
  - `useLocalization()` from `LocalizationContext` for shared helpers.

## UI primitives

shadcn/ui primitives live in:

- `src/components/ui/*`

When building new UI:

- Prefer existing primitives (Button, Dialog, Sheet, Table, etc.)
- Keep feature components in their domain folder (`src/components/Procurement/...`)

## Error handling & logging

- UI errors: toasts and inline messages.
- Edge function errors: `supabase.functions.invoke` returns `{ data, error }`, and code usually `throw error` for React Query / try/catch.
- Logging: there is a `logger` utility under `src/lib/logger` used in some flows; the app also contains a number of `console.*` calls (particularly around auth/i18n).

## Known XSS-sensitive patterns

There are a small number of `dangerouslySetInnerHTML` usages (e.g., email previews).

Rule of thumb:

- If any HTML can contain user-controlled content, **sanitize with DOMPurify** before rendering.
- For non-user input (e.g., CSS injected by a chart component), still keep the surface area minimal and ensure values are constrained.

See `07-security-handbook.md` for details.


