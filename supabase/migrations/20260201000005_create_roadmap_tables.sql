-- Roadmap and Sprint Planning Tables
-- Creates infrastructure for task management and sprint planning

-- Sprints table
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sprints_code ON public.sprints(code);
CREATE INDEX idx_sprints_status ON public.sprints(status);

-- Roadmap Items (Tasks) table
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  estimated_effort INTEGER,
  actual_effort INTEGER,
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_sprint_id ON public.roadmap_items(sprint_id);
CREATE INDEX idx_items_parent_id ON public.roadmap_items(parent_id);
CREATE INDEX idx_items_status ON public.roadmap_items(status);
CREATE INDEX idx_items_assignee_id ON public.roadmap_items(assignee_id);
CREATE INDEX idx_items_due_date ON public.roadmap_items(due_date);

-- Task Dependencies table
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to', 'duplicates')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id)
);

-- Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - can be refined per organization)
CREATE POLICY "Everyone can view sprints"
  ON public.sprints FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Everyone can view roadmap items"
  ON public.roadmap_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Everyone can view task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage roadmap items"
  ON public.roadmap_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
