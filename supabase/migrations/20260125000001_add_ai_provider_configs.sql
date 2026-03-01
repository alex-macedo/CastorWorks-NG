-- Migration: Add AI Provider Configuration Infrastructure
-- Created: 2026-01-25
-- Description: Adds support for multiple AI providers (Anthropic, OpenAI, OLLAMA) with configurable settings

-- Create ai_provider_configs table
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE CHECK (provider_name IN ('anthropic', 'openai', 'ollama')),
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  api_endpoint TEXT,
  api_key_encrypted TEXT, -- For future encryption implementation
  default_model TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 1200 CHECK (max_tokens > 0 AND max_tokens <= 100000),
  temperature NUMERIC(3,2) DEFAULT 0.6 CHECK (temperature >= 0 AND temperature <= 2),
  config_json JSONB DEFAULT '{}'::jsonb,
  priority_order INTEGER DEFAULT 0, -- Lower number = higher priority
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add index for quick enabled provider lookups
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_enabled ON public.ai_provider_configs(is_enabled, priority_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ai_provider_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_ai_provider_configs_updated_at') THEN
    CREATE TRIGGER trigger_update_ai_provider_configs_updated_at
      BEFORE UPDATE ON public.ai_provider_configs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_ai_provider_configs_updated_at();
  END IF;
END $$;

-- Add columns to app_settings table for AI configuration
DO $$
BEGIN
  -- Check if columns don't already exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_settings'
    AND column_name = 'ai_default_provider'
  ) THEN
    ALTER TABLE public.app_settings
    ADD COLUMN ai_default_provider TEXT DEFAULT 'anthropic'
    CHECK (ai_default_provider IN ('anthropic', 'openai', 'ollama'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_settings'
    AND column_name = 'ai_fallback_chain'
  ) THEN
    ALTER TABLE public.app_settings
    ADD COLUMN ai_fallback_chain TEXT[] DEFAULT ARRAY['anthropic', 'openai'];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_settings'
    AND column_name = 'ai_cache_ttl_hours'
  ) THEN
    ALTER TABLE public.app_settings
    ADD COLUMN ai_cache_ttl_hours INTEGER DEFAULT 6
    CHECK (ai_cache_ttl_hours >= 1 AND ai_cache_ttl_hours <= 168);
  END IF;
END $$;

-- RLS Policies for ai_provider_configs
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "admin_manage_ai_configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "authenticated_view_ai_configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "service_role_full_access" ON public.ai_provider_configs;

-- Admin can manage all provider configs (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_manage_ai_configs"
  ON public.ai_provider_configs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view provider configs (needed for Edge Functions)
CREATE POLICY "authenticated_view_ai_configs"
  ON public.ai_provider_configs
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Service role has full access (for Edge Functions with service role client)
-- Using a check that validates the user has an internal system role
CREATE POLICY "service_role_full_access"
  ON public.ai_provider_configs
  FOR ALL
  TO service_role
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default provider configurations
INSERT INTO public.ai_provider_configs
  (provider_name, is_enabled, api_endpoint, default_model, max_tokens, temperature, priority_order, config_json)
VALUES
  (
    'anthropic',
    true,
    'https://api.anthropic.com/v1/messages',
    'claude-3-5-sonnet-20241022',
    1200,
    0.6,
    1,
    '{"supports_function_calling": true, "supports_streaming": true}'::jsonb
  ),
  (
    'openai',
    true,
    'https://api.openai.com/v1/chat/completions',
    'gpt-4o-mini',
    1200,
    0.6,
    2,
    '{"supports_function_calling": true, "supports_streaming": true}'::jsonb
  ),
  (
    'ollama',
    false,
    'http://castorworks_ollama:11434/api/chat',
    'llama3.1:8b',
    1200,
    0.6,
    3,
    '{"supports_function_calling": false, "supports_streaming": true, "available_models": ["llama3.1:8b", "mistral:7b", "gemma2:9b"]}'::jsonb
  )
ON CONFLICT (provider_name) DO NOTHING;

-- Update app_settings with AI configuration defaults if row exists
UPDATE public.app_settings
SET
  ai_default_provider = COALESCE(ai_default_provider, 'anthropic'),
  ai_fallback_chain = COALESCE(ai_fallback_chain, ARRAY['anthropic', 'openai']),
  ai_cache_ttl_hours = COALESCE(ai_cache_ttl_hours, 6)
WHERE id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.ai_provider_configs IS 'Configuration for AI providers (Anthropic, OpenAI, OLLAMA) used throughout the application';
COMMENT ON COLUMN public.ai_provider_configs.provider_name IS 'Unique identifier for the AI provider';
COMMENT ON COLUMN public.ai_provider_configs.is_enabled IS 'Whether this provider is currently active and available for use';
COMMENT ON COLUMN public.ai_provider_configs.api_endpoint IS 'Full URL to the provider API endpoint';
COMMENT ON COLUMN public.ai_provider_configs.api_key_encrypted IS 'Encrypted API key (future: use Supabase Vault)';
COMMENT ON COLUMN public.ai_provider_configs.default_model IS 'Default model/engine to use for this provider';
COMMENT ON COLUMN public.ai_provider_configs.max_tokens IS 'Maximum tokens for completion requests';
COMMENT ON COLUMN public.ai_provider_configs.temperature IS 'Sampling temperature (0.0 to 2.0)';
COMMENT ON COLUMN public.ai_provider_configs.config_json IS 'Provider-specific configuration (features, available models, etc.)';
COMMENT ON COLUMN public.ai_provider_configs.priority_order IS 'Priority for fallback chain (lower = higher priority)';
