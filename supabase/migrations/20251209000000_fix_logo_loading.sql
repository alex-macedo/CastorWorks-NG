-- Fix project-images RLS for non-admin users to allow viewing company logo
-- Ensure authenticated users can view files in project-images

-- Ensure the bucket is public for company logos and project images
UPDATE storage.buckets
SET public = true
WHERE id = 'project-images';

-- Remove any potentially conflicting or restrictive policies regarding project-images SELECT
-- Note: We are not removing "Authenticated users can view images" if it covers multiple buckets, 
-- but we are adding a specific one to GUARANTEE access.
-- However, strict RLS usually requires at least one policy to return true.
-- If an existing policy returns false (it doesn't work that way usually, it's OR), then adding this one makes it true.

DROP POLICY IF EXISTS "Authenticated users can view project images" ON storage.objects;

CREATE POLICY "Authenticated users can view project images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project-images');

-- Ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
