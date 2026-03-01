-- Add unique constraint to prevent duplicate folder names per project
-- This ensures folder_name is unique within each project

BEGIN;

-- First, identify and handle duplicate folders
-- Keep the oldest folder for each duplicate set and mark others for cleanup
DO $$
DECLARE
    duplicate_record RECORD;
    keeper_id UUID;
BEGIN
    -- Find all duplicate folder names per project
    FOR duplicate_record IN 
        SELECT project_id, folder_name, COUNT(*) as count
        FROM public.project_folders
        GROUP BY project_id, folder_name
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found % duplicates for folder "%" in project %', 
            duplicate_record.count, duplicate_record.folder_name, duplicate_record.project_id;
        
        -- Get the ID of the oldest folder (the one we'll keep)
        SELECT id INTO keeper_id
        FROM public.project_folders
        WHERE project_id = duplicate_record.project_id 
        AND folder_name = duplicate_record.folder_name
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Update any documents pointing to duplicate folders to point to the keeper
        UPDATE public.project_documents
        SET folder_id = keeper_id
        WHERE folder_id IN (
            SELECT id 
            FROM public.project_folders
            WHERE project_id = duplicate_record.project_id 
            AND folder_name = duplicate_record.folder_name
            AND id != keeper_id
        );
        
        -- Delete the duplicate folders
        DELETE FROM public.project_folders
        WHERE project_id = duplicate_record.project_id 
        AND folder_name = duplicate_record.folder_name
        AND id != keeper_id;
        
        RAISE NOTICE 'Cleaned up duplicates for folder "%" in project %, kept folder ID %', 
            duplicate_record.folder_name, duplicate_record.project_id, keeper_id;
    END LOOP;
END $$;

-- Add unique constraint to prevent future duplicates
-- This ensures that within each project, folder names must be unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'project_folders_project_id_folder_name_key'
    ) THEN
        ALTER TABLE public.project_folders
        ADD CONSTRAINT project_folders_project_id_folder_name_key 
        UNIQUE (project_id, folder_name);
        
        RAISE NOTICE 'Added unique constraint on (project_id, folder_name) to project_folders';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on project_folders';
    END IF;
END $$;

COMMIT;
