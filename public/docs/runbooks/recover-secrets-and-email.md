# Recover API Keys from Previous Setup and Add to CastorWorks-NG

This runbook explains how to recover secrets (API keys) from the previous CastorWorks setup and add them to the new CastorWorks-NG Supabase so that email (and other integrations) work.

## Where secrets live in this project

- **Project root `.env.local`** holds the recovered API keys (RESEND_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.) for local development and reference.
- **Supabase / Edge Functions** read these from **`docs/.env.supabase`** (or the deployment env). The same values from `.env.local` are set there so the NG Supabase stack (Auth, Edge Functions) can send email and call AI APIs.
- **No API keys are stored in the database** — `integration_settings` holds only non-secret configuration (e.g. `{"provider": "resend"}`, feature flags).

To recover or rotate: copy from `.env.local` into `docs/.env.supabase` (or your deployment env), or from the previous CastorWorks `.env` / your password manager.

## Keys to recover and where they are used in NG

| Key | Used by | In NG |
|-----|--------|--------|
| **RESEND_API_KEY** | Email: registration, notifications, PO emails, AI bug monitor | Edge Functions read `Deno.env.get('RESEND_API_KEY')`. Set in Supabase env (e.g. `docs/.env.supabase` or deployment env). |
| **ANTHROPIC_API_KEY** | AI features, generate-construction-estimate, ai-suggest-reply | Edge Functions. Set in Supabase env if you use those functions. |
| **OPENAI_API_KEY** | transcribe-voice-input, other AI functions | Edge Functions. Set in Supabase env if used. |
| (Others from old `.env` as needed) | Various Edge Functions | Same: add to the Supabase/Edge Function environment. |

## 1. Add the email API key for Edge Functions

Edge Functions (e.g. `send-email-notification`, `send-registration-email`, `send-po-email`, `distribute-form`, `ai-bug-monitor`) expect **RESEND_API_KEY** in the environment.

**Steps:**

1. **RESEND_API_KEY** (and ANTHROPIC_API_KEY, OPENAI_API_KEY) are in **project `.env.local`** and have been added to **`docs/.env.supabase`** so the Supabase stack can use them. To recover or rotate: copy from `.env.local` or from the previous CastorWorks `.env` / Resend dashboard.
2. Ensure the **Supabase environment** used by your NG instance loads these variables:
   - **Self-hosted (e.g. Docker):** Add to the env file that the Supabase stack loads (e.g. `docs/.env.supabase` if that file is used by the deployment, or the host env for the container).
   - In that file, set:
     ```bash
     RESEND_API_KEY=<your-resend-api-key>
     ```
   - Ensure the process that runs **Edge Functions** (Deno) receives this variable (same env file or deployment config).
3. Restart or redeploy the Supabase stack (or at least the Edge Functions runtime) so the new env is picked up.

After this, any Edge Function that sends email via Resend will work as long as `integration_settings` has the email integration enabled (e.g. `is_enabled = true` for `integration_type = 'email'` where applicable).

## 2. Fix “Error sending recovery email” (Auth password reset)

Password recovery emails are sent by **Supabase Auth (GoTrue)**, not by an Edge Function. Auth uses **SMTP** configuration from the same Supabase env.

To use **Resend** for Auth recovery emails:

1. Use the **same Resend API key** you added above.
2. In the **same env file** used by the Supabase stack (e.g. `docs/.env.supabase`), set Auth SMTP to Resend:

   ```bash
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=<your-resend-api-key>
   SMTP_SENDER_NAME=CastorWorks
   SMTP_ADMIN_EMAIL=admin@yourdomain.com
   ```

   Replace `<your-resend-api-key>` with the actual key and `admin@yourdomain.com` with your desired “from” address (must be a verified domain in Resend if not using their sandbox).

3. Restart the **Auth** service (or the whole Supabase stack) so it reloads SMTP settings.

After this, “Forgot password?” will send emails via Resend and the “Error sending recovery email” should stop.

## 3. Optional: Copy integration_settings from old DB to new DB

If you want the same integration toggles and non-secret config (e.g. WhatsApp, Google) in NG:

1. From the **previous** CastorWorks database, export `integration_settings` (e.g. `SELECT * FROM public.integration_settings`).
2. In the **NG** database, insert or update rows in `public.integration_settings` (match `integration_type`; do **not** put API keys in `configuration` if the app expects them from env).
3. NG already seeds `email`, `whatsapp`, `google_drive`, `google_calendar`; adjust `is_enabled` and `configuration` as needed.

API keys must still be set in the Supabase environment as in sections 1 and 2; the DB holds only non-secret configuration.

## 4. Checklist

- [ ] Recover RESEND_API_KEY from CastorWorks `.env` or secrets store.
- [ ] Add RESEND_API_KEY to the Supabase/Edge Function environment for NG.
- [ ] Configure Auth SMTP for NG (Resend: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER_NAME, SMTP_ADMIN_EMAIL).
- [ ] Restart/redeploy Supabase (or Auth + Edge Functions) so new env is loaded.
- [ ] (Optional) Copy or recreate `integration_settings` rows from old DB to new DB; keep API keys in env only.
- [ ] Test: trigger “Forgot password?” and confirm recovery email is received.
- [ ] Test: trigger an action that sends email via an Edge Function (e.g. registration or PO email) and confirm it works.

## Reference: Resend

- SMTP: [Resend SMTP](https://resend.com/docs/send-with-smtp) — `smtp.resend.com`, port 465, user `resend`, password = your API key.
- API: Edge Functions use `https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>`.

Do not commit real API keys to the repo. Keep `docs/.env.supabase` (or the deployment env file) in `.gitignore` or a secure location.
