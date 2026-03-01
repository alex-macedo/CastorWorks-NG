-- Add 'editor' role to the app_role enum
-- This enables the new Editor role to approve content in the CastorWorks News Module

-- Check if 'editor' role already exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'editor' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE app_role ADD VALUE 'editor';
    END IF;
END $$;

COMMENT ON TYPE app_role IS 'Application roles: admin, engineer, contractor, accountant, supervisor, client, editor';
