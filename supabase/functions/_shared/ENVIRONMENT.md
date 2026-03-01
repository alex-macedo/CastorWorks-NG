
# Required environment variables for server-side functions

- `SUPABASE_URL`: Public Supabase URL (for example: dev.castorworks.cloud)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-only)
- `RESEND_API_KEY`: Resend API key for sending emails
- `TWILIO_ACCOUNT_SID`: Twilio account SID for WhatsApp messages
- `TWILIO_AUTH_TOKEN`: Twilio auth token for WhatsApp messages
- `TWILIO_WHATSAPP_FROM`: Twilio WhatsApp-enabled number (E.164, e.g. `+14155238886`) — primary for WhatsApp
- `TWILIO_WHATSAPP_CONTENT_SID`: (Optional) Default Content Template SID (e.g. `HX...`) for template-based messages
- `TWILIO_FROM_NUMBER`: (Deprecated) Use `TWILIO_WHATSAPP_FROM` for WhatsApp
- `WHATSAPP_PHONE_NUMBER_ID`: (Optional) Meta WhatsApp Cloud API — only if using whatsapp-webhook / Meta
- `WHATSAPP_ACCESS_TOKEN`: (Optional) Meta WhatsApp Cloud API — only if using whatsapp-webhook / Meta
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: (Optional) Meta WhatsApp Business Account ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: Webhook verification token (for Meta whatsapp-webhook if used)
- `REDIS_URL`: Redis connection URL for BullMQ (e.g., redis://default:password@host:port)
- `ANTHROPIC_API_KEY`: Anthropic API key (optional; preferred if present)
- `OPENAI_API_KEY`: OpenAI API key (used if Anthropic is not present)
- `OPENROUTER_API_KEY`: OpenRouter API key (universal fallback)

Notes:

- Keep all keys secret and only configure them in your Supabase function environment or your deployment secrets store.
- For Twilio WhatsApp, ensure the number is WhatsApp-enabled and approved. Recipients must have opted-in where required by WhatsApp policy.
- To enable WhatsApp in the app: set `integration_settings.is_enabled = true` for `integration_type = 'whatsapp'` (e.g. via SQL or admin UI).

