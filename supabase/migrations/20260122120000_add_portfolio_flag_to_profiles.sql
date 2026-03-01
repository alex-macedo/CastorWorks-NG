-- Add is_featured_on_portfolio column to user_profiles table
-- This allows architects to select which team members to display on their portfolio

BEGIN;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_featured_on_portfolio BOOLEAN DEFAULT false;

-- Update existing profiles to have a default value (optional, but good for consistency)
UPDATE public.user_profiles 
SET is_featured_on_portfolio = false 
WHERE is_featured_on_portfolio IS NULL;

-- Refresh the schema cache if needed (handled by Supabase usually)

COMMIT;
