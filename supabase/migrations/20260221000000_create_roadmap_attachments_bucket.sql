-- Create private storage bucket for roadmap item attachments (screenshots, documents).
-- Access controlled by RLS on roadmap_item_attachments; only authenticated users.
-- Path format: {roadmap_item_id}/{timestamp}-{random}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'roadmap-attachments',
  'roadmap-attachments',
  FALSE,
  10485760, -- 10 MB per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[];

-- Allow authenticated users to upload (path: roadmap_item_id/filename)
DROP POLICY IF EXISTS "Authenticated users can upload roadmap attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload roadmap attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'roadmap-attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to read (signed URLs; list/read still need SELECT)
DROP POLICY IF EXISTS "Authenticated users can read roadmap attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read roadmap attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'roadmap-attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete (e.g. when removing attachment record)
DROP POLICY IF EXISTS "Authenticated users can delete roadmap attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete roadmap attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'roadmap-attachments'
  AND auth.uid() IS NOT NULL
);
