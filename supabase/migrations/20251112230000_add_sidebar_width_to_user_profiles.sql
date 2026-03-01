-- Add sidebar_width field to user_profiles for storing user's preferred sidebar width
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS sidebar_width NUMERIC DEFAULT 256;

COMMENT ON COLUMN user_profiles.sidebar_width IS 'User preferred sidebar width in pixels (default: 256px = 16rem)';
