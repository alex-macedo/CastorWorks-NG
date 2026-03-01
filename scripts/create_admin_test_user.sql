-- Create a test admin user for testing Menu Order functionality

-- First, let's see if the user already exists
SELECT 'Checking existing users...' as status;

-- Create a test admin user if it doesn't exist
-- This uses Supabase auth - you'll need to create the user through Supabase dashboard or API
-- For now, let's grant admin role to the existing test user if it exists

-- Check if test user exists and grant admin role
DO $$
BEGIN
    -- Check if ai-testrunner user exists and grant admin role
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'ai-testrunner@castorworks.cloud') THEN
        -- Remove existing roles
        DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ai-testrunner@castorworks.cloud');
        
        -- Grant admin role
        INSERT INTO user_roles (user_id, role) 
        VALUES ((SELECT id FROM auth.users WHERE email = 'ai-testrunner@castorworks.cloud'), 'admin');
        
        RAISE NOTICE 'Granted admin role to ai-testrunner@castorworks.cloud';
    END IF;
END $$;

-- Check the result
SELECT 
    u.email,
    ur.role,
    u.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ai-testrunner@castorworks.cloud';
