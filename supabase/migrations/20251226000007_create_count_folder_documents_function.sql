-- Create a function to count non-deleted documents in a folder
-- This ensures the document count only includes active (non-deleted) documents

BEGIN;

-- Create or replace the function to count non-deleted documents
CREATE OR REPLACE FUNCTION public.count_folder_documents(folder_uuid UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM public.project_documents
  WHERE folder_id = folder_uuid
    AND (is_deleted = false OR is_deleted IS NULL)
    AND (deleted_at IS NULL);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.count_folder_documents(UUID) TO authenticated;

COMMIT;
