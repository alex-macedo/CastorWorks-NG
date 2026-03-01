-- Migration: Fix OLLAMA API endpoint for Docker network access
-- Created: 2026-01-25
-- Description: Updates OLLAMA endpoint to use container hostname instead of localhost
--              This allows Edge Functions (running in Supabase container) to reach OLLAMA
--
-- CONTEXT:
--   The original endpoint (http://127.0.0.1:11434/api/chat) doesn't work because:
--   - Edge Functions run inside the Supabase Docker container
--   - 127.0.0.1 refers to the container itself, not the Docker host
--   - OLLAMA runs in a separate container (castorworks_ollama)
--
-- SOLUTION:
--   - OLLAMA container joins the Supabase Docker network
--   - Use container hostname (castorworks_ollama) for inter-container communication
--   - This is the standard Docker networking pattern for service discovery

-- Update OLLAMA endpoint to use Docker container hostname
UPDATE public.ai_provider_configs
SET
  api_endpoint = 'http://castorworks_ollama:11434/api/chat',
  updated_at = now()
WHERE provider_name = 'ollama'
  AND api_endpoint = 'http://127.0.0.1:11434/api/chat';

-- Also update if it was set to the Docker bridge gateway IP (previous fix attempt)
UPDATE public.ai_provider_configs
SET
  api_endpoint = 'http://castorworks_ollama:11434/api/chat',
  updated_at = now()
WHERE provider_name = 'ollama'
  AND api_endpoint LIKE 'http://172.17.%:11434/api/chat';

-- Log the change (for debugging)
DO $$
DECLARE
  current_endpoint TEXT;
BEGIN
  SELECT api_endpoint INTO current_endpoint
  FROM public.ai_provider_configs
  WHERE provider_name = 'ollama';

  RAISE NOTICE 'OLLAMA endpoint is now: %', current_endpoint;
END $$;
