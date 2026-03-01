-- Migration: Move OLLAMA endpoint from local/container host to remote Hostinger VPS
-- Created: 2026-02-15
-- Description: Removes dependency on local OLLAMA container and points provider endpoint
--              to dedicated remote AI VPS at 148.230.83.71.

UPDATE public.ai_provider_configs
SET
  api_endpoint = 'http://148.230.83.71:11434/api/chat',
  default_model = 'llama3.2:1b',
  updated_at = now()
WHERE provider_name = 'ollama'
  AND (
    api_endpoint = 'http://127.0.0.1:11434/api/chat'
    OR api_endpoint = 'http://localhost:11434/api/chat'
    OR api_endpoint = 'http://castorworks_ollama:11434/api/chat'
    OR api_endpoint LIKE 'http://172.17.%:11434/api/chat'
    OR api_endpoint = 'http://148.230.83.71:11434/api/chat'
  );

DO $$
DECLARE
  current_endpoint TEXT;
BEGIN
  SELECT api_endpoint INTO current_endpoint
  FROM public.ai_provider_configs
  WHERE provider_name = 'ollama';

  RAISE NOTICE 'OLLAMA endpoint is now: %', current_endpoint;
END $$;
