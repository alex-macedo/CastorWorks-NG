-- Add phone and city columns to user_profiles table
-- This allows storing additional user contact information

BEGIN;

-- Add phone column if it doesn't exist
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add city column if it doesn't exist
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.phone IS 'User phone number (optional)';
COMMENT ON COLUMN public.user_profiles.city IS 'User city (optional)';

COMMIT;
