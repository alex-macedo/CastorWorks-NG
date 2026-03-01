-- Story 4.1: Create Delivery Photos Storage Bucket
-- Epic 4: Delivery Confirmation & Payment Processing
--
-- This migration creates the Supabase Storage bucket for delivery confirmation photos

-- ============================================================================
-- 1. Create Storage Bucket for Delivery Photos
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-photos',
  'delivery-photos',
  true, -- Public bucket for easier access
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Create Storage Policies for Delivery Photos Bucket
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_select_delivery_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their delivery photos" ON storage.objects;

DROP POLICY IF EXISTS "Project admins can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "project_members_can_view_delivery_photos" ON storage.objects;
DROP POLICY IF EXISTS "Project admins can update delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Project admins can delete delivery photos" ON storage.objects;

-- Policy: Project admins can upload delivery photos scoped by project folder prefix (project_id/...)
CREATE POLICY "Project admins can upload delivery photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

-- Policy: Project members can view delivery photos
CREATE POLICY "project_members_can_view_delivery_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

-- Policy: Project admins can update delivery photos
CREATE POLICY "Project admins can update delivery photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
)
WITH CHECK (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

CREATE POLICY "Project admins can delete delivery photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.has_project_admin_access(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

-- ============================================================================
-- 3. Add Comment (only if current user owns storage.buckets)
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
    EXECUTE 'COMMENT ON TABLE storage.buckets IS ''Storage buckets including delivery-photos for delivery confirmation photos''';
  ELSE
    RAISE NOTICE 'Skipping comment on storage.buckets because current user is not the owner.';
  END IF;
END
$block$;
