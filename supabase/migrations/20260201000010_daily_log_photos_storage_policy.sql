-- =====================================================
-- Add Storage Policy for Daily Log Photos
-- =====================================================
-- Migration: 20260201000010
-- Description: Allow authenticated users to upload daily log photos
-- Uses has_project_access function for proper access control
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete daily log photos" ON storage.objects;

-- Policy for uploading daily log photos
-- Path format: {projectId}/daily-logs/{date}/{uuid}.jpg
CREATE POLICY "Users can upload daily log photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[2] = 'daily-logs' AND
  has_project_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Policy for viewing daily log photos
CREATE POLICY "Users can view daily log photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[2] = 'daily-logs' AND
  has_project_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Policy for deleting daily log photos
CREATE POLICY "Users can delete daily log photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[2] = 'daily-logs' AND
  has_project_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);
