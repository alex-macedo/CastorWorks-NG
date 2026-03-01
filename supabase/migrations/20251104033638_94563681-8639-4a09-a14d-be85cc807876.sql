-- Add missing columns to roadmap_items table
ALTER TABLE public.roadmap_items 
ADD COLUMN IF NOT EXISTS due_date date,
ADD COLUMN IF NOT EXISTS estimated_effort text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS priority text,
ADD COLUMN IF NOT EXISTS release_version text;