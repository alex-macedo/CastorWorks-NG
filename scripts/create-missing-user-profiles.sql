-- Script to create missing user_profiles for users who don't have them
-- This is useful when users are created in auth.users but don't have a corresponding profile

-- Create user_profiles for any auth.users who don't have one
INSERT INTO user_profiles (user_id, display_name, email)
SELECT
  au.id as user_id,
  COALESCE(au.raw_user_meta_data->>'display_name', au.email, 'User') as display_name,
  au.email
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Show the results
SELECT
  'Created ' || COUNT(*) || ' missing user profiles' as result
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = au.id
);

-- Verify all users now have profiles
SELECT
  au.id,
  au.email,
  up.display_name,
  CASE
    WHEN up.user_id IS NULL THEN '❌ Still Missing Profile'
    ELSE '✓ Has Profile'
  END as status
FROM auth.users au
LEFT JOIN user_profiles up ON up.user_id = au.id
ORDER BY au.created_at DESC;
