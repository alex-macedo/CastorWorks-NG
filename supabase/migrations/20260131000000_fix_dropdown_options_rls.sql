-- Migration: Fix RLS policies for dropdown_options table
-- Date: 2026-01-31
-- Description: Allows both admin and project_manager roles to modify dropdown options
--              This aligns with other business settings tables

BEGIN;

-- Drop existing restrictive admin-only policy
DROP POLICY IF EXISTS "dropdown_options_admin" ON dropdown_options;

-- Create new policy allowing admin and project_manager to modify
-- This follows the same pattern as other business settings tables
CREATE POLICY "dropdown_options_modify"
  ON dropdown_options FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- Also add admin_office role since they handle business configuration
DROP POLICY IF EXISTS "dropdown_options_modify" ON dropdown_options;
CREATE POLICY "dropdown_options_modify"
  ON dropdown_options FOR ALL
  USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin_office')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin_office')
  );

COMMIT;
