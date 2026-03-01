-- Migration: Add before_photo and after_photo fields to site_issues
-- This migration adds fields to support before/after photo comparisons for resolved issues

-- Add before_photo column (storage path)
ALTER TABLE public.site_issues
ADD COLUMN IF NOT EXISTS before_photo TEXT;

-- Add after_photo column (storage path)
ALTER TABLE public.site_issues
ADD COLUMN IF NOT EXISTS after_photo TEXT;

-- Add comments
COMMENT ON COLUMN public.site_issues.before_photo IS 'Storage path to the "before" photo showing the issue state';
COMMENT ON COLUMN public.site_issues.after_photo IS 'Storage path to the "after" photo showing the resolved state';
