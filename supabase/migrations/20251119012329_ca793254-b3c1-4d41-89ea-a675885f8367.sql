-- Create estimate-files storage bucket for voice recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'estimate-files'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('estimate-files', 'estimate-files', false);
  END IF;
END;
$$;

-- RLS policies for estimate-files bucket
-- Allow authenticated users to upload their own voice recordings
DROP POLICY IF EXISTS "Users can upload their own voice recordings" ON storage.objects;
CREATE POLICY "Users can upload their own voice recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estimate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own voice recordings
DROP POLICY IF EXISTS "Users can read their own voice recordings" ON storage.objects;
CREATE POLICY "Users can read their own voice recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own voice recordings
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON storage.objects;
CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'estimate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
