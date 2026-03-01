-- Rename 'name' column to 'user_name' in project_team_members table
-- This fixes the mismatch between the database schema and the TypeScript types
-- The types file expects 'user_name' but the table has 'name'

BEGIN;

-- Rename the column using correct PostgreSQL syntax
ALTER TABLE project_team_members 
RENAME COLUMN "name" TO user_name;

COMMIT;
