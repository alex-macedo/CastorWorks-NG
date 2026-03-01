-- Add missing roles to the app_role enum
-- First, add the new role values to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'site_supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_office';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Note: We keep 'accountant' even though it's not currently used in the UI
-- to maintain backwards compatibility with any existing data