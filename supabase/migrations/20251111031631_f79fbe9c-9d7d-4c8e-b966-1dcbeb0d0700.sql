-- Add number_format column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'compact' CHECK (number_format IN ('compact', 'full'));