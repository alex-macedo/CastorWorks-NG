-- Make client-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'client-images';

-- Create RLS policy for client images - authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view client images" ON storage.objects;
CREATE POLICY "Authenticated users can view client images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-images');

-- Create RLS policy for client images - admins can upload
DROP POLICY IF EXISTS "Admins can upload client images" ON storage.objects;
CREATE POLICY "Admins can upload client images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-images' 
  AND has_role(auth.uid(), 'admin')
);

-- Create RLS policy for client images - admins can update
DROP POLICY IF EXISTS "Admins can update client images" ON storage.objects;
CREATE POLICY "Admins can update client images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-images' 
  AND has_role(auth.uid(), 'admin')
);

-- Create RLS policy for client images - admins can delete
DROP POLICY IF EXISTS "Admins can delete client images" ON storage.objects;
CREATE POLICY "Admins can delete client images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-images' 
  AND has_role(auth.uid(), 'admin')
);
