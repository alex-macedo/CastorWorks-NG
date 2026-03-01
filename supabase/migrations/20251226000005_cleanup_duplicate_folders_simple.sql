-- Simple and robust cleanup of duplicate folders
-- Keeps the oldest folder for each (project_id, folder_name) combination

BEGIN;

-- Step 1: Update documents pointing to duplicate folders
-- Point them to the oldest folder with the same name in the same project
WITH folders_to_keep AS (
    SELECT DISTINCT ON (project_id, folder_name)
        id as keeper_id,
        project_id,
        folder_name
    FROM public.project_folders
    ORDER BY project_id, folder_name, created_at ASC
)
UPDATE public.project_documents pd
SET folder_id = ftk.keeper_id
FROM public.project_folders pf
JOIN folders_to_keep ftk ON pf.project_id = ftk.project_id AND pf.folder_name = ftk.folder_name
WHERE pd.folder_id = pf.id
AND pf.id != ftk.keeper_id;

-- Step 2: Delete duplicate folders
-- Keep only the oldest folder for each (project_id, folder_name)
DELETE FROM public.project_folders
WHERE id NOT IN (
    SELECT DISTINCT ON (project_id, folder_name) id
    FROM public.project_folders
    ORDER BY project_id, folder_name, created_at ASC
);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE public.project_folders
DROP CONSTRAINT IF EXISTS project_folders_project_id_folder_name_key;

ALTER TABLE public.project_folders
ADD CONSTRAINT project_folders_project_id_folder_name_key 
UNIQUE (project_id, folder_name);

COMMIT;
