-- Migration: Add role column to communication participants
-- Description: Allow seeding logic to store a role/title per participant
-- Generated: 2025-12-01

ALTER TABLE public.communication_participants
  ADD COLUMN IF NOT EXISTS role TEXT;

COMMENT ON COLUMN public.communication_participants.role IS 'Optional role or title for communication participants';
