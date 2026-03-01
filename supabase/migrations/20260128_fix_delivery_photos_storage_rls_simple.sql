-- Simple RLS policy to debug the upload issue
-- This bypasses complex checks to rule out recursion/performance issues

DO $$
BEGIN
  -- Drop existing problematic policies
  DROP POLICY IF EXISTS "delivery_photos_insert" ON storage.objects;
  DROP POLICY IF EXISTS "delivery_photos_select" ON storage.objects;
  DROP POLICY IF EXISTS "delivery_photos_update" ON storage.objects;
  DROP POLICY IF EXISTS "delivery_photos_delete" ON storage.objects;
  DROP POLICY IF EXISTS "delivery_photos_admin_all" ON storage.objects;

  -- 1. Permissive INSERT policy for authenticated users
  CREATE POLICY "delivery_photos_insert_simple"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'delivery-photos');

  -- 2. Permissive SELECT policy for authenticated users
  CREATE POLICY "delivery_photos_select_simple"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'delivery-photos');

  -- 3. Permissive UPDATE/DELETE for authenticated users (we can restrict this later)
  CREATE POLICY "delivery_photos_manage_simple"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'delivery-photos');
END;
$$;
