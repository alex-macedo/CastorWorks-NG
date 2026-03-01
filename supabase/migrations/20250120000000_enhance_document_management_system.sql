-- =================================================================
-- ENHANCED DOCUMENT MANAGEMENT SYSTEM
-- =================================================================
-- Migration: 20250120000000
-- Description: Add folder types (personal, shared, client), standard folder templates,
--              and client sharing capabilities for centralized document management
-- =================================================================

-- =================================================================
-- 1. CREATE FOLDER TYPE ENUM
-- =================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'folder_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.folder_type AS ENUM (
      'personal',
      'shared',
      'client'
    );
  END IF;
END;
$$;

-- =================================================================
-- 3. CREATE FOLDER TEMPLATES TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.folder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  folder_structure JSONB NOT NULL, -- Array of folder definitions with names and types
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.folder_templates IS 'Standard folder structure templates for projects';

-- Create index
CREATE INDEX IF NOT EXISTS idx_folder_templates_is_default ON public.folder_templates(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_folder_templates_is_active ON public.folder_templates(is_active) WHERE is_active = true;

-- =================================================================
-- 2. ENHANCE PROJECT_FOLDERS TABLE
-- =================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) THEN
    -- Add folder_type column
    ALTER TABLE public.project_folders
    ADD COLUMN IF NOT EXISTS folder_type folder_type NOT NULL DEFAULT 'shared';

    -- Add description field
    ALTER TABLE public.project_folders
    ADD COLUMN IF NOT EXISTS description TEXT;

    -- Add is_template flag (for standard folder structures)
    ALTER TABLE public.project_folders
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

    -- Add template_source_id (if folder was created from a template)
    ALTER TABLE public.project_folders
    ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES public.folder_templates(id) ON DELETE SET NULL;

    -- Add client access flag (for client-visible folders)
    ALTER TABLE public.project_folders
    ADD COLUMN IF NOT EXISTS client_accessible BOOLEAN DEFAULT false;

    -- Add index for folder_type lookups
    CREATE INDEX IF NOT EXISTS idx_project_folders_folder_type ON public.project_folders(folder_type);
    CREATE INDEX IF NOT EXISTS idx_project_folders_client_accessible ON public.project_folders(client_accessible) WHERE client_accessible = true;
  END IF;
END;
$$;

-- =================================================================
-- 4. CREATE FOLDER CLIENT ACCESS TABLE
-- =================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.folder_client_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      folder_id UUID NOT NULL REFERENCES public.project_folders(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      can_view BOOLEAN DEFAULT true,
      can_upload BOOLEAN DEFAULT false,
      can_download BOOLEAN DEFAULT true,
      granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(folder_id, client_id)
    );

    -- Add comment
    COMMENT ON TABLE public.folder_client_access IS 'Controls which clients can access specific folders';

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_folder_client_access_folder_id ON public.folder_client_access(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folder_client_access_client_id ON public.folder_client_access(client_id);

    -- Ensure folder_client_access has all expected columns (for older DBs)
    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS can_view BOOLEAN DEFAULT true;

    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS can_upload BOOLEAN DEFAULT false;

    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS can_download BOOLEAN DEFAULT true;

    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE public.folder_client_access
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END;
$$;

-- =================================================================
-- 5. INSERT DEFAULT FOLDER TEMPLATES
-- =================================================================

INSERT INTO public.folder_templates (name, description, folder_structure, is_default, is_active)
VALUES 
  (
    'Standard Construction Project',
    'Default folder structure for construction projects',
    '[
      {"name": "General", "type": "shared", "description": "General project documents"},
      {"name": "Presentations", "type": "shared", "description": "Project presentations and proposals"},
      {"name": "Meeting Reports", "type": "shared", "description": "Meeting minutes and reports"},
      {"name": "Property Documents", "type": "client", "description": "Property-related documents", "client_accessible": true},
      {"name": "References", "type": "shared", "description": "Reference materials and inspiration"},
      {"name": "Survey", "type": "shared", "description": "Survey and site analysis documents"},
      {"name": "Preliminary Design", "type": "client", "description": "Initial design concepts", "client_accessible": true},
      {"name": "Construction", "type": "shared", "description": "Construction phase documents"},
      {"name": "Post-construction", "type": "client", "description": "Post-construction documentation", "client_accessible": true}
    ]'::jsonb,
    true,
    true
  ),
  (
    'Minimal Structure',
    'Simple folder structure for small projects',
    '[
      {"name": "General", "type": "shared", "description": "General documents"},
      {"name": "Client Documents", "type": "client", "description": "Client-accessible documents", "client_accessible": true},
      {"name": "Internal", "type": "shared", "description": "Internal team documents"}
    ]'::jsonb,
    false,
    true
  )
