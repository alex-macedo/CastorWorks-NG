-- ============================================================================
-- FORMS MODULE - Storage Bucket
-- ============================================================================
-- Migration: Create storage bucket for form file uploads
-- Description: Configures secure file upload storage with size/type limits
-- Author: CastorWorks Team
-- Date: 2026-02-01
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Authenticated users can upload to form-uploads
CREATE POLICY "authenticated_insert_form_uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'form-uploads' AND auth.role() = 'authenticated');

-- Form owners and collaborators can view uploaded files
-- Path format: form-uploads/{form_id}/{response_id}/{filename}
CREATE POLICY "Form owners can view uploaded files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-uploads'
    AND (
      -- Extract form_id from path (first segment)
      has_form_access(auth.uid(), (string_to_array(name, '/'))[1]::UUID, 'viewer')
      -- OR it's their own upload
      OR EXISTS (
        SELECT 1 FROM form_responses r
        WHERE r.id = (string_to_array(name, '/'))[2]::UUID
        AND r.respondent_id = auth.uid()
      )
    )
  );

-- Form admins can delete files
CREATE POLICY "Form admins can delete files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'form-uploads'
    AND has_form_access(auth.uid(), (string_to_array(name, '/'))[1]::UUID, 'admin')
  );

COMMIT;
