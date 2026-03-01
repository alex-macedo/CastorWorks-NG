-- Add weather preferences columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS weather_location TEXT DEFAULT 'São Paulo, Brazil',
ADD COLUMN IF NOT EXISTS temperature_unit TEXT DEFAULT 'C';