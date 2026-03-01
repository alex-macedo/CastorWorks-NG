# Code Reference (Key Modules & APIs)

This is a “high-signal” code reference for the modules that most sprint work will touch.

## `AuthGuard` (`src/components/AuthGuard.tsx`)

**Purpose**

- Client-side route guard:
  - redirects unauthenticated users to `/login`
  - ensures the user has at least one role
  - role-based redirect: `site_supervisor` is redirected from `/` to `/supervisor/hub`

**Signature**

```ts
export function AuthGuard({ children }: { children: React.ReactNode }): JSX.Element
```

**Behavior**

- Calls `supabase.auth.getSession()`
- Subscribes to auth state changes via `supabase.auth.onAuthStateChange(...)`
- Loads roles via `useUserRoles(userId)`

**Edge cases**

- If the user has a session but **no roles**, a modal is shown; closing the modal signs the user out.
- Redirect logic intentionally avoids redirect loops (tracks `hasRedirected`).

## Client Portal auth helpers (`src/lib/clientPortalAuth.ts`)

### `validateClientPortalToken(projectId)`

**Purpose**

- Determine if the current authenticated user can access the client portal section for a given project.
- Despite the name, it is **RBAC-based**, not token-based.

**Signature**

```ts
export async function validateClientPortalToken(projectId: string): Promise<ClientPortalAuthContext | null>
```

**Steps**

1. `supabase.auth.getUser()`:
   - if missing → throws an `AuthError` with `isSessionExpired = true`
2. Check admin role via `user_roles`:
   - if admin → grant access immediately
3. Check membership via `project_team_members`:
   - must match `project_id` and `user_id`
   - role must be in allowlist:
     - `client`, `owner`, `project_manager`, `manager`, `admin`

**Returns**

- `ClientPortalAuthContext` when access is granted (includes `role`, `userName`, `userEmail`).
- `null` when access denied or membership check fails (non-session-expiry failures).

### Session storage helpers

- `storeClientPortalToken(projectId)` → stores `client_portal_project_id` in sessionStorage
- `getStoredClientPortalToken()` → returns stored projectId
- `clearClientPortalToken()` → removes cached projectId

## Client Portal hook (`src/hooks/clientPortal/useClientPortalAuth.tsx`)

### `useClientPortalAuth()`

**Purpose**

- Runs client portal auth check as a TanStack Query.
- Redirects on failure:
  - session expired → `/login`
  - access denied → `/portal-error`

**Return shape**

```ts
{
  authContext: ClientPortalAuthContext | null
  isLoading: boolean
  isAuthenticated: boolean
  error: unknown
  projectId?: string
  clientId?: string
  role?: string
  userName?: string
  refetch: () => Promise<...>
}
```

**Notes**

- Query key: `['clientPortalAuth', projectId]`
- `staleTime`: 5 minutes
- `retry`: false (auth failures should be explicit)

## i18n initialization (`src/lib/i18n/i18n.ts`)

### `getInitialLanguage()`

**Purpose**

- Resolve initial language synchronously (to avoid “English flash”).

**Logic**

- Reads cached `user-preferences-cache` from localStorage.
- Falls back to `navigator.language` mapping to `en-US`, `pt-BR`, `es-ES`, `fr-FR`.

### `i18nInitPromise`

**Purpose**

- Initialization promise awaited by `src/App.tsx` gating logic.

**Namespaces**

- Uses many namespaces (common, navigation, projects, procurement, supervisor, etc.).

## Storage URL resolution (`src/utils/storage.ts`)

### `resolveStorageUrl(pathOrUrl, ttlSeconds)`

**Purpose**

- Convert a stored storage path into a signed URL.

**Signature**

```ts
export async function resolveStorageUrl(pathOrUrl: string | null | undefined, ttl = 3600): Promise<string | null>
```

**Behavior**

- If `pathOrUrl` starts with `http://` or `https://` → returns unchanged.
- Otherwise infers:
  - bucket: `project-images` (default) or `delivery-photos`
  - key: path stripped of bucket prefix if present
- Calls `supabase.storage.from(bucket).createSignedUrl(key, ttl)`

**Common usage**

- For purchase order PDFs, the UI stores a storage path in DB; download uses `resolveStorageUrl(po.pdf_url)` before opening.

## Shared signed URL helper (`src/utils/supabaseStorage.ts`)

### `getSignedUrl(supabaseClient, bucket, path, ttl)`

**Purpose**

- Shared helper used by edge functions to generate signed URLs (works in Deno via `https://esm.sh` import types).

**Signature**

```ts
export async function getSignedUrl(
  supabaseClient: SupabaseClient,
  bucket: string,
  path: string,
  ttl?: number
): Promise<{ signedUrl?: string; error?: any }>
```

**Default TTLs**

- short: 1 hour
- medium: 7 days
- long: 1 year

## Chat assistant hook (`src/hooks/useChatAssistant.tsx`)

### `sendMessage(message)`

**Purpose**

- Adds the user message optimistically.
- Calls `ai-chat-assistant` edge function with `{ message, sessionId, context }`.
- Appends assistant response or an error message.

**Edge cases**

- If the edge function returns malformed payload, the hook throws an “Invalid response” error and renders a friendly error message into chat history.


