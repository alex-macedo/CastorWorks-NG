-- ============================================================
-- Milestone Dependencies: Critical path and sequence tracking
-- Phase C of Timeline Phase 2
-- ============================================================

BEGIN;

-- Enum: Types of dependencies between milestones
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_dependency_type') THEN
    CREATE TYPE milestone_dependency_type AS ENUM (
      'FS', -- Finish-to-Start: Predecessor must finish before Successor starts (standard)
      'SS', -- Start-to-Start: Predecessor must start before Successor starts
      'FF', -- Finish-to-Finish: Predecessor must finish before Successor finishes
      'SF'  -- Start-to-Finish: Predecessor must start before Successor finishes (rare)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS milestone_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES project_milestone_definitions(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES project_milestone_definitions(id) ON DELETE CASCADE,
  dependency_type milestone_dependency_type NOT NULL DEFAULT 'FS',
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Logic constraints
  CONSTRAINT predecessor_successor_not_equal CHECK (predecessor_id != successor_id),
  CONSTRAINT unique_predecessor_successor UNIQUE (predecessor_id, successor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestone_deps_project ON milestone_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_deps_predecessor ON milestone_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_milestone_deps_successor ON milestone_dependencies(successor_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_milestone_dependencies_updated_at ON milestone_dependencies;
CREATE TRIGGER set_milestone_dependencies_updated_at
  BEFORE UPDATE ON milestone_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE milestone_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view dependencies for accessible projects" ON milestone_dependencies;
CREATE POLICY "Users can view dependencies for accessible projects"
  ON milestone_dependencies FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Managers can manage dependencies" ON milestone_dependencies;
CREATE POLICY "Managers can manage dependencies"
  ON milestone_dependencies FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'admin_office'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'project_manager'::app_role) OR
    has_role(auth.uid(), 'admin_office'::app_role)
  );

COMMIT;
