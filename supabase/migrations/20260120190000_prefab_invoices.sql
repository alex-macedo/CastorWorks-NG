-- Prefab invoice tracking for 40%/70% reduction eligibility
-- Based on IN RFB 2021/2021, Art. 26, § 2º

CREATE TABLE IF NOT EXISTS tax_prefab_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  supplier_name TEXT,
  supplier_document TEXT, -- CNPJ
  total_value DECIMAL(12,2) NOT NULL CHECK (total_value > 0),

  -- Item categorization
  description TEXT,
  item_category TEXT NOT NULL CHECK (item_category IN (
    'prefab_eligible',     -- Counts toward 40% threshold
    'prefab_excluded',     -- Excluded items (slabs, foundations, etc.)
    'other'                -- Not prefab-related
  )),

  -- Documentation
  file_path TEXT,
  file_url TEXT,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE tax_prefab_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage prefab invoices for accessible projects
-- We use a function has_project_access that should exist in the system
CREATE POLICY "Users can manage prefab invoices for accessible projects"
  ON tax_prefab_invoices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = tax_prefab_invoices.tax_project_id
      AND (
        auth.uid() = tp.created_by OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = tp.project_id
          AND ptm.user_id = auth.uid()
        )
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prefab_invoices_project ON tax_prefab_invoices(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_prefab_invoices_category ON tax_prefab_invoices(item_category);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_tax_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prefab_invoices_updated') THEN
        CREATE TRIGGER trg_prefab_invoices_updated
          BEFORE UPDATE ON tax_prefab_invoices
          FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at_column();
    END IF;
END $$;

-- View for invoice totals per project
CREATE OR REPLACE VIEW tax_prefab_invoice_summary AS
SELECT
  tax_project_id,
  COUNT(*) AS total_invoices,
  COALESCE(SUM(CASE WHEN item_category = 'prefab_eligible' THEN total_value ELSE 0 END), 0) AS eligible_total,
  COALESCE(SUM(CASE WHEN item_category = 'prefab_excluded' THEN total_value ELSE 0 END), 0) AS excluded_total,
  COALESCE(SUM(total_value), 0) AS grand_total
FROM tax_prefab_invoices
GROUP BY tax_project_id;
