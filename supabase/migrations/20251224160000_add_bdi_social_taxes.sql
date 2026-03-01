-- Add Social Taxes column to app_settings table
BEGIN;

ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS bdi_social_taxes NUMERIC DEFAULT 22.0;

-- Update existing rows to set default value for new column if it is NULL
UPDATE public.app_settings
SET bdi_social_taxes = COALESCE(bdi_social_taxes, 22.0)
WHERE bdi_social_taxes IS NULL;

COMMIT;

