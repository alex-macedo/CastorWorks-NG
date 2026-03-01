-- Create phase_templates table
CREATE TABLE IF NOT EXISTS phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE phase_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "authenticated_select_phase_templates"
  ON phase_templates;

DROP POLICY IF EXISTS "authenticated_insert_phase_templates"
  ON phase_templates;

DROP POLICY IF EXISTS "authenticated_update_non_system_templates"
  ON phase_templates;

DROP POLICY IF EXISTS "authenticated_delete_non_system_templates"
  ON phase_templates;

-- RLS Policies
CREATE POLICY "authenticated_select_phase_templates"
  ON phase_templates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "authenticated_insert_phase_templates"
  ON phase_templates FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role));

CREATE POLICY "authenticated_update_non_system_templates"
  ON phase_templates FOR UPDATE
  TO authenticated
  USING (is_system = false AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role)))
  WITH CHECK (is_system = false AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role)));

CREATE POLICY "authenticated_delete_non_system_templates"
  ON phase_templates FOR DELETE
  TO authenticated
  USING (is_system = false AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'project_manager'::app_role)));

-- Insert default system templates idempotently
INSERT INTO phase_templates (template_name, description, is_system, is_default, phases)
SELECT
  'Residential Construction',
  'Standard phases for residential building projects',
  true,
  true,
  '[
    {"sequence": 1, "phaseName": "Site Preparation", "defaultDurationDays": 14, "defaultBudgetPercentage": 8},
    {"sequence": 2, "phaseName": "Foundation", "defaultDurationDays": 21, "defaultBudgetPercentage": 15},
    {"sequence": 3, "phaseName": "Framing", "defaultDurationDays": 30, "defaultBudgetPercentage": 20},
    {"sequence": 4, "phaseName": "Rough-In (Electrical, Plumbing, HVAC)", "defaultDurationDays": 21, "defaultBudgetPercentage": 15},
    {"sequence": 5, "phaseName": "Insulation & Drywall", "defaultDurationDays": 14, "defaultBudgetPercentage": 10},
    {"sequence": 6, "phaseName": "Interior Finishing", "defaultDurationDays": 30, "defaultBudgetPercentage": 18},
    {"sequence": 7, "phaseName": "Exterior Finishing", "defaultDurationDays": 21, "defaultBudgetPercentage": 10},
    {"sequence": 8, "phaseName": "Final Inspection & Cleanup", "defaultDurationDays": 7, "defaultBudgetPercentage": 4}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM phase_templates WHERE template_name = 'Residential Construction'
);

INSERT INTO phase_templates (template_name, description, is_system, is_default, phases)
SELECT
  'Commercial Construction',
  'Standard phases for commercial building projects',
  true,
  false,
  '[
    {"sequence": 1, "phaseName": "Planning & Permits", "defaultDurationDays": 30, "defaultBudgetPercentage": 5},
    {"sequence": 2, "phaseName": "Site Development", "defaultDurationDays": 21, "defaultBudgetPercentage": 10},
    {"sequence": 3, "phaseName": "Foundation & Structure", "defaultDurationDays": 45, "defaultBudgetPercentage": 25},
    {"sequence": 4, "phaseName": "Building Envelope", "defaultDurationDays": 30, "defaultBudgetPercentage": 15},
    {"sequence": 5, "phaseName": "MEP Systems", "defaultDurationDays": 45, "defaultBudgetPercentage": 20},
    {"sequence": 6, "phaseName": "Interior Build-Out", "defaultDurationDays": 40, "defaultBudgetPercentage": 15},
    {"sequence": 7, "phaseName": "Systems Testing & Commissioning", "defaultDurationDays": 14, "defaultBudgetPercentage": 5},
    {"sequence": 8, "phaseName": "Final Inspection & Turnover", "defaultDurationDays": 10, "defaultBudgetPercentage": 5}
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM phase_templates WHERE template_name = 'Commercial Construction'
);
