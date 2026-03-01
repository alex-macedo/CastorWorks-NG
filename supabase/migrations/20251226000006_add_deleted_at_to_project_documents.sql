-- Add deleted_at and deleted_by columns to project_documents for soft deletes
-- This allows documents to be marked as deleted and track who deleted them

BEGIN;

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_documents' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.project_documents 
        ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
        
        RAISE NOTICE 'Added deleted_at column to project_documents';
    ELSE
        RAISE NOTICE 'Column deleted_at already exists in project_documents';
    END IF;
END $$;

-- Add deleted_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_documents' 
        AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE public.project_documents 
        ADD COLUMN deleted_by UUID DEFAULT NULL REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added deleted_by column to project_documents';
    ELSE
        RAISE NOTICE 'Column deleted_by already exists in project_documents';
    END IF;
END $$;

-- Create an index for better query performance when filtering out deleted documents
CREATE INDEX IF NOT EXISTS idx_project_documents_deleted_at 
ON public.project_documents(deleted_at) 
WHERE deleted_at IS NULL;

-- Create an index on deleted_by for tracking who deleted documents
CREATE INDEX IF NOT EXISTS idx_project_documents_deleted_by 
ON public.project_documents(deleted_by) 
WHERE deleted_by IS NOT NULL;

-- Update the is_deleted column to match deleted_at if it exists
-- (is_deleted should be true when deleted_at is not null)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_documents' 
        AND column_name = 'is_deleted'
    ) THEN
        UPDATE public.project_documents
        SET is_deleted = (deleted_at IS NOT NULL)
        WHERE is_deleted != (deleted_at IS NOT NULL);
        
        RAISE NOTICE 'Synced is_deleted with deleted_at';
    END IF;
END $$;

COMMIT;
