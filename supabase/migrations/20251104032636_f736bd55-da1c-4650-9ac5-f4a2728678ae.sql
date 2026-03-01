-- Add missing columns to config_translations table
ALTER TABLE public.config_translations
ADD COLUMN IF NOT EXISTS review_notes text,
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone;

-- Add missing currency column to company_settings table
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL';

-- Add missing columns to suppliers table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email';
  END IF;
END $$;