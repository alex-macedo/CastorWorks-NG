DO $$
DECLARE
  old_pol TEXT[];
  pol TEXT;
  uuid_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage.objects not found; skipping project document storage policies';
    RETURN;
  END IF;

  old_pol := ARRAY[
    'Users can view documents for accessible projects',
    'Users can upload documents to accessible projects',
    'Users can update documents in accessible projects',
    'Users can delete documents from accessible projects',
    'Authenticated users can view project documents',
    'Authenticated users can upload project documents',
    'Authenticated users can update project documents',
    'Authenticated users can delete project documents'
  ];

  FOREACH pol IN ARRAY old_pol LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol);
  END LOOP;

  EXECUTE format($ddl$
    CREATE POLICY %I
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-documents'
        AND CASE
          WHEN split_part(name, '/', 1) ~* %L THEN has_project_access(auth.uid(), split_part(name, '/', 1)::uuid)
          ELSE FALSE
        END
      );
  $ddl$, 'Authenticated users can view project documents', uuid_regex);

  EXECUTE format($ddl$
    CREATE POLICY %I
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-documents'
        AND CASE
          WHEN split_part(name, '/', 1) ~* %L THEN has_project_access(auth.uid(), split_part(name, '/', 1)::uuid)
          ELSE FALSE
        END
      );
  $ddl$, 'Authenticated users can upload project documents', uuid_regex);

  EXECUTE format($ddl$
    CREATE POLICY %I
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'project-documents'
        AND CASE
          WHEN split_part(name, '/', 1) ~* %L THEN has_project_access(auth.uid(), split_part(name, '/', 1)::uuid)
          ELSE FALSE
        END
      );
  $ddl$, 'Authenticated users can update project documents', uuid_regex);

  EXECUTE format($ddl$
    CREATE POLICY %I
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-documents'
        AND CASE
          WHEN split_part(name, '/', 1) ~* %L THEN has_project_access(auth.uid(), split_part(name, '/', 1)::uuid)
          ELSE FALSE
        END
      );
  $ddl$, 'Authenticated users can delete project documents', uuid_regex);
END;
$$;
