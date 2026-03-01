-- Story 3.3: Create Storage Bucket for Purchase Order PDFs
-- Epic 3: Purchase Order Generation & Supplier Communication
--
-- This migration creates a Supabase Storage bucket for storing purchase order PDF documents
-- with appropriate RLS policies for project-based access control.

-- ============================================================================
-- Create Storage Bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purchase-orders',
  'purchase-orders',
  true,  -- Public for read access (download URLs)
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf']::text[]  -- Only allow PDF files
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload PO PDFs to their projects" ON storage.objects;
-- Policy 1: Allow authenticated users to upload PDFs to their projects
CREATE POLICY "Users can upload PO PDFs to their projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'purchase-orders'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

DROP POLICY IF EXISTS "Users can update PO PDFs in their projects" ON storage.objects;
-- Policy 2: Allow authenticated users to update PDFs in their projects
CREATE POLICY "Users can update PO PDFs in their projects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'purchase-orders'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
)
WITH CHECK (
  bucket_id = 'purchase-orders'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

DROP POLICY IF EXISTS "Users can delete PO PDFs in their projects" ON storage.objects;
-- Policy 3: Allow authenticated users to delete PDFs in their projects
CREATE POLICY "Users can delete PO PDFs in their projects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'purchase-orders'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

DROP POLICY IF EXISTS "Users can view PO PDFs in their projects" ON storage.objects;
-- Policy 4: Allow authenticated users to view PDFs in their projects (project-scoped read access)
CREATE POLICY "Users can view PO PDFs in their projects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'purchase-orders'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

-- ============================================================================
-- Comments (skip if current user is not the owner)
-- ============================================================================

DO $block$
DECLARE
  is_owner BOOLEAN;
BEGIN
  SELECT (c.relowner = (SELECT usesysid FROM pg_user WHERE usename = CURRENT_USER))
  INTO is_owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'buckets' AND n.nspname = 'storage';

  IF is_owner THEN
    EXECUTE 'COMMENT ON TABLE storage.buckets IS ''Storage buckets for file uploads''';
  ELSE
    RAISE NOTICE 'Skipping comment on storage.buckets because current user is not the owner.';
  END IF;
END
$block$;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify bucket was created
-- SELECT * FROM storage.buckets WHERE id = 'purchase-orders';

-- Verify policies were created
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%PO%';
