-- Migration: Add fee_desc column to project_materials table
-- Epic 6, Story 6-1: Support fee descriptions in materials management
-- Date: 2025-11-17

ALTER TABLE public.project_materials
ADD COLUMN IF NOT EXISTS fee_desc TEXT NULL;

COMMENT ON COLUMN public.project_materials.fee_desc IS 'Optional description for fee-related materials';
