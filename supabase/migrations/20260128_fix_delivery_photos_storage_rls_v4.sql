-- Final attempt at fixing delivery photos storage RLS (v4)
-- This uses a permissive INSERT policy to avoid recursion/timeout during upload
-- While keeping SELECT scoped for security

DO $$
DECLARE
  pol record;
BEGIN
  -- 1. Drop ALL existing policies for this bucket specifically
  -- Using a safer way to identify them
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
        policyname ILIKE '%delivery%photo%' 
        OR policyname ILIKE '%delivery_photos%'
        OR policyname ILIKE '%project_members_can_view_delivery_photos%'
    )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;

  -- 2. Permissive INSERT policy for authenticated users
  -- We trust authenticated users to upload to this bucket, as they can't do much harm
  -- without the file being linked to a record in the main DB.
  EXECUTE '
    CREATE POLICY "delivery_photos_insert_v4"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = ''delivery-photos'')
  ';

  -- 3. Scoped SELECT policy (Security)
  EXECUTE '
    CREATE POLICY "delivery_photos_select_v4"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE (
          po.id::text = split_part(name, ''/'', 1) 
          OR 
          po.id::text = split_part(name, ''/'', 2)
        )
        AND public.has_project_access(auth.uid(), po.project_id)
      )
    )
  ';

  -- 4. Admin/PM manage policy
  EXECUTE '
    CREATE POLICY "delivery_photos_manage_v4"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN (''admin'', ''project_manager'', ''global_admin'')
        )
      )
    )
  ';
END;
$$;
