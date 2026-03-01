DO $$
BEGIN
  IF to_regclass('public.project_documents') IS NOT NULL THEN
    -- Enable RLS on project_documents if not already enabled
    ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Users can insert documents for accessible projects" ON public.project_documents;
    DROP POLICY IF EXISTS "Users can view documents for accessible projects" ON public.project_documents;
    DROP POLICY IF EXISTS "Project admins can update documents" ON public.project_documents;
    DROP POLICY IF EXISTS "Project admins can delete documents" ON public.project_documents;

    -- Policy for INSERT: Users can upload documents to projects they have access to
    CREATE POLICY "Users can insert documents for accessible projects"
    ON public.project_documents
    FOR INSERT
    WITH CHECK (
      has_project_access(auth.uid(), project_id)
      AND uploaded_by = auth.uid()
    );

    -- Policy for SELECT: Users can view documents for projects they have access to
    IF to_regclass('public.document_permissions') IS NOT NULL THEN
      CREATE POLICY "Users can view documents for accessible projects"
      ON public.project_documents
      FOR SELECT
      USING (
        has_project_access(auth.uid(), project_id)
        OR (
          EXISTS (
            SELECT 1 FROM public.document_permissions
            WHERE document_permissions.document_id = project_documents.id
              AND document_permissions.user_id = auth.uid()
          )
        )
      );
    ELSE
      CREATE POLICY "Users can view documents for accessible projects"
      ON public.project_documents
      FOR SELECT
      USING (
        has_project_access(auth.uid(), project_id)
      );
    END IF;

    -- Policy for UPDATE: Project admins can update document metadata
    CREATE POLICY "Project admins can update documents"
    ON public.project_documents
    FOR UPDATE
    USING (has_project_admin_access(auth.uid(), project_id))
    WITH CHECK (has_project_admin_access(auth.uid(), project_id));

    -- Policy for DELETE: Project admins can delete documents
    CREATE POLICY "Project admins can delete documents"
    ON public.project_documents
    FOR DELETE
    USING (has_project_admin_access(auth.uid(), project_id));
  END IF;
END;
$$;
