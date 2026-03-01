-- Fix User Avatars Storage Policies to Allow Admins to Manage Any User's Avatar
-- This migration updates the storage policies to allow admins to upload, update, and delete
-- avatars for any user, not just their own.

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Policy: Users can upload their own avatars, OR admins can upload any avatar
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (
    -- Users can upload their own avatars
    (storage.foldername(name))[1] = auth.uid()::text
    -- OR admins can upload avatars for any user
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
    )
  )
);

-- Policy: Users can update their own avatars, OR admins can update any avatar
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (
    -- Users can update their own avatars
    (storage.foldername(name))[1] = auth.uid()::text
    -- OR admins can update avatars for any user
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
    )
  )
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (
    -- Users can update their own avatars
    (storage.foldername(name))[1] = auth.uid()::text
    -- OR admins can update avatars for any user
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
    )
  )
);

-- Policy: Users can delete their own avatars, OR admins can delete any avatar
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (
    -- Users can delete their own avatars
    (storage.foldername(name))[1] = auth.uid()::text
    -- OR admins can delete avatars for any user
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
    )
  )
);

COMMIT;
