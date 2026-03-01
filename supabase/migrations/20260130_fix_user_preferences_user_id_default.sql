-- Fix user_preferences user_id default value
-- The column was changed to UUID type but still has TEXT default 'default'
-- This causes "invalid input syntax for type uuid: 'default'" errors

-- Remove the invalid default and make user_id required without default
-- The application always provides user_id, so no default is needed
ALTER TABLE public.user_preferences 
  ALTER COLUMN user_id DROP DEFAULT;

-- Delete any rows that might have 'default' as user_id (orphaned rows)
DELETE FROM public.user_preferences 
WHERE user_id::text = 'default' 
   OR user_id IS NULL;

-- Add a trigger to ensure user_id is always set on insert
CREATE OR REPLACE FUNCTION public.ensure_user_preferences_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null for user_preferences';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS ensure_user_preferences_user_id_trigger ON public.user_preferences;

-- Create the trigger
CREATE TRIGGER ensure_user_preferences_user_id_trigger
  BEFORE INSERT ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_preferences_user_id();
