-- Fix has_moodboard_access function to use correct role schema
-- The error was: "relation 'roles' does not exist"
-- The database uses user_roles table with app_role enum, not a separate roles table

-- Drop function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS has_moodboard_access(UUID, UUID) CASCADE;

-- Recreate helper function with correct schema
CREATE OR REPLACE FUNCTION has_moodboard_access(user_id UUID, project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin using correct has_role function
  IF has_role(user_id, 'admin'::app_role) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is project owner (client)
  IF EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = has_moodboard_access.project_id
    AND p.user_id = has_moodboard_access.user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a project team member (project manager)
  IF EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = has_moodboard_access.project_id
    AND ptm.user_id = has_moodboard_access.user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_moodboard_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_moodboard_access(UUID, UUID) TO public;

-- Recreate storage policies that were dropped with CASCADE
-- Storage path format: {projectId}/{timestamp}-{random}.{ext}
-- Extract project_id from path (first segment before /)

-- Drop existing policies if they exist (some may have survived CASCADE)
DROP POLICY IF EXISTS "Authorized users can upload moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update moodboard images" ON storage.objects;

-- Allow authorized users to upload
CREATE POLICY "Authorized users can upload moodboard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'architect-moodboards' 
  AND has_moodboard_access(
    auth.uid(), 
    (string_to_array(name, '/'))[1]::UUID
  )
);

-- Allow authorized users to read
CREATE POLICY "Authorized users can read moodboard images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'architect-moodboards'
  AND has_moodboard_access(
    auth.uid(), 
    (string_to_array(name, '/'))[1]::UUID
  )
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Public can read moodboard images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'architect-moodboards');

-- Allow authorized users to delete
CREATE POLICY "Authorized users can delete moodboard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'architect-moodboards'
  AND has_moodboard_access(
    auth.uid(), 
    (string_to_array(name, '/'))[1]::UUID
  )
);

-- Allow authorized users to update
CREATE POLICY "Authorized users can update moodboard images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'architect-moodboards'
  AND has_moodboard_access(
    auth.uid(), 
    (string_to_array(name, '/'))[1]::UUID
  )
);
