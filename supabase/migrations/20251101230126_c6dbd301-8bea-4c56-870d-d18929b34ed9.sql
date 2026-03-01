-- Create storage bucket for project images
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Clean up any existing RLS policies for this bucket
DROP POLICY IF EXISTS "authenticated_select_project_images"
  ON storage.objects;

DROP POLICY IF EXISTS "authenticated_insert_project_images"
  ON storage.objects;

DROP POLICY IF EXISTS "authenticated_update_project_images"
  ON storage.objects;

DROP POLICY IF EXISTS "authenticated_delete_project_images"
  ON storage.objects;

-- Create storage policies for project images (authenticated users only)
CREATE POLICY "authenticated_select_project_images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_insert_project_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_project_images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_delete_project_images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);
