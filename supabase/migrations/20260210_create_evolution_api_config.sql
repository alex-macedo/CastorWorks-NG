-- Create evolution_api_config table for Evolution API server configuration
-- This table stores the API URL and credentials for connecting to Evolution API
-- Created: 2026-02-10

BEGIN;

-- Create the evolution_api_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.evolution_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT 'http://localhost:8080',
  api_key TEXT NOT NULL DEFAULT '',
  instance_name TEXT NOT NULL DEFAULT 'castorworks',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on is_active for faster lookups
CREATE INDEX IF NOT EXISTS idx_evolution_api_config_active 
  ON public.evolution_api_config(is_active);

-- Enable Row Level Security
ALTER TABLE public.evolution_api_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage evolution_api_config" ON public.evolution_api_config;
DROP POLICY IF EXISTS "Admins can view evolution_api_config" ON public.evolution_api_config;
DROP POLICY IF EXISTS "Allow admin full access to evolution_api_config" ON public.evolution_api_config;

-- Create RLS policy: Only admins can manage this configuration
CREATE POLICY "Admins can manage evolution_api_config"
  ON public.evolution_api_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default config if table is empty
INSERT INTO public.evolution_api_config (api_url, api_key, instance_name, is_active)
SELECT 'http://localhost:8080', '', 'castorworks', true
WHERE NOT EXISTS (SELECT 1 FROM public.evolution_api_config WHERE is_active = true);

COMMIT;