ON CONFLICT DO NOTHING;

-- =================================================================
-- 6. CREATE FUNCTION TO APPLY FOLDER TEMPLATE
-- =================================================================

CREATE OR REPLACE FUNCTION public.apply_folder_template(
  _project_id UUID,
  _template_id UUID,
  _created_by UUID
)
RETURNS TABLE(folder_id UUID, folder_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_folder_structure JSONB;
  folder_def JSONB;
  created_folder_id UUID;
BEGIN
  -- Get template folder_structure
  SELECT folder_structure INTO template_folder_structure
  FROM public.folder_templates
  WHERE id = _template_id AND is_active = true;
  
  IF template_folder_structure IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;
  
  -- Create folders from template structure
  FOR folder_def IN SELECT * FROM jsonb_array_elements(template_folder_structure)
  LOOP
    INSERT INTO public.project_folders (
      project_id,
      folder_name,
      folder_type,
      description,
      is_template,
      template_source_id,
      client_accessible,
      created_by
    )
    VALUES (
      _project_id,
      folder_def->>'name',
      (folder_def->>'type')::folder_type,
      folder_def->>'description',
      true,
      _template_id,
      COALESCE((folder_def->>'client_accessible')::boolean, false),
      _created_by
    )
    RETURNING id INTO created_folder_id;
    
    folder_id := created_folder_id;
    folder_name := folder_def->>'name';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.apply_folder_template IS 'Creates folder structure from a template for a project';

-- =================================================================
-- X. ENSURE ACCESS CONTROL HELPERS EXIST (DEV-SAFE STUBS)
-- =================================================================

-- =================================================================
-- X. ENSURE ACCESS CONTROL HELPERS EXIST (DEV-SAFE STUBS)
-- =================================================================

DO $$
BEGIN
  -- Stub for has_project_access(user_id, project_id)
  IF to_regprocedure('public.has_project_access(uuid,uuid)') IS NULL THEN
    CREATE FUNCTION public.has_project_access(_user_id uuid,
                                              _project_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $f$
      -- DEV STUB: allow access; tighten in real RBAC
      SELECT true;
    $f$;
  END IF;

  -- Stub for has_project_admin_access(user_id, project_id)
  IF to_regprocedure('public.has_project_admin_access(uuid,uuid)') IS NULL
  THEN
    CREATE FUNCTION public.has_project_admin_access(_user_id uuid,
                                                   _project_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $f$
      -- DEV STUB: treat everyone as admin; tighten later
      SELECT true;
    $f$;
  END IF;

  -- Ensure app_role enum exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin');
  END IF;

  -- Stub for has_role(user_id, app_role)
  IF to_regprocedure('public.has_role(uuid,app_role)') IS NULL THEN
    CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $f$
      -- DEV STUB: always "has" the role; safe for dev
      SELECT true;
    $f$;
  END IF;
END;
$$;

-- =================================================================
-- X. ENSURE CLIENT-PROJECT ACCESS TABLE EXISTS
-- =================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'clients' AND n.nspname = 'public'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.client_project_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT, -- optional, handy later (e.g. 'owner', 'viewer')
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END;
$$;

-- =================================================================
-- 7. UPDATE RLS POLICIES FOR PROJECT_FOLDERS
-- =================================================================

DO $$
DECLARE
  has_project_folders BOOLEAN;
  has_folder_client_access BOOLEAN;
  has_client_project_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) INTO has_project_folders;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folder_client_access' AND n.nspname = 'public'
  ) INTO has_folder_client_access;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'client_project_access' AND n.nspname = 'public'
  ) INTO has_client_project_access;

  IF has_project_folders AND has_folder_client_access AND has_client_project_access THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view folders for accessible projects" ON public.project_folders;
    DROP POLICY IF EXISTS "Users can create folders for accessible projects" ON public.project_folders;
    DROP POLICY IF EXISTS "Users can update folders for accessible projects" ON public.project_folders;
    DROP POLICY IF EXISTS "Users can delete folders for accessible projects" ON public.project_folders;
    DROP POLICY IF EXISTS "Clients can view client-accessible folders" ON public.project_folders;

    -- Policy: Users can view folders based on project access and folder type
    CREATE POLICY "Users can view folders for accessible projects"
    ON public.project_folders
    FOR SELECT
    TO authenticated
    USING (
      -- Project access check
      has_project_access(auth.uid(), project_id)
      AND
      (
        -- Personal folders: only creator can view
        (folder_type = 'personal' AND created_by = auth.uid())
        OR
        -- Shared folders: anyone with project access
        (folder_type = 'shared')
        OR
        -- Client folders: if user is client with access OR has project access
        (
          folder_type = 'client' 
          AND (
            -- Client with explicit access
            EXISTS (
              SELECT 1 FROM public.folder_client_access fca
              JOIN public.client_project_access cpa ON cpa.client_id = fca.client_id
              WHERE fca.folder_id = project_folders.id
              AND cpa.user_id = auth.uid()
              AND fca.can_view = true
            )
            OR
            -- Project team member
            has_project_access(auth.uid(), project_id)
          )
        )
      )
      AND is_deleted = false
    );

    -- Policy: Users can create folders for accessible projects
    CREATE POLICY "Users can create folders for accessible projects"
    ON public.project_folders
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_project_access(auth.uid(), project_id)
      AND (
        -- Can create personal folders
        folder_type = 'personal'
        OR
        -- Can create shared/client folders if has project admin access
        (folder_type IN ('shared', 'client') AND has_project_admin_access(auth.uid(), project_id))
      )
      AND created_by = auth.uid()
    );

    -- Policy: Users can update folders they created or have admin access
    CREATE POLICY "Users can update folders for accessible projects"
    ON public.project_folders
    FOR UPDATE
    TO authenticated
    USING (
      has_project_access(auth.uid(), project_id)
      AND (
        -- Creator can update
        created_by = auth.uid()
        OR
        -- Admin can update
        has_project_admin_access(auth.uid(), project_id)
      )
    )
    WITH CHECK (
      has_project_access(auth.uid(), project_id)
      AND (
        created_by = auth.uid()
        OR
        has_project_admin_access(auth.uid(), project_id)
      )
    );

    -- Policy: Users can delete folders they created or have admin access
    CREATE POLICY "Users can delete folders for accessible projects"
    ON public.project_folders
    FOR DELETE
    TO authenticated
    USING (
      has_project_access(auth.uid(), project_id)
      AND (
        created_by = auth.uid()
        OR
        has_project_admin_access(auth.uid(), project_id)
      )
    );
  END IF;
