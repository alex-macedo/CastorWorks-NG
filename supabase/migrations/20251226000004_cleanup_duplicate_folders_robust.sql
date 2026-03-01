-- Robust cleanup of duplicate folders with detailed logging
-- This version handles edge cases and provides clear feedback

BEGIN;

-- Create a temporary table to track which folders to keep
CREATE TEMP TABLE folders_to_keep AS
SELECT DISTINCT ON (project_id, folder_name)
    id,
    project_id,
    folder_name,
    created_at
FROM public.project_folders
ORDER BY project_id, folder_name, created_at ASC;

-- Log what we're about to do
DO $$
DECLARE
    total_folders INTEGER;
    folders_to_keep_count INTEGER;
    duplicates_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_folders FROM public.project_folders;
    SELECT COUNT(*) INTO folders_to_keep_count FROM folders_to_keep;
    duplicates_count := total_folders - folders_to_keep_count;
    
    RAISE NOTICE 'Total folders: %', total_folders;
    RAISE NOTICE 'Unique folders to keep: %', folders_to_keep_count;
    RAISE NOTICE 'Duplicate folders to remove: %', duplicates_count;
END $$;

-- Update documents pointing to duplicate folders to point to the keeper folder
UPDATE public.project_documents pd
SET folder_id = ftk.id
FROM folders_to_keep ftk
WHERE pd.folder_id IN (
    SELECT pf.id 
    FROM public.project_folders pf
    WHERE pf.project_id = ftk.project_id 
    AND pf.folder_name = ftk.folder_name
    AND pf.id != ftk.id
);

-- Get count of documents updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % document references to point to keeper folders', updated_count;
END $$;

-- Delete duplicate folders (keeping only the ones in folders_to_keep)
DELETE FROM public.project_folders
WHERE id NOT IN (SELECT id FROM folders_to_keep);

-- Get count of folders deleted
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate folders', deleted_count;
END $$;

-- Now add the unique constraint
DO $$
BEGIN
    ALTER TABLE public.project_folders
    DROP CONSTRAINT IF EXISTS project_folders_project_id_folder_name_key;

    ALTER TABLE public.project_folders
    ADD CONSTRAINT project_folders_project_id_folder_name_key 
    UNIQUE (project_id, folder_name);

    RAISE NOTICE 'Added unique constraint on (project_id, folder_name)';
END $$;

-- Verify the cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT project_id, folder_name, COUNT(*) as count
        FROM public.project_folders
        GROUP BY project_id, folder_name
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF remaining_duplicates > 0 THEN
        RAISE WARNING 'Still have % duplicate folder name combinations!', remaining_duplicates;
    ELSE
        RAISE NOTICE '✅ All duplicates cleaned up successfully!';
    END IF;
END $$;

COMMIT;
