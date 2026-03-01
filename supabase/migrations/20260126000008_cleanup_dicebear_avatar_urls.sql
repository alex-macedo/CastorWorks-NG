-- Migration: Cleanup Dicebear and other avatar generator URLs
-- Description: Remove Dicebear and other avatar generator URLs from user_profiles.avatar_url
-- These should be null to use the standard avatar system with initials fallback

BEGIN;

-- Update user_profiles to set avatar_url to NULL where it contains Dicebear or other generator URLs
UPDATE public.user_profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND (
    avatar_url LIKE '%api.dicebear.com%'
    OR avatar_url LIKE '%dicebear.com%'
    OR avatar_url LIKE '%avatar.iran.liara.run%'
    OR avatar_url LIKE '%placeholder.com%'
    OR avatar_url LIKE '%via.placeholder.com%'
  );

-- Also update project_team_members.avatar_url
UPDATE public.project_team_members
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND (
    avatar_url LIKE '%api.dicebear.com%'
    OR avatar_url LIKE '%dicebear.com%'
    OR avatar_url LIKE '%avatar.iran.liara.run%'
    OR avatar_url LIKE '%placeholder.com%'
    OR avatar_url LIKE '%via.placeholder.com%'
  );

-- Also update meeting_attendees.avatar_url if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meeting_attendees' 
    AND column_name = 'avatar_url'
  ) THEN
    UPDATE public.meeting_attendees
    SET avatar_url = NULL
    WHERE avatar_url IS NOT NULL
      AND (
        avatar_url LIKE '%api.dicebear.com%'
        OR avatar_url LIKE '%dicebear.com%'
        OR avatar_url LIKE '%avatar.iran.liara.run%'
        OR avatar_url LIKE '%placeholder.com%'
        OR avatar_url LIKE '%via.placeholder.com%'
      );
  END IF;
END $$;

COMMIT;
