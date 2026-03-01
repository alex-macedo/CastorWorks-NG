-- Add quote-related fields to company_settings table
-- Description: Add additional_info and general_terms columns for quote generation functionality

BEGIN;

-- Add additional_info column for quote additional information
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Add general_terms column for quote general terms
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS general_terms TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.company_settings.additional_info IS 'Additional information text used when generating quotes';
COMMENT ON COLUMN public.company_settings.general_terms IS 'General terms and conditions text used when generating quotes';

COMMIT;