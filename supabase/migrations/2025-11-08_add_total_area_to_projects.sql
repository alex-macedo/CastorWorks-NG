-- Add total_area column to projects (numeric meters squared)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_area numeric(10,2);

-- Optionally backfill if you have area calculation, otherwise leave NULL
