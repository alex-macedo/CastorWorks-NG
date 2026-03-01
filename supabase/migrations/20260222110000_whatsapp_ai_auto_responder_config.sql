-- WA-8.1: AI Auto-Responder configuration
-- Adds ai_auto_responder_enabled to WhatsApp integration_settings
-- Apply with:
--   scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260222110000_whatsapp_ai_auto_responder_config.sql castorworks:/tmp/
--   ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260222110000_whatsapp_ai_auto_responder_config.sql"

BEGIN;

-- Ensure whatsapp integration_settings exists and add ai_auto_responder_enabled to configuration
INSERT INTO public.integration_settings (integration_type, is_enabled, configuration)
VALUES ('whatsapp', false, '{"provider": "twilio", "ai_auto_responder_enabled": false}'::jsonb)
ON CONFLICT (integration_type) DO UPDATE
SET configuration = COALESCE(
  integration_settings.configuration,
  '{}'::jsonb
) || jsonb_build_object(
  'ai_auto_responder_enabled',
  COALESCE((integration_settings.configuration->>'ai_auto_responder_enabled')::boolean, false)
);

COMMIT;
