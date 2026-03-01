-- Add company_id column to user_profiles table
-- This allows users to be associated with companies for multi-tenant support

BEGIN;

-- First, check if company_profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Create a default company if none exists (before adding the column reference)
INSERT INTO company_profiles (id, name)
SELECT gen_random_uuid(), 'Default Company'
WHERE NOT EXISTS (SELECT 1 FROM company_profiles LIMIT 1)
ON CONFLICT DO NOTHING;

-- Add company_id column to user_profiles if it doesn't exist
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;

-- Now create RLS Policy: Users can view companies they belong to
-- (This must come AFTER the column is added)
DROP POLICY IF EXISTS "Users can view their company" ON company_profiles;
CREATE POLICY "Users can view their company" ON company_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid() AND company_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);

-- Assign all existing users to the default company
UPDATE user_profiles
SET company_id = (SELECT id FROM company_profiles ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL;

-- Update RLS policy to allow users to see their own company_id
-- (The existing policy already allows users to see their own profile)

COMMIT;