END;
$$;

-- =================================================================
-- 8. RLS POLICIES FOR FOLDER_TEMPLATES
-- =================================================================

ALTER TABLE public.folder_templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active templates
DROP POLICY IF EXISTS "authenticated_select_active_templates"
ON public.folder_templates;

CREATE POLICY "authenticated_select_active_templates"
ON public.folder_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage templates
DROP POLICY IF EXISTS "Admins can manage templates"
ON public.folder_templates;

CREATE POLICY "Admins can manage templates"
ON public.folder_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =================================================================
-- 9. RLS POLICIES FOR FOLDER_CLIENT_ACCESS
-- =================================================================

DO $$
DECLARE
  has_folder_client_access BOOLEAN;
  has_client_project_access BOOLEAN;
  has_project_folders BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folder_client_access' AND n.nspname = 'public'
  ) INTO has_folder_client_access;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'client_project_access' AND n.nspname = 'public'
  ) INTO has_client_project_access;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) INTO has_project_folders;

  IF has_folder_client_access AND has_client_project_access AND has_project_folders THEN
    ALTER TABLE public.folder_client_access ENABLE ROW LEVEL SECURITY;

    -- Clients can view their own access records
    DROP POLICY IF EXISTS "Clients can view their folder access"
    ON public.folder_client_access;

    CREATE POLICY "Clients can view their folder access"
    ON public.folder_client_access
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.client_project_access cpa
        WHERE cpa.client_id = folder_client_access.client_id
        AND cpa.user_id = auth.uid()
      )
    );

    -- Project admins can manage client access
    DROP POLICY IF EXISTS "Project admins can manage client folder access"
    ON public.folder_client_access;

    CREATE POLICY "Project admins can manage client folder access"
    ON public.folder_client_access
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.project_folders pf
        WHERE pf.id = folder_client_access.folder_id
        AND has_project_admin_access(auth.uid(), pf.project_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.project_folders pf
        WHERE pf.id = folder_client_access.folder_id
        AND has_project_admin_access(auth.uid(), pf.project_id)
      )
    );
  END IF;
