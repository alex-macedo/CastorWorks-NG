-- Create architect-moodboards storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('architect-moodboards', 'architect-moodboards', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete moodboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update moodboard images" ON storage.objects;

-- Helper function to check moodboard access
CREATE OR REPLACE FUNCTION has_moodboard_access(user_id UUID, project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = has_moodboard_access.user_id
    AND r.name = 'admin'
  ) THEN
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

-- Set up storage policies for architect-moodboards bucket
-- Storage path format: {projectId}/{timestamp}-{random}.{ext}
-- Extract project_id from path (first segment before /)

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

-- Allow public read access (since bucket is public, but RLS still applies for authenticated)
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
