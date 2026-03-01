-- Create storage bucket for content hub documents
-- Run this in the Supabase SQL editor or via migration

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('content-documents', 'content-documents', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket
-- Policy: Anyone can view documents (for published content)
CREATE POLICY "Public documents can be viewed"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'content-documents'
    AND EXISTS (
      SELECT 1 FROM content_hub
      WHERE content_hub.document_url LIKE '%' || storage.objects.name
      AND content_hub.status = 'published'
    )
  );

-- Policy: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content-documents'
    AND auth.role() IN ('authenticated', 'admin', 'editor')
  );

-- Policy: Admins and editors can delete documents
CREATE POLICY "Admins and editors can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content-documents'
    AND auth.role() IN ('admin', 'editor')
  );
