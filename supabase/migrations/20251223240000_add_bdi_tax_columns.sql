-- Add missing BDI tax columns to app_settings table
-- These columns are needed for PIS, COFINS, and ISS tax percentages

BEGIN;

-- Add PIS column
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS bdi_pis NUMERIC DEFAULT 3.0;

-- Add COFINS column
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS bdi_cofins NUMERIC DEFAULT 5.0;

-- Add ISS column
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS bdi_iss NUMERIC DEFAULT 0.6;

-- Update existing rows with default values if they are NULL
UPDATE public.app_settings
SET
  bdi_pis = COALESCE(bdi_pis, 3.0),
  bdi_cofins = COALESCE(bdi_cofins, 5.0),
  bdi_iss = COALESCE(bdi_iss, 0.6)
WHERE bdi_pis IS NULL OR bdi_cofins IS NULL OR bdi_iss IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.app_settings.bdi_pis IS 'PIS tax percentage for BDI calculation';
COMMENT ON COLUMN public.app_settings.bdi_cofins IS 'COFINS tax percentage for BDI calculation';
COMMENT ON COLUMN public.app_settings.bdi_iss IS 'ISS tax percentage for BDI calculation';

COMMIT;

