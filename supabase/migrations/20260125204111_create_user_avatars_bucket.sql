-- Create User Avatars Storage Bucket
-- This migration creates the Supabase Storage bucket for user profile avatars

-- ============================================================================
-- 1. Create Storage Bucket for User Avatars
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  false, -- Private bucket - access via signed URLs
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Create Storage Policies for User Avatars Bucket
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all avatars" ON storage.objects;

-- Policy: Users can upload their own avatars
-- Storage path format: {user_id}/avatar.{ext}
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own avatars and avatars of users they share projects with
CREATE POLICY "Users can view accessible user avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (
    -- Users can view their own avatar
    (storage.foldername(name))[1] = auth.uid()::text
    -- Users can view avatars of users they share projects with
    OR EXISTS (
      SELECT 1 
      FROM project_team_members ptm1
      JOIN project_team_members ptm2 ON ptm1.project_id = ptm2.project_id
      WHERE ptm1.user_id = auth.uid()
      AND ptm2.user_id::text = (storage.foldername(name))[1]
    )
    -- Admins can view all avatars
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
    )
  )
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
