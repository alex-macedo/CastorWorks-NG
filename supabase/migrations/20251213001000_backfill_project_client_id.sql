-- Migration: Backfill project client_id from client_name
-- Timestamp: 2025-12-13 00:10:00
-- Purpose: Ensure projects are linked to clients when client_id is missing

-- Insert missing clients referenced by projects without client_id
WITH normalized_projects AS (
  SELECT DISTINCT
    trim(client_name) AS client_name
  FROM public.projects
  WHERE client_id IS NULL
    AND client_name IS NOT NULL
    AND trim(client_name) <> ''
)
INSERT INTO public.clients (name, status, avatar_initial, created_at, updated_at)
SELECT
  np.client_name,
  'Active',
  UPPER(LEFT(np.client_name, 2)),
  now(),
  now()
FROM normalized_projects np
WHERE NOT EXISTS (
  SELECT 1
  FROM public.clients c
  WHERE lower(c.name) = lower(np.client_name)
);

-- Backfill project client_id by matching client_name
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
WHERE p.client_id IS NULL
  AND p.client_name IS NOT NULL
  AND trim(p.client_name) <> ''
  AND lower(c.name) = lower(trim(p.client_name));
