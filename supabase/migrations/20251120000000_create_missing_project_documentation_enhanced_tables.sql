-- Migration: Create missing documentation-related tables for projects
-- Includes public.project_folders, public.folder_client_access, public.project_documents

-- Ensure base master tables exist (minimal skeletons)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  -- other columns will be added by later migrations if they exist
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  -- other columns will be added by later migrations if they exist
);

-- ============================================================================
-- PROJECT FOLDERS TABLE
-- Stores folder hierarchy and metadata for project-related documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  folder_type TEXT DEFAULT 'shared', -- Options: 'shared', 'client', etc.
  description TEXT,
  client_accessible BOOLEAN DEFAULT FALSE,
  parent_folder_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- FOLDER CLIENT ACCESS
-- Access control: which clients have access to which folders
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folder_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.project_folders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  access_granted BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PROJECT DOCUMENTS TABLE
-- Stores uploaded documents to folders/projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- Index suggestions for query optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_folders_project_id ON public.project_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_folder_id ON public.project_documents(folder_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================