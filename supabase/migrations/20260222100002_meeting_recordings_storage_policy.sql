-- Storage policy for meeting recording audio files
-- Path format: {projectId}/meetings/{meetingId}/audio.webm

CREATE POLICY "Users can upload meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[2] = 'meetings' AND
  has_project_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can view meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[2] = 'meetings' AND
  has_project_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);
