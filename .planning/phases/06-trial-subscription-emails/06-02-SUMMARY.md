# Phase 6 Plan 06-02 — Summary

**Completed:** 2026-03-04

## Delivered

### Shared Modules

- **`supabase/functions/_shared/trialEmailCopy.ts`**
  - Locale copy for en-US, pt-BR, es-ES, fr-FR
  - reminder_7d, reminder_3d, reminder_1d, expiration (subject + body)
  - Placeholders: {{tenantName}}, {{daysLeft}}, {{expiryDate}}

- **`supabase/functions/_shared/trialEmailTemplates.ts`**
  - `buildTrialReminderHtml(tenantName, daysLeft, expiryDate, locale, copy)`
  - `buildTrialExpirationHtml(tenantName, locale, copy)`
  - Branded HTML matching sendRegistrationEmail pattern (Arial, blue header, notice boxes)

### Edge Function

- **`supabase/functions/execute-trial-emails/index.ts`**
  - Cron-invoked; no auth required
  - Process trial reminders: SELECT trial_reminder_due_candidates → send via Resend → INSERT trial_email_logs
  - Process expiration queue: SELECT unprocessed → fetch tenant → check opt_out → send → log → mark processed
  - Locale from tenants.settings->>'locale' or default en-US
  - Response: `{ remindersSent, expirationSent, errors }`

**Invocation:** POST /functions/v1/execute-trial-emails (daily via Supabase cron or external scheduler)

### i18n

- **trial.json** in en-US, pt-BR, es-ES, fr-FR
  - emails.reminder_7d_title, reminder_7d_body
  - emails.reminder_3d_title, reminder_3d_body
  - emails.reminder_1d_title, reminder_1d_body
  - emails.expiration_title, expiration_body

## Verification

- `deno lint` passes for execute-trial-emails and _shared modules
- `npm run validate:json` passes
