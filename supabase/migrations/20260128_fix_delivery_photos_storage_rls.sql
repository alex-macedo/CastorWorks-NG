-- Fix RLS policies for delivery-photos storage bucket
-- The previous policies were too restrictive, requiring a delivery_confirmations record
-- to exist before photos could be uploaded. This caused a catch-22 in the UI.

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
    DROP POLICY IF EXISTS "Admins and PMs can update delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete delivery photos" ON storage.objects;

    -- New INSERT policy: Allow if user has access to the Purchase Order
    EXECUTE '
      CREATE POLICY "Authenticated users can upload delivery photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = ''delivery-photos'' AND
        (storage.foldername(name))[1] ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = ((storage.foldername(name))[1])::uuid
          AND public.has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- New SELECT policy: Allow if user has access to the Purchase Order
    EXECUTE '
      CREATE POLICY "Users can view delivery photos for accessible projects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        (storage.foldername(name))[1] ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = ((storage.foldername(name))[1])::uuid
          AND public.has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- UPDATE policy
    EXECUTE '
      CREATE POLICY "Users can update their delivery photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        (storage.foldername(name))[1] ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = ((storage.foldername(name))[1])::uuid
          AND public.has_project_admin_access(auth.uid(), po.project_id)
        )
      )
    ';

    -- DELETE policy
    EXECUTE '
      CREATE POLICY "Users can delete their delivery photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        (storage.foldername(name))[1] ~* ''^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'' AND
        EXISTS (
          SELECT 1 FROM public.purchase_orders po
          WHERE po.id = ((storage.foldername(name))[1])::uuid
          AND public.has_project_admin_access(auth.uid(), po.project_id)
        )
      )
    ';
  END IF;
END;
$$;
