-- Add image_url column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for client images
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-images', 'client-images', true)
ON CONFLICT DO NOTHING;

-- RLS policies for client-images bucket (authenticated users only)
DROP POLICY IF EXISTS "authenticated_select_client_images"
ON storage.objects;

CREATE POLICY "authenticated_select_client_images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_client_images"
ON storage.objects;

CREATE POLICY "authenticated_insert_client_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_update_client_images"
ON storage.objects;

CREATE POLICY "authenticated_update_client_images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'client-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_delete_client_images"
ON storage.objects;

CREATE POLICY "authenticated_delete_client_images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-images' AND auth.uid() IS NOT NULL);