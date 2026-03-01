-- Create storage bucket for delivery confirmation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-photos',
  'delivery-photos',
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for delivery-photos bucket
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can upload delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view delivery photos for accessible projects" ON storage.objects;
    DROP POLICY IF EXISTS "Admins and PMs can update delivery photos" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete delivery photos" ON storage.objects;

    EXECUTE '
      CREATE POLICY "Authenticated users can upload delivery photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = ''delivery-photos'' AND
        (storage.foldername(name))[1] IN (
          SELECT purchase_order_id::text
          FROM delivery_confirmations
          WHERE EXISTS (
            SELECT 1 FROM purchase_orders po
            WHERE po.id = delivery_confirmations.purchase_order_id
            AND has_project_access(auth.uid(), po.project_id)
          )
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Users can view delivery photos for accessible projects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        EXISTS (
          SELECT 1 FROM delivery_confirmations dc
          JOIN purchase_orders po ON po.id = dc.purchase_order_id
          WHERE (storage.foldername(name))[1] = po.id::text
          AND has_project_access(auth.uid(), po.project_id)
        )
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins and PMs can update delivery photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        (has_role(auth.uid(), ''admin'') OR has_role(auth.uid(), ''project_manager''))
      )
    ';

    EXECUTE '
      CREATE POLICY "Admins can delete delivery photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''delivery-photos'' AND
        has_role(auth.uid(), ''admin'')
      )
    ';
  END IF;
END;
$$;
