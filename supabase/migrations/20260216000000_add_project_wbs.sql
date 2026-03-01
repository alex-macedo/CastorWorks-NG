-- Migration: Add project WBS hierarchy and link to financial entries
-- Created on: 2026-01-17

-- 1. Create project_wbs_nodes table
CREATE TABLE IF NOT EXISTS public.project_wbs_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.project_wbs_nodes(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure codes are unique within a project
    UNIQUE(project_id, code)
);

-- 2. Add wbs_node_id to project_financial_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'project_financial_entries' AND COLUMN_NAME = 'wbs_node_id'
    ) THEN
        ALTER TABLE public.project_financial_entries 
        ADD COLUMN wbs_node_id UUID REFERENCES public.project_wbs_nodes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_project_wbs_nodes_project_id ON public.project_wbs_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_wbs_nodes_parent_id ON public.project_wbs_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_financial_entries_wbs_node_id ON public.project_financial_entries(wbs_node_id);

-- 4. Enable RLS on project_wbs_nodes
ALTER TABLE public.project_wbs_nodes ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for project_wbs_nodes
DO $$ 
BEGIN
    -- DROP existing policies to be safe and ensure they are updated if needed
    DROP POLICY IF EXISTS "Users can view project WBS nodes" ON public.project_wbs_nodes;
    DROP POLICY IF EXISTS "Project members can insert WBS nodes" ON public.project_wbs_nodes;
    DROP POLICY IF EXISTS "Project members can update WBS nodes" ON public.project_wbs_nodes;
    DROP POLICY IF EXISTS "Project members can delete WBS nodes" ON public.project_wbs_nodes;

    CREATE POLICY "Users can view project WBS nodes"
    ON public.project_wbs_nodes FOR SELECT
    USING (public.has_project_access(auth.uid(), project_id));

    CREATE POLICY "Project members can insert WBS nodes"
    ON public.project_wbs_nodes FOR INSERT
    WITH CHECK (public.has_project_access(auth.uid(), project_id));

    CREATE POLICY "Project members can update WBS nodes"
    ON public.project_wbs_nodes FOR UPDATE
    USING (public.has_project_access(auth.uid(), project_id));

    CREATE POLICY "Project members can delete WBS nodes"
    ON public.project_wbs_nodes FOR DELETE
    USING (public.has_project_access(auth.uid(), project_id));
END $$;

-- 6. Update project_wbs_nodes with updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_project_wbs_nodes_updated_at' AND tgrelid = 'public.project_wbs_nodes'::regclass
  ) THEN
    CREATE TRIGGER update_project_wbs_nodes_updated_at
      BEFORE UPDATE ON public.project_wbs_nodes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 7. Data Migration: Create "Default/Uncategorized" node for existing projects
DO $$
DECLARE
    proj RECORD;
    default_node_id UUID;
BEGIN
    FOR proj IN SELECT id FROM public.projects LOOP
        -- Check if a default node already exists for this project
        SELECT id INTO default_node_id FROM public.project_wbs_nodes 
        WHERE project_id = proj.id AND code = '00' LIMIT 1;

        IF default_node_id IS NULL THEN
            INSERT INTO public.project_wbs_nodes (project_id, code, title, level, description)
            VALUES (proj.id, '00', 'Uncategorized', 1, 'Default node for existing entries')
            RETURNING id INTO default_node_id;
        END IF;

        -- Update existing financial entries for this project that don't have a wbs_node_id
        UPDATE public.project_financial_entries
        SET wbs_node_id = default_node_id
        WHERE project_id = proj.id AND wbs_node_id IS NULL;
    END LOOP;
END $$;
