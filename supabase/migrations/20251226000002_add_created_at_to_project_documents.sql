-- Add created_at column to project_documents and sync with uploaded_at
-- This fixes the schema mismatch where the application expects created_at but the table has uploaded_at

BEGIN;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_documents' 
        AND column_name = 'created_at'
    ) THEN
        -- Add the column with a default value of NOW()
        ALTER TABLE public.project_documents 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Copy values from uploaded_at to created_at for existing records
        UPDATE public.project_documents 
        SET created_at = uploaded_at 
        WHERE created_at IS NULL AND uploaded_at IS NOT NULL;
        
        -- Make it NOT NULL after backfilling
        ALTER TABLE public.project_documents 
        ALTER COLUMN created_at SET NOT NULL;
        
        RAISE NOTICE 'Added created_at column to project_documents and synced with uploaded_at';
    ELSE
        RAISE NOTICE 'Column created_at already exists in project_documents';
    END IF;
END $$;

-- Create an index for better query performance on created_at
CREATE INDEX IF NOT EXISTS idx_project_documents_created_at 
ON public.project_documents(created_at DESC);

COMMIT;
