-- Nuclear option: Drop ALL policies for delivery-photos bucket and create one simple correct one
-- This avoids any conflicting logic from previous migrations

DO $$
DECLARE
  pol record;
BEGIN
  -- 1. Drop ALL existing policies for this bucket
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
      policyname ILIKE '%delivery%photo%' 
      OR policyname ILIKE '%authenticated%upload%'
      OR policyname ILIKE '%project%members%view%'
    )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;

  -- 2. Create a clean Global Admin Policy
  EXECUTE '
    CREATE POLICY "delivery_photos_admin_all"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = ''global_admin''
      )
    )
  ';

  -- 3. Create a clean INSERT Policy that handles potential bucket-in-path prefix
  EXECUTE '
    CREATE POLICY "delivery_photos_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''delivery-photos'' AND
      (
        -- Case 1: path is UUID/filename
        (split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
         EXISTS (
           SELECT 1 FROM public.purchase_orders po
           WHERE po.id::text = split_part(name, ''/'', 1)
           AND public.has_project_access(auth.uid(), po.project_id)
         ))
        OR
        -- Case 2: path is delivery-photos/UUID/filename
        (split_part(name, ''/'', 2) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
         EXISTS (
           SELECT 1 FROM public.purchase_orders po
           WHERE po.id::text = split_part(name, ''/'', 2)
           AND public.has_project_access(auth.uid(), po.project_id)
         ))
      )
    )
  ';

  -- 4. Create a clean SELECT Policy
  EXECUTE '
    CREATE POLICY "delivery_photos_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      (
        (split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
         EXISTS (
           SELECT 1 FROM public.purchase_orders po
           WHERE po.id::text = split_part(name, ''/'', 1)
           AND public.has_project_access(auth.uid(), po.project_id)
         ))
        OR
        (split_part(name, ''/'', 2) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
         EXISTS (
           SELECT 1 FROM public.purchase_orders po
           WHERE po.id::text = split_part(name, ''/'', 2)
           AND public.has_project_access(auth.uid(), po.project_id)
         ))
      )
    )
  ';

  -- 5. Create clean UPDATE/DELETE Policies
  EXECUTE '
    CREATE POLICY "delivery_photos_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
    )
  ';

  EXECUTE '
    CREATE POLICY "delivery_photos_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''delivery-photos'' AND
      (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
    )
  ';
END;
$$;
