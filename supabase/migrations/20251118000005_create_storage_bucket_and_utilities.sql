-- =====================================================
-- Create Storage Bucket and Utility Functions
-- =====================================================
-- Migration: 20251118000005
-- Description: Storage bucket for estimate files and helper functions
-- =====================================================

-- =====================================================
-- 1. UTILITY FUNCTION (if not exists)
-- =====================================================

-- Function to update updated_at timestamp (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. STORAGE BUCKET FOR ESTIMATE FILES
-- =====================================================

-- Create storage bucket for estimate-related files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimate-files',
  'estimate-files',
  false, -- Private bucket (use signed URLs)
  52428800, -- 50MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'video/mp4',
    'video/quicktime', -- .mov
    'video/webm',
    'audio/mpeg', -- .mp3
    'audio/mp4', -- .m4a
    'audio/wav',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. STORAGE POLICIES
-- =====================================================

-- Users can upload files to their own folder
DROP POLICY IF EXISTS "Users can upload estimate files" ON storage.objects;
CREATE POLICY "Users can upload estimate files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read files in their own folder
DROP POLICY IF EXISTS "Users can view own estimate files" ON storage.objects;
CREATE POLICY "Users can view own estimate files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update files in their own folder
DROP POLICY IF EXISTS "Users can update own estimate files" ON storage.objects;
CREATE POLICY "Users can update own estimate files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete files in their own folder
DROP POLICY IF EXISTS "Users can delete own estimate files" ON storage.objects;
CREATE POLICY "Users can delete own estimate files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all estimate files
DROP POLICY IF EXISTS "Admins can manage all estimate files" ON storage.objects;
CREATE POLICY "Admins can manage all estimate files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'estimate-files' AND
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'estimate-files' AND
  has_role(auth.uid(), 'admin')
);

-- =====================================================
-- 4. HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =====================================================

-- Function to generate signed URL for file download
CREATE OR REPLACE FUNCTION get_estimate_file_url(
  p_file_path TEXT,
  p_expires_in INTEGER DEFAULT 3600 -- 1 hour
)
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
BEGIN
  -- This is a placeholder - actual signed URL generation happens in Edge Functions
  -- or client-side using Supabase SDK
  -- This function just returns the storage path
  RETURN 'estimate-files/' || p_file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_estimate_file_url(TEXT, INTEGER) TO authenticated;

-- Function to clean up orphaned files (files without estimate_files record)
CREATE OR REPLACE FUNCTION cleanup_orphaned_estimate_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This is a maintenance function to be run periodically
  -- It should be executed with service role credentials

  -- Note: Actual file deletion from storage must be done via Edge Function
  -- This function just identifies orphans

  -- Mark estimate_files records as orphaned if file doesn't exist in storage
  -- (Implementation depends on your cleanup strategy)

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admins can run cleanup
GRANT EXECUTE ON FUNCTION cleanup_orphaned_estimate_files() TO service_role;

 -- =====================================================
 -- 5. MATERIALIZED VIEW FOR FILE STATISTICS
 -- =====================================================

 -- View to track storage usage per user
 DO $$
 DECLARE
   v_relkind CHAR(1);
 BEGIN
   IF to_regclass('public.estimate_files') IS NULL THEN
     RETURN;
   END IF;

   SELECT c.relkind INTO v_relkind
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relname = 'user_storage_stats'
     AND n.nspname = 'public'
   LIMIT 1;

   IF v_relkind IS NOT NULL THEN
     IF v_relkind = 'r' OR v_relkind = 'p' OR v_relkind = 'f' THEN
       EXECUTE 'DROP TABLE public.user_storage_stats CASCADE';
     ELSIF v_relkind = 'm' THEN
       EXECUTE 'DROP MATERIALIZED VIEW public.user_storage_stats CASCADE';
     ELSE
       EXECUTE 'DROP VIEW public.user_storage_stats CASCADE';
     END IF;
   END IF;

   CREATE VIEW public.user_storage_stats AS
   SELECT
     ef.user_id,
     COUNT(*) as total_files,
     SUM(ef.file_size) as total_bytes,
     ROUND(SUM(ef.file_size)::DECIMAL / 1024 / 1024, 2) as total_mb,
     COUNT(*) FILTER (WHERE ef.processing_status = 'completed') as processed_files,
     COUNT(*) FILTER (WHERE ef.processing_status = 'failed') as failed_files,
     COUNT(*) FILTER (WHERE ef.processing_status = 'pending') as pending_files
   FROM estimate_files ef
   GROUP BY ef.user_id;

 END;
 $$;

 -- Note: This is a regular view, not materialized, for real-time data
 -- If performance becomes an issue, consider making it materialized and refreshing periodically

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp';
COMMENT ON FUNCTION get_estimate_file_url(TEXT, INTEGER) IS 'Helper to get storage URL for estimate files';
COMMENT ON FUNCTION cleanup_orphaned_estimate_files() IS 'Maintenance function to clean up orphaned files (service role only)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check bucket was created
-- SELECT * FROM storage.buckets WHERE id = 'estimate-files';

-- Check storage policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%estimate%';

-- Check storage usage
-- SELECT * FROM user_storage_stats WHERE user_id = auth.uid();
