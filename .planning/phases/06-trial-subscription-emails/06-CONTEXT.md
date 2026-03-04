# Phase 6: Trial & Subscription Emails - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated email sequences for trial reminders (7, 3, 1 days before expiry) and trial expiration warning when expiry is detected. Recipients are owner or configurable primary contact. Users can opt out of trial emails.
</domain>

<decisions>
## Implementation Decisions

### Reminder Schedule
- Send trial reminders 7 days, 3 days, and 1 day before `trial_ends_at`.
- No additional reminder points beyond these three.

### Recipients
- Send to **owner only** when no primary contact is configured.
- Support **configurable primary contact** per tenant; when set, use that email instead of owner.
- Fallback: if primary contact is set, use it; otherwise owner's email.

### Email Content
- **Full-branded HTML** emails (consistent with `sendRegistrationEmail` pattern).
- Reuse or extend existing branded layout/template approach.

### Execution Model
- **Per-tenant per-reminder scheduling** — similar to `payment_reminder_due_candidates`.
- Use a table/view that yields due reminder candidates (tenant + reminder type + scheduled time).
- Single Edge Function invoked by cron processes due candidates.

### Expiration Email
- Send expiration warning **only when expiry is detected** (e.g. when `get_tenant_licensed_modules` or equivalent logic moves tenant from trial to sandbox).
- Not time-based; trigger on detection of expiry event.

### Opt-Out
- Support opting out of trial emails (user preference or tenant-level setting).
- Must be respected before sending any trial reminder or expiration email.

### Claude's Discretion
- Schema design for "configurable primary contact" (tenant-level field vs tenant_settings).
- Schema for opt-out (user_preferences, tenant_settings, or notifications table).
- Exact structure of trial_reminder_due_candidates view/table.
- Template file organization (inline HTML vs TSX like send-maintenance-notification).
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendEmailViaResend` in `supabase/functions/_shared/providers/resend.ts` — use for sending
- `sendRegistrationEmail` in `_shared/sendRegistrationEmail.ts` — branded HTML pattern
- `useTenantTrial` hook — already exposes `trial_ends_at`, `daysRemaining`, `isOnTrial`
- `execute-payment-reminders` — pattern: query view → process due candidates → send → log

### Established Patterns
- Resend API for email delivery (RESEND_API_KEY env)
- `tenant_users` has `user_id`, `is_owner`; auth.users / profiles for emails
- `tenants` has `trial_ends_at`, `subscription_tier_id`
- `get_tenant_licensed_modules` performs lazy expiry (UPDATE to sandbox when trial_ends_at &lt; now)

### Integration Points
- New Edge Function(s) for trial reminder processing
- Cron or external scheduler to invoke the Edge Function (like execute-payment-reminders)
- Expiration email: hook into expiry detection (get_tenant_licensed_modules or a trigger) to enqueue/send
- Opt-out: integrate with existing notification/preference tables if they exist; otherwise new schema
</code_context>

<specifics>
## Specific Ideas

- Reminder schedule: exactly 7, 3, 1 days before expiry.
- Primary contact is configurable per tenant (fallback to owner).
- Expiration email sent when expiry is detected, not on a schedule.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---
*Phase: 06-trial-subscription-emails*
*Context gathered: 2026-03-03*
