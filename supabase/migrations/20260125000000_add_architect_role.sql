-- Add 'architect' role to the app_role enum
-- This enables the new Architect role to access only architect portal pages

-- Check if 'architect' role already exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'architect' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE app_role ADD VALUE 'architect';
    END IF;
END $$;

COMMENT ON TYPE app_role IS 'Application roles: admin, project_manager, viewer, accountant, client, site_supervisor, admin_office, editor, architect';
