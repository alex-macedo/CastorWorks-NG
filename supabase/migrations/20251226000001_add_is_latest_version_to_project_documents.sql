-- Add missing is_latest_version column to project_documents
-- This column is required by the application to track document versions

BEGIN;

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_documents' 
        AND column_name = 'is_latest_version'
    ) THEN
        ALTER TABLE public.project_documents 
        ADD COLUMN is_latest_version BOOLEAN DEFAULT true NOT NULL;
        
        RAISE NOTICE 'Added is_latest_version column to project_documents';
    ELSE
        RAISE NOTICE 'Column is_latest_version already exists in project_documents';
    END IF;
END $$;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_documents_is_latest_version 
ON public.project_documents(is_latest_version) 
WHERE is_latest_version = true;

COMMIT;
