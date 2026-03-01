-- Fix logo upload issue by making project-images bucket public
-- This resolves the "StorageUnknownError: Failed to fetch" when uploading company logos

UPDATE storage.buckets
SET public = true
WHERE id = 'project-images';

-- Ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;