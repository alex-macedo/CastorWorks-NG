
-- Migration: Add OpenRouter AI Provider
-- Created: 2026-02-10

BEGIN;

-- 1. Update check constraint on ai_provider_configs
ALTER TABLE public.ai_provider_configs 
DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_name_check;

ALTER TABLE public.ai_provider_configs 
ADD CONSTRAINT ai_provider_configs_provider_name_check 
CHECK (provider_name IN ('anthropic', 'openai', 'ollama', 'openrouter'));

-- 2. Update check constraint on app_settings
ALTER TABLE public.app_settings 
DROP CONSTRAINT IF EXISTS app_settings_ai_default_provider_check;

ALTER TABLE public.app_settings 
ADD CONSTRAINT app_settings_ai_default_provider_check 
CHECK (ai_default_provider IN ('anthropic', 'openai', 'ollama', 'openrouter'));

-- 3. Insert default configuration for OpenRouter
INSERT INTO public.ai_provider_configs
  (provider_name, is_enabled, api_endpoint, default_model, max_tokens, temperature, priority_order, config_json)
VALUES
  (
    'openrouter',
    false,
    'https://openrouter.ai/api/v1/chat/completions',
    'anthropic/claude-3.5-sonnet',
    1200,
    0.6,
    4,
    '{"supports_function_calling": true, "supports_streaming": true, "site_url": "https://castorworks.cloud", "site_name": "CastorWorks"}'::jsonb
  )
ON CONFLICT (provider_name) DO NOTHING;

COMMIT;
