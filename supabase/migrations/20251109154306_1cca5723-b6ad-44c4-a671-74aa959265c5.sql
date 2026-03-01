-- Fix infinite recursion in document RLS policies
-- Create a security definer function to check document permissions without triggering RLS

-- First, create a function to check if a user has permission to access a document
DO $$
BEGIN
  IF to_regclass('public.document_permissions') IS NULL THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_document_permission(
        _user_id uuid,
        _document_id uuid,
        _min_permission text DEFAULT ''view''
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT FALSE;
      $func$;
    ';
  ELSE
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_document_permission(
        _user_id uuid,
        _document_id uuid,
        _min_permission text DEFAULT ''view''
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT EXISTS (
          SELECT 1
          FROM public.document_permissions
          WHERE document_id = _document_id
            AND user_id = _user_id
            AND (
              CASE _min_permission
                WHEN ''view'' THEN permission_level IN (''view'', ''edit'', ''admin'')
                WHEN ''edit'' THEN permission_level IN (''edit'', ''admin'')
                WHEN ''admin'' THEN permission_level = ''admin''
                ELSE false
              END
            )
        );
      $func$;
    ';
  END IF;
END;
$$;

-- Create a function to check if a user can access a document (via project or permission)
DO $$
BEGIN
  IF to_regclass('public.project_documents') IS NOT NULL THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.can_access_document(
        _user_id uuid,
        _document_id uuid
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        -- Check if user has project access or direct document permission
        SELECT EXISTS (
          SELECT 1
          FROM public.project_documents pd
          WHERE pd.id = _document_id
            AND pd.is_deleted = false
            AND has_project_access(_user_id, pd.project_id)
        )
        OR
        has_document_permission(_user_id, _document_id, ''view'')
      $func$;
    ';

    EXECUTE '
      CREATE OR REPLACE FUNCTION public.can_modify_document(
        _user_id uuid,
        _document_id uuid
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT EXISTS (
          SELECT 1
          FROM public.project_documents pd
          WHERE pd.id = _document_id
            AND has_project_access(_user_id, pd.project_id)
        )
        OR
        has_document_permission(_user_id, _document_id, ''edit'')
      $func$;
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view documents for accessible projects" ON public.project_documents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their documents" ON public.project_documents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their documents" ON public.project_documents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can upload documents to accessible projects" ON public.project_documents';

    EXECUTE 'CREATE POLICY "Users can view documents for accessible projects"
      ON public.project_documents
      FOR SELECT
      TO authenticated
      USING (can_access_document(auth.uid(), id))';

    EXECUTE 'CREATE POLICY "Users can upload documents to accessible projects"
      ON public.project_documents
      FOR INSERT
      TO authenticated
      WITH CHECK (has_project_access(auth.uid(), project_id))';

    EXECUTE 'CREATE POLICY "Users can update their documents"
      ON public.project_documents
      FOR UPDATE
      TO authenticated
      USING (can_modify_document(auth.uid(), id))';

    EXECUTE 'CREATE POLICY "Users can delete their documents"
      ON public.project_documents
      FOR DELETE
      TO authenticated
      USING (has_project_access(auth.uid(), project_id))';
  END IF;
END;
$$;

-- Recreate document_permissions policies using security definer functions (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.document_permissions') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Users can view permissions for their documents"
      ON public.document_permissions
      FOR SELECT
      TO authenticated
      USING (can_access_document(auth.uid(), document_id))';

    EXECUTE 'CREATE POLICY "Users can grant permissions for their documents"
      ON public.document_permissions
      FOR INSERT
      TO authenticated
      WITH CHECK (can_modify_document(auth.uid(), document_id))';

    EXECUTE 'CREATE POLICY "Users can update permissions for their documents"
      ON public.document_permissions
      FOR UPDATE
      TO authenticated
      USING (can_modify_document(auth.uid(), document_id))';

    EXECUTE 'CREATE POLICY "Users can revoke permissions for their documents"
      ON public.document_permissions
      FOR DELETE
      TO authenticated
      USING (can_modify_document(auth.uid(), document_id))';
  END IF;
END;
$$;
