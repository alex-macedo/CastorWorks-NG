-- Optimize and fix RLS policies for delivery-photos storage bucket
-- Using split_part instead of storage.foldername for better stability
-- Adding global admin bypass to avoid complex permission checks for admins

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Authenticated users can upload delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view delivery photos for accessible projects" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Global admins can do everything with delivery photos" ON storage.objects;

    -- 1. Global Admin Policy (Always allow)
    EXECUTE '
      CREATE POLICY "Global admins can do everything with delivery photos"
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

    -- 2. INSERT Policy
    EXECUTE '
      CREATE POLICY "Authenticated users can upload delivery photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = ''delivery-photos'' AND
        split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id::text = split_part(name, ''/'', 1)
          AND public.has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- 3. SELECT Policy
    EXECUTE '
      CREATE POLICY "Users can view delivery photos for accessible projects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id::text = split_part(name, ''/'', 1)
          AND public.has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- 4. UPDATE Policy
    EXECUTE '
      CREATE POLICY "Users can update their delivery photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id::text = split_part(name, ''/'', 1)
          AND public.has_project_admin_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- 5. DELETE Policy
    EXECUTE '
      CREATE POLICY "Users can delete their delivery photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        split_part(name, ''/'', 1) ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id::text = split_part(name, ''/'', 1)
          AND public.has_project_admin_access(auth.uid(), po.project_id)
        )
      )
    ';
  END IF;
END;
$$;
