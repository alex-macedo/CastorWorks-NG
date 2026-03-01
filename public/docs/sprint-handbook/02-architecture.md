# Architecture (How the App Is Composed)

## Mental model: one SPA, three “sub-apps”

The UI is a single React SPA, but runtime behavior effectively splits into **three route families**:

- **Desktop app**: most routes, rendered inside a shared sidebar/topbar layout.
- **Supervisor mobile**: `/supervisor/*` routes, rendered without the desktop layout.
- **Client portal**: `/portal/:projectId/*` routes, guarded by portal-specific authorization logic.

All of this is wired in `src/App.tsx`.

## Composition root: `src/App.tsx`

`src/App.tsx` is the top-level module that:

- Creates the global TanStack Query client and caching defaults.
- Initializes i18n (and blocks rendering until critical bundles are ready).
- Checks if the system is in maintenance mode (and renders a maintenance page if so).
- Establishes providers (Theme, Tooltip, Localization, Router, Chat).
- Defines all route trees and their wrappers/guards.

### Boot gating (what blocks first render)

The app intentionally blocks the UI with a loader until:

- **i18n resources** are initialized, and
- **maintenance status** is loaded.

This avoids “English flash” and avoids showing app UI during active maintenance.

## Providers and global services

### TanStack Query

- Query client is created once at module scope.
- Default query behavior is optimized for perceived performance:
  - `staleTime` (freshness window)
  - `gcTime` (cache retention)
  - `refetchOnWindowFocus: false`
  - `refetchOnMount: false`
  - `retry: 1`

### i18n

- i18n is initialized from `src/lib/i18n/i18n.ts`.
- Initial language is resolved synchronously from localStorage cache.
- Critical translation bundles are embedded to avoid a round-trip on first paint.

### Chat (AI widget)

- `ChatProvider` wraps the app.
- Route changes are forwarded via a small event emitter to keep chat context (“current page”) in sync.

### Maintenance

- `isMaintenanceMode()` is checked early.
- Maintenance notifications are also enabled via a hook that requires QueryClientProvider.

## Routing layout and guards

### Public routes

Examples:

- `/login`
- `/approve/:token`
- `/po/acknowledge/:token`
- `/proposal/:token`

These are **not** wrapped with the desktop layout.

### Supervisor routes: `/supervisor/*`

Supervisor routes:

- Are wrapped with `AuthGuard`.
- Use `SupervisorProjectProvider` (project context for mobile supervisor flows).
- Do **not** render the desktop sidebar/topbar layout.

### Desktop routes: everything else

Most app functionality is behind:

- `AuthGuard` (authentication + role checks)
- `ConfigProvider` (dynamic config loaded from DB)
- `DesktopRouteLayout` (sidebar/topbar + main content wrapper)

### AuthGuard behavior (`src/components/AuthGuard.tsx`)

`AuthGuard` enforces:

- **Session existence** (redirects to `/login` if missing).
- **Role presence** (if user has no roles, shows a modal, then signs out).
- **Role-based redirect** for `site_supervisor` away from home (`/`) to `/supervisor/hub`.

This is a client-side guard; backend protections (RLS + Edge Function authorization) still matter.

## Data access boundary: Supabase

There are two ways data flows from backend to UI:

- **Direct DB access** via `supabase-js` PostgREST queries from the browser (governed by RLS).
- **Edge Functions** via `supabase.functions.invoke(...)` for:
  - external integrations (Resend, Google APIs, Weather API),
  - privileged workflows,
  - AI workflows and caching/usage tracking.

See `04-supabase-and-data.md` and `05-edge-functions-api.md`.

## PWA/offline considerations

Vite PWA config in `vite.config.ts`:

- Pre-caches static assets.
- Runtime caching strategies:
  - translations/config: `StaleWhileRevalidate`
  - images/fonts: `CacheFirst`
  - external APIs: `NetworkFirst`

This impacts debugging:

- Caching may serve stale responses during development if service worker is active.


