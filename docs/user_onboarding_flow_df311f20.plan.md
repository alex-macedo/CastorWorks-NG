---
name: User onboarding flow
overview: Add an Onboarding sub-tab under Settings > Users so admins can see auth-only users (no profile/roles/preferences), confirm onboarding to create user_profiles, user_roles, and user_preferences, and send a welcome email when onboarding is complete.
todos: []
isProject: false
---

# User Onboarding Flow Plan

## Current state

- **Sign-up**: Users register via [src/pages/Login.tsx](src/pages/Login.tsx); they are created in `auth.users`. The app sends a "pending approval" email via `send-registration-email` and existing shared [supabase/functions/_shared/sendRegistrationEmail.ts](supabase/functions/_shared/sendRegistrationEmail.ts).
- **User list**: [supabase/functions/fetch-users-with-roles/index.ts](supabase/functions/fetch-users-with-roles/index.ts) returns only users who have at least one row in `user_roles`. Auth-only users (no profile/roles/preferences) never appear in **Settings > Users > User Management**.
- **Tables**: `user_profiles` (admin can INSERT via RLS), `user_roles` (admin-only INSERT), `user_preferences` (RLS allows only "insert own" — no admin insert). So creating preferences for another user must be done server-side (e.g. Edge Function with service role).

## Target flow

1. Admin opens **Settings > Users > Onboarding** and sees a list of **pending** users: in `auth.users` but with no row in `user_profiles`.
2. For each pending user, admin can **Confirm onboarding** (optional: choose default role, e.g. viewer).
3. On confirm: create `user_profiles`, `user_roles`, and `user_preferences` for that user, then send a **welcome / onboarding complete** email.
4. User receives an email stating that onboarding is complete and they can sign in.

---

## 1. Backend: List pending users

**New Edge Function**: `list-pending-onboarding-users`

- **Auth**: Same pattern as [fetch-users-with-roles](supabase/functions/fetch-users-with-roles/index.ts): Bearer token, then check `user_roles` for `admin` (or `global_admin`).
- **Logic**: Use admin client `supabase.auth.admin.listUsers()`, fetch all `user_profiles.user_id`, return auth users whose `id` is **not** in `user_profiles`. Return minimal payload: `id`, `email`, `created_at`, `user_metadata` (e.g. full_name) for display.
- **Location**: `supabase/functions/list-pending-onboarding-users/index.ts`.

---

## 2. Backend: Confirm onboarding (create profile, role, preferences + email)

**New Edge Function**: `confirm-user-onboarding`

- **Auth**: Admin-only (same as above).
- **Body**: `{ userId: string, defaultRole?: AppRole }`. Default role when omitted: e.g. `viewer`.
- **Logic** (service role client, so RLS is bypassed):
  1. Load auth user by `userId` (admin API). If not found, 400.
  2. If `user_profiles` already has `user_id`, optionally skip profile insert (idempotent) or update; else insert `user_profiles` (display_name from metadata/email, email, company_id from first company or null).
  3. Ensure at least one role: if no `user_roles` for this user, insert `user_roles` with `defaultRole` (or `viewer`).
  4. If no `user_preferences` for this user, insert one row with defaults (language, date_format, notification flags, etc. from app defaults or sensible defaults).
  5. Call shared **send onboarding-complete (welcome) email** (see below).
  6. Return `{ success: true }`.
- **Location**: `supabase/functions/confirm-user-onboarding/index.ts`.

**Shared welcome email**

- **New shared module**: e.g. `supabase/functions/_shared/sendOnboardingCompleteEmail.ts`.
- **Input**: `{ userEmail: string, userName?: string }`. Reuse company branding from `company_settings` (like [sendRegistrationEmail.ts](supabase/functions/_shared/sendRegistrationEmail.ts)).
- **Content**: Subject like "Welcome to {companyName} – your account is ready"; body: short welcome, "onboarding is complete", "you can now sign in", link to app if desired. No "pending approval" wording — this is the post-approval message.
- **Log**: Insert into `email_notifications` with type e.g. `user_onboarding_complete`.

---

## 3. Frontend: Onboarding tab and panel

**Settings structure**

- In [src/pages/Settings.tsx](src/pages/Settings.tsx), under the **Users** tab there is a nested `TabsList` with 3 triggers: User Management, Permission Management, Menu Order. Add a **fourth** trigger: **Onboarding**.
- New `TabsContent` for `onboarding` rendering a new component `OnboardingPanel`.

