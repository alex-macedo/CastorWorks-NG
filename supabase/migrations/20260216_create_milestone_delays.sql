-- ============================================================
-- Milestone Delays: Structured delay documentation system
-- Phase A of Timeline Phase 2
-- ============================================================

BEGIN;

-- Enum: Root cause categories for construction delays
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delay_root_cause') THEN
    CREATE TYPE delay_root_cause AS ENUM (
      'client_definition',
      'financial',
      'labor',
      'material',
      'weather',
      'design_change',
      'regulatory',
      'quality_rework'
    );
  END IF;
END $$;

-- Enum: Party responsible for the delay
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delay_responsible_party') THEN
    CREATE TYPE delay_responsible_party AS ENUM (
      'client',
      'general_contractor',
      'subcontractor',
      'supplier',
      'regulatory_authority',
      'force_majeure'
    );
  END IF;
END $$;

-- Enum: Impact scope of the delay
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delay_impact_type') THEN
    CREATE TYPE delay_impact_type AS ENUM (
      'isolated',
      'cascading',
      'critical_path'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS milestone_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES project_milestone_definitions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  delay_days INTEGER NOT NULL CHECK (delay_days > 0),
  root_cause delay_root_cause NOT NULL,
  responsible_party delay_responsible_party NOT NULL,
  impact_type delay_impact_type NOT NULL DEFAULT 'isolated',
  description TEXT NOT NULL,
  corrective_actions TEXT,
  subcontractor_trade TEXT,
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestone_delays_milestone ON milestone_delays(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_delays_project ON milestone_delays(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_delays_root_cause ON milestone_delays(root_cause);
CREATE INDEX IF NOT EXISTS idx_milestone_delays_reported_at ON milestone_delays(reported_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_milestone_delays_updated_at ON milestone_delays;
CREATE TRIGGER set_milestone_delays_updated_at
  BEFORE UPDATE ON milestone_delays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE milestone_delays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view delays for accessible projects" ON milestone_delays;
CREATE POLICY "Users can view delays for accessible projects"
  ON milestone_delays FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Managers can create delay records" ON milestone_delays;
CREATE POLICY "Managers can create delay records"
  ON milestone_delays FOR INSERT
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'project_manager'::app_role) OR
      has_role(auth.uid(), 'admin_office'::app_role) OR
      has_role(auth.uid(), 'site_supervisor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Managers can update delay records" ON milestone_delays;
CREATE POLICY "Managers can update delay records"
  ON milestone_delays FOR UPDATE
  USING (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'project_manager'::app_role) OR
      has_role(auth.uid(), 'admin_office'::app_role)
    )
  )
  WITH CHECK (
    has_project_access(auth.uid(), project_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'project_manager'::app_role) OR
      has_role(auth.uid(), 'admin_office'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admins can delete delay records" ON milestone_delays;
CREATE POLICY "Admins can delete delay records"
  ON milestone_delays FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

COMMIT;
