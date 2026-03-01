CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  file_url TEXT,
  configuration JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_project ON generated_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);

-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_reports (project-scoped access)
DROP POLICY IF EXISTS "project_scoped_select_reports" ON generated_reports;
DROP POLICY IF EXISTS "project_scoped_insert_reports" ON generated_reports;
DROP POLICY IF EXISTS "project_scoped_update_reports" ON generated_reports;
DROP POLICY IF EXISTS "project_scoped_delete_reports" ON generated_reports;

-- RLS Policies for generated_reports (project-scoped access)
CREATE POLICY "project_scoped_select_reports" ON generated_reports FOR SELECT
  TO authenticated USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));
CREATE POLICY "project_scoped_insert_reports" ON generated_reports FOR INSERT
  TO authenticated WITH CHECK (project_id IS NULL OR has_project_access(auth.uid(), project_id));
CREATE POLICY "project_scoped_update_reports" ON generated_reports FOR UPDATE
  TO authenticated USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));
CREATE POLICY "project_scoped_delete_reports" ON generated_reports FOR DELETE
  TO authenticated USING (project_id IS NULL OR has_project_access(auth.uid(), project_id));

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'My Construction Company',
  company_logo_url TEXT,
  header_text TEXT,
  footer_text TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_settings (global settings - authenticated users can read, admins can update)
DROP POLICY IF EXISTS "authenticated_select_company_settings" ON company_settings;
DROP POLICY IF EXISTS "admin_update_company_settings" ON company_settings;

-- RLS Policies for company_settings (global settings - authenticated users can read, admins can update)
CREATE POLICY "authenticated_select_company_settings" ON company_settings FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_update_company_settings" ON company_settings FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default company settings row if none exists
INSERT INTO company_settings (company_name)
SELECT 'My Construction Company'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);