**New component**: `src/components/Settings/OnboardingPanel.tsx`

- **Data**: New hook `usePendingOnboardingUsers()` that calls `supabase.functions.invoke('list-pending-onboarding-users')` and returns the list (TanStack Query).
- **UI**: Card with title e.g. "Pending onboarding"; table or list of pending users (email, display name if present, created date). Each row: **Confirm onboarding** button and an optional **Role** dropdown (default "viewer"; options from existing `AppRole` / `ROLE_LABEL_KEYS`).
- **Action**: On Confirm, call `confirm-user-onboarding` with `{ userId, defaultRole }`. On success: invalidate `list-pending-onboarding-users` and `users-with-roles` queries, toast success. On error: toast error.
- **Empty state**: If no pending users, show a short message that all users are onboarded (and optionally link to User Management).
- **Access**: Same as User Management — only admins (already guarded by Settings page / RequireAdmin or role check).

**New hook** (optional but clean): `src/hooks/usePendingOnboardingUsers.ts` and `src/hooks/useConfirmOnboarding.ts` (mutation) to keep panel thin.

---

## 4. i18n

- Add keys under `settings` (and shared where needed) for:
  - Tab label: e.g. `settings:tabs.onboarding` ("Onboarding").
  - Panel title, description, table headers (email, name, date, role, actions).
  - Buttons: "Confirm onboarding".
  - Messages: "No pending users", "Onboarding complete", "User has been onboarded and will receive a welcome email."
  - Welcome email copy can be in a single shared template; if any text is configurable from the app, add locale keys.
- Add translations for **en-US, pt-BR, es-ES, fr-FR** in `src/locales/*/settings.json` (and common/auth if used). Run `npm run validate:json` before delivery.

---

## 5. Security and edge cases

- **RLS**: No change required. List and confirm run in Edge Functions with service role for DB writes; list only returns users without profile; confirm only creates profile/role/preferences for the requested `userId`.
- **Idempotency**: If for some reason the user already has a profile (e.g. trigger created it), confirm should still ensure at least one role and preferences row exist, and still send the welcome email so the flow is safe to run once per user.
- **Default role**: Default to `viewer`; admin can choose another role (e.g. `project_manager`, `admin_office`) in the Onboarding UI before confirming.

---

## 6. File and artifact summary


| Area           | Action                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| Edge Functions | Add `list-pending-onboarding-users/index.ts`, `confirm-user-onboarding/index.ts`                             |
| Shared         | Add `_shared/sendOnboardingCompleteEmail.ts`                                                                 |
| Frontend       | Add `OnboardingPanel.tsx`, hooks `usePendingOnboardingUsers` and `useConfirmOnboarding` (or inline in panel) |
| Settings       | In [Settings.tsx](src/pages/Settings.tsx): add Onboarding tab and content under Users                        |
| Locales        | Add onboarding strings to `settings` (and email template if needed) in en-US, pt-BR, es-ES, fr-FR            |


---

## Flow diagram

```mermaid
sequenceDiagram
  participant User
  participant Login
  participant Auth
  participant Admin
  participant Settings
  participant ListEF as list-pending-onboarding-users
  participant ConfirmEF as confirm-user-onboarding
  participant DB
  participant Email

  User->>Login: Sign up
  Login->>Auth: Create user
  Auth->>User: (no profile/roles/preferences)
  Note over Admin: Admin opens Settings > Users > Onboarding
  Admin->>Settings: Open Onboarding tab
  Settings->>ListEF: List pending users
  ListEF->>DB: auth.users + user_profiles
  ListEF-->>Settings: Pending list
  Settings->>Admin: Show pending users
  Admin->>Settings: Confirm onboarding (role)
  Settings->>ConfirmEF: confirm-user-onboarding(userId, role)
  ConfirmEF->>DB: Insert user_profiles, user_roles, user_preferences
  ConfirmEF->>Email: sendOnboardingCompleteEmail
  Email->>User: Welcome / onboarding complete
  ConfirmEF-->>Settings: success
  Settings->>Admin: Toast; refresh list
```



No database migrations are required: existing tables and RLS support admin creating profiles and roles; preferences are created server-side with the service role.