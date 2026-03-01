-- Ensure company_profiles table exists (required for foreign key)
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on company_profiles if not already enabled
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure cost_codes table exists (required for foreign key in budget_template_cost_codes)
-- This table is created in 20251213093000_phase_first_cost_control.sql, but we ensure it exists here
CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  level INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on cost_codes if not already enabled
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;

-- Create budget_templates table
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  budget_type VARCHAR(50) DEFAULT 'simple' CHECK (budget_type IN ('simple', 'cost_control')),
  total_budget_amount DECIMAL(12,2),
  has_phases BOOLEAN DEFAULT FALSE,
  has_cost_codes BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_template_items table
CREATE TABLE IF NOT EXISTS budget_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  description TEXT,
  budgeted_amount DECIMAL(12,2) NOT NULL,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_template_phases table
CREATE TABLE IF NOT EXISTS budget_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  phase_name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_template_cost_codes table
-- Note: cost_code_id references cost_codes table (not project_cost_codes)
CREATE TABLE IF NOT EXISTS budget_template_cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_template_cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_templates
-- Users can view company templates or public templates
DROP POLICY IF EXISTS "Users can view company templates" ON budget_templates;
CREATE POLICY "Users can view company templates"
  ON budget_templates FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR is_public = TRUE
  );

-- Users can create templates in their company
DROP POLICY IF EXISTS "Users can create templates in their company" ON budget_templates;
CREATE POLICY "Users can create templates in their company"
  ON budget_templates FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own templates
DROP POLICY IF EXISTS "Users can update their own templates" ON budget_templates;
CREATE POLICY "Users can update their own templates"
  ON budget_templates FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete their own templates" ON budget_templates;
CREATE POLICY "Users can delete their own templates"
  ON budget_templates FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for budget_template_items
-- Access inherited from parent template
DROP POLICY IF EXISTS "Users can view items of templates they can see" ON budget_template_items;
CREATE POLICY "Users can view items of templates they can see"
  ON budget_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE (
        company_id = (
          SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR is_public = TRUE
      )
    )
  );

-- Only template creator can modify items
DROP POLICY IF EXISTS "Template creator can modify items" ON budget_template_items;
CREATE POLICY "Template creator can modify items"
  ON budget_template_items FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can update items" ON budget_template_items;
CREATE POLICY "Template creator can update items"
  ON budget_template_items FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can delete items" ON budget_template_items;
CREATE POLICY "Template creator can delete items"
  ON budget_template_items FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for budget_template_phases
DROP POLICY IF EXISTS "Users can view phases of templates they can see" ON budget_template_phases;
CREATE POLICY "Users can view phases of templates they can see"
  ON budget_template_phases FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE (
        company_id = (
          SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR is_public = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "Template creator can modify phases" ON budget_template_phases;
CREATE POLICY "Template creator can modify phases"
  ON budget_template_phases FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can update phases" ON budget_template_phases;
CREATE POLICY "Template creator can update phases"
  ON budget_template_phases FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can delete phases" ON budget_template_phases;
CREATE POLICY "Template creator can delete phases"
  ON budget_template_phases FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for budget_template_cost_codes
DROP POLICY IF EXISTS "Users can view cost codes of templates they can see" ON budget_template_cost_codes;
CREATE POLICY "Users can view cost codes of templates they can see"
  ON budget_template_cost_codes FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE (
        company_id = (
          SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR is_public = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "Template creator can modify cost codes" ON budget_template_cost_codes;
CREATE POLICY "Template creator can modify cost codes"
  ON budget_template_cost_codes FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can update cost codes" ON budget_template_cost_codes;
CREATE POLICY "Template creator can update cost codes"
  ON budget_template_cost_codes FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creator can delete cost codes" ON budget_template_cost_codes;
CREATE POLICY "Template creator can delete cost codes"
  ON budget_template_cost_codes FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM budget_templates WHERE created_by = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_budget_templates_company_id ON budget_templates(company_id);
CREATE INDEX idx_budget_templates_created_by ON budget_templates(created_by);
CREATE INDEX idx_budget_templates_budget_type ON budget_templates(budget_type);
CREATE INDEX idx_budget_template_items_template_id ON budget_template_items(template_id);
CREATE INDEX idx_budget_template_items_sort_order ON budget_template_items(template_id, sort_order);
CREATE INDEX idx_budget_template_phases_template_id ON budget_template_phases(template_id);
CREATE INDEX idx_budget_template_cost_codes_template_id ON budget_template_cost_codes(template_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budget_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_templates_updated_at
  BEFORE UPDATE ON budget_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_templates_timestamp();

CREATE TRIGGER budget_template_items_updated_at
  BEFORE UPDATE ON budget_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_templates_timestamp();

CREATE TRIGGER budget_template_phases_updated_at
  BEFORE UPDATE ON budget_template_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_templates_timestamp();

CREATE TRIGGER budget_template_cost_codes_updated_at
  BEFORE UPDATE ON budget_template_cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_templates_timestamp();
