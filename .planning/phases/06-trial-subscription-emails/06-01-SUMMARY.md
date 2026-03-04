# Phase 6 Plan 06-01 — Summary

**Completed:** 2026-03-04

## Delivered

### Migration: `supabase/migrations/20260306000000_trial_email_schema.sql`

- **tenants columns**
  - `primary_contact_email TEXT` — configurable primary contact
  - `opt_out_trial_emails BOOLEAN NOT NULL DEFAULT false` — tenant-level opt-out

- **trial_email_logs table** — audit trail
  - Columns: id, tenant_id, email_type, recipient_email, sent_at, status, created_at
  - RLS: authenticated read own tenant; service_role insert
  - Index on (tenant_id, email_type)

- **trial_reminder_due_candidates view**
  - Joins tenants (trial tier, trial_ends_at set, not opted out)
  - Yields due reminders at 7, 3, 1 days before expiry
  - Excludes tenants with existing trial_email_logs for that reminder type
  - Recipient: primary_contact_email or owner email from tenant_users + user_profiles

- **trial_expiration_email_queue table**
  - Enqueued by trigger when tenant moves trial → sandbox
  - Columns: id, tenant_id, created_at, processed_at

- **Trigger** `trigger_trial_expiry_enqueue`
  - AFTER UPDATE ON tenants
  - WHEN OLD.subscription_tier_id = 'trial' AND NEW.subscription_tier_id = 'sandbox'
  - INSERT INTO trial_expiration_email_queue (tenant_id) VALUES (NEW.id)

## Verification

- Migration runs without error (run via scp + docker exec per AGENTS.md)
- trial_reminder_due_candidates: returns 0 rows when no matching tenants
- Trigger fires when get_tenant_licensed_modules moves expired trial to sandbox
