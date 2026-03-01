CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_identifier TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  release_notes TEXT,
  release_notes_html TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  
  CONSTRAINT valid_week CHECK (week_number >= 1 AND week_number <= 53),
  CONSTRAINT valid_status CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_identifier ON public.sprints(sprint_identifier);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON public.sprints(start_date, end_date);

-- Add sprint_id to roadmap_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'roadmap_items'
      AND column_name = 'sprint_id'
  ) THEN
    ALTER TABLE public.roadmap_items
      ADD COLUMN sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_sprint ON public.roadmap_items(sprint_id);

-- Create sprint_items_snapshot table
CREATE TABLE IF NOT EXISTS public.sprint_items_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  item_description TEXT,
  item_status TEXT NOT NULL,
  item_category TEXT,
  item_priority TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_effort TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(sprint_id, roadmap_item_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_snapshot_sprint ON public.sprint_items_snapshot(sprint_id);

-- RLS Policies for sprints
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_sprints" ON public.sprints;
CREATE POLICY "admin_select_sprints"
  ON public.sprints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create sprints" ON public.sprints;
CREATE POLICY "Authenticated users can create sprints"
  ON public.sprints FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
CREATE POLICY "Authenticated users can update sprints"
  ON public.sprints FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete sprints" ON public.sprints;
CREATE POLICY "Admins can delete sprints"
  ON public.sprints FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sprint_items_snapshot
ALTER TABLE public.sprint_items_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_sprint_snapshots" ON public.sprint_items_snapshot;
CREATE POLICY "admin_select_sprint_snapshots"
  ON public.sprint_items_snapshot FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can manage sprint snapshots" ON public.sprint_items_snapshot;
CREATE POLICY "System can manage sprint snapshots"
  ON public.sprint_items_snapshot FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function: Get current sprint identifier
CREATE OR REPLACE FUNCTION public.get_current_sprint_identifier()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(CURRENT_DATE, 'IYYY') || '-' || 
         LPAD(TO_CHAR(CURRENT_DATE, 'IW'), 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate sprint dates from identifier
CREATE OR REPLACE FUNCTION public.calculate_sprint_dates(sprint_id TEXT)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
DECLARE
  year_part INTEGER;
  week_part INTEGER;
BEGIN
  year_part := SPLIT_PART(sprint_id, '-', 1)::INTEGER;
  week_part := SPLIT_PART(sprint_id, '-', 2)::INTEGER;
  
  RETURN QUERY
  SELECT 
    (year_part || '-01-01')::DATE + ((week_part - 1) * 7)::INTEGER AS start_date,
    (year_part || '-01-01')::DATE + ((week_part - 1) * 7 + 6)::INTEGER AS end_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Close sprint and generate release notes
CREATE OR REPLACE FUNCTION public.close_sprint(p_sprint_id UUID)
RETURNS JSON AS $$
DECLARE
  v_sprint RECORD;
  v_release_notes TEXT;
  v_item RECORD;
  v_completed_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT * INTO v_sprint FROM public.sprints WHERE id = p_sprint_id;
  
  IF v_sprint.status = 'closed' THEN
    RAISE EXCEPTION 'Sprint is already closed';
  END IF;
  
  SELECT COUNT(*) INTO v_total_count
  FROM public.roadmap_items WHERE sprint_id = p_sprint_id;
  
  SELECT COUNT(*) INTO v_completed_count
  FROM public.roadmap_items 
  WHERE sprint_id = p_sprint_id AND status = 'done';
  
  v_release_notes := '# Sprint ' || v_sprint.sprint_identifier || ' - ' || v_sprint.title || E'\n\n';
  v_release_notes := v_release_notes || '**Sprint Period:** ' || 
    TO_CHAR(v_sprint.start_date, 'Mon DD, YYYY') || ' - ' || 
    TO_CHAR(v_sprint.end_date, 'Mon DD, YYYY') || E'\n\n';
  v_release_notes := v_release_notes || '**Completion Rate:** ' || 
    v_completed_count || '/' || v_total_count || 
    ' (' || ROUND((v_completed_count::NUMERIC / NULLIF(v_total_count, 0) * 100), 1) || '%)' || E'\n\n';
  
  v_release_notes := v_release_notes || E'## Completed Items\n\n';
  
  FOR v_item IN 
    SELECT * FROM roadmap_items 
    WHERE sprint_id = p_sprint_id AND status = 'done'
    ORDER BY category, priority DESC
  LOOP
    INSERT INTO public.sprint_items_snapshot (
      sprint_id, roadmap_item_id, item_title, item_description,
      item_status, item_category, item_priority, completed_at, estimated_effort
    ) VALUES (
      p_sprint_id, v_item.id, v_item.title, v_item.description,
      v_item.status, v_item.category, v_item.priority, 
      v_item.completed_at, v_item.estimated_effort
    );
    
    v_release_notes := v_release_notes || '### ' || v_item.title || E'\n';
    IF v_item.description IS NOT NULL THEN
      v_release_notes := v_release_notes || v_item.description || E'\n';
    END IF;
    v_release_notes := v_release_notes || '- **Category:** ' || COALESCE(v_item.category, 'N/A') || E'\n';
    v_release_notes := v_release_notes || '- **Priority:** ' || COALESCE(v_item.priority, 'N/A') || E'\n';
    v_release_notes := v_release_notes || '- **Completed:** ' || 
      TO_CHAR(v_item.completed_at, 'Mon DD, YYYY HH24:MI') || E'\n\n';
  END LOOP;
  
  IF v_total_count > v_completed_count THEN
    v_release_notes := v_release_notes || E'## Incomplete Items\n\n';
    FOR v_item IN 
    SELECT * FROM public.roadmap_items 
      WHERE sprint_id = p_sprint_id AND status != 'done'
      ORDER BY priority DESC
    LOOP
      INSERT INTO public.sprint_items_snapshot (
        sprint_id, roadmap_item_id, item_title, item_description,
        item_status, item_category, item_priority, completed_at, estimated_effort
      ) VALUES (
        p_sprint_id, v_item.id, v_item.title, v_item.description,
        v_item.status, v_item.category, v_item.priority, 
        v_item.completed_at, v_item.estimated_effort
      );
      
      v_release_notes := v_release_notes || '- ' || v_item.title || 
        ' (' || v_item.status || ')' || E'\n';
    END LOOP;
  END IF;
  
  UPDATE public.sprints SET
    status = 'closed',
    closed_at = NOW(),
    closed_by = auth.uid(),
    release_notes = v_release_notes,
    total_items = v_total_count,
    completed_items = v_completed_count,
    updated_at = NOW()
  WHERE id = p_sprint_id;
  
  RETURN json_build_object(
    'success', true,
    'sprint_id', p_sprint_id,
    'total_items', v_total_count,
    'completed_items', v_completed_count,
    'release_notes_preview', LEFT(v_release_notes, 500)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