END;
$$;

-- =================================================================
-- 10. UPDATE PROJECT_DOCUMENTS RLS TO RESPECT FOLDER TYPE
-- =================================================================

DO $ensure_docs$
DECLARE
  has_project_documents BOOLEAN;
  has_project_folders BOOLEAN;
  has_folder_client_access BOOLEAN;
  has_client_project_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_documents' AND n.nspname = 'public'
  ) INTO has_project_documents;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) INTO has_project_folders;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folder_client_access' AND n.nspname = 'public'
  ) INTO has_folder_client_access;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'client_project_access' AND n.nspname = 'public'
  ) INTO has_client_project_access;

  IF has_project_documents AND has_project_folders AND has_folder_client_access AND has_client_project_access THEN
    -- Add helper function to check folder access
    CREATE OR REPLACE FUNCTION public.can_access_folder_document(
      _user_id UUID,
      _document_id UUID
    )
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM public.project_documents pd
        LEFT JOIN public.project_folders pf ON pd.folder_id = pf.id
        WHERE pd.id = _document_id
        AND pd.is_deleted = false
        AND (
          -- Document without folder: check project access
          (pd.folder_id IS NULL AND has_project_access(_user_id, pd.project_id))
          OR
          -- Document with folder: check folder access
          (
            pd.folder_id IS NOT NULL
            AND (
              -- Personal folder: only creator
              (pf.folder_type = 'personal' AND pf.created_by = _user_id)
              OR
              -- Shared folder: project access
              (pf.folder_type = 'shared' AND has_project_access(_user_id, pd.project_id))
              OR
              -- Client folder: client access or project access
              (
                pf.folder_type = 'client'
                AND (
                  EXISTS (
                    SELECT 1 FROM public.folder_client_access fca
                    JOIN public.client_project_access cpa ON cpa.client_id = fca.client_id
                    WHERE fca.folder_id = pf.id
                    AND cpa.user_id = _user_id
                    AND fca.can_view = true
                  )
                  OR
                  has_project_access(_user_id, pd.project_id)
                )
              )
            )
          )
        )
      )
    $$;
  END IF;
END;
$ensure_docs$;

-- =================================================================
-- X. ENSURE update_updated_at_column() EXISTS
-- =================================================================

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $f$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $f$;
  END IF;
END;
$$;

-- =================================================================
-- 11. CREATE TRIGGER TO UPDATE UPDATED_AT
-- =================================================================

DROP TRIGGER IF EXISTS update_folder_templates_updated_at
  ON public.folder_templates;

CREATE TRIGGER update_folder_templates_updated_at
BEFORE UPDATE ON public.folder_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DO $guard_folder_client_access$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folder_client_access' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS update_folder_client_access_updated_at
      ON public.folder_client_access;

    CREATE TRIGGER update_folder_client_access_updated_at
    BEFORE UPDATE ON public.folder_client_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$guard_folder_client_access$;

-- =================================================================
-- 12. ADD COMMENTS FOR DOCUMENTATION
-- =================================================================
DO $guard_project_folders_comments$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'project_folders' AND n.nspname = 'public'
  ) THEN
    COMMENT ON COLUMN public.project_folders.folder_type IS 'Type of folder: personal (only creator), shared (project team), client (client-accessible)';
    COMMENT ON COLUMN public.project_folders.client_accessible IS 'Whether this folder is accessible to clients (for client-type folders)';
    COMMENT ON COLUMN public.project_folders.is_template IS 'Whether this folder was created from a standard template';
    COMMENT ON COLUMN public.project_folders.template_source_id IS 'Reference to the template used to create this folder structure';
  END IF;
END;
$guard_project_folders_comments$;
