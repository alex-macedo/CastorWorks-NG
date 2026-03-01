-- Add address_complement column to projects table
-- This field stores additional address information (e.g., apartment number, suite, etc.)

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address_complement TEXT;

COMMENT ON COLUMN projects.address_complement IS 'Additional address information such as apartment number, suite, building name, etc.';
