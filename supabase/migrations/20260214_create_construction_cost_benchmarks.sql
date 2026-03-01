-- Migration: Create construction cost benchmarks tables
-- Purpose: Store historical construction cost data from PDF for benchmarking
-- Date: 2026-02-14
-- Data Source: MÉDIA CUSTO OBRA (Average Construction Cost Report)

BEGIN;

-- Table to store benchmark projects (houses from PDF)
CREATE TABLE IF NOT EXISTS construction_cost_benchmark_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  total_area_m2 DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(15, 2) NOT NULL,
  cost_per_m2 DECIMAL(10, 2) NOT NULL,
  benchmark_date DATE DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'PDF Import',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE construction_cost_benchmark_projects IS
'Historical construction cost benchmarks from completed projects. Used for cost estimation and comparison.';

COMMENT ON COLUMN construction_cost_benchmark_projects.project_name IS 'Name of the benchmark project (e.g., Casa Pedro e Olivia, Casa Bruna e Paulo)';
COMMENT ON COLUMN construction_cost_benchmark_projects.total_area_m2 IS 'Total built area in square meters';
COMMENT ON COLUMN construction_cost_benchmark_projects.total_cost IS 'Total project cost in BRL';
COMMENT ON COLUMN construction_cost_benchmark_projects.cost_per_m2 IS 'Average cost per square meter (R$/m²)';
COMMENT ON COLUMN construction_cost_benchmark_projects.benchmark_date IS 'Date when this benchmark data was collected';

-- Table to store material cost breakdowns per benchmark project
CREATE TABLE IF NOT EXISTS construction_cost_benchmark_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_project_id UUID NOT NULL REFERENCES construction_cost_benchmark_projects(id) ON DELETE CASCADE,
  material_category TEXT NOT NULL,
  total_cost DECIMAL(15, 2) NOT NULL,
  cost_per_m2 DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE construction_cost_benchmark_materials IS
'Material cost breakdown for each benchmark project. Categories: Diversos, Madeira, Ferragem, Cimento, etc.';

COMMENT ON COLUMN construction_cost_benchmark_materials.material_category IS 'Material category: DIVERSOS, MADEIRA, PONTALETE/CAIBRO, FERRAGEM, PEDRISCO/PEDRA 1/2, AREIA FINA, CIMENTO, CAL, BLOCO, TIJOLO, IMPERMEABILIZANTE, PREGO/ARAME, AREIA GROSSA, ARGAMASSA';
COMMENT ON COLUMN construction_cost_benchmark_materials.total_cost IS 'Total cost for this material in BRL';
COMMENT ON COLUMN construction_cost_benchmark_materials.cost_per_m2 IS 'Cost per square meter for this material (R$/m²)';

-- Table to store overall benchmark statistics (MÉDIA)
CREATE TABLE IF NOT EXISTS construction_cost_benchmark_averages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_group TEXT NOT NULL DEFAULT 'Default Group',
  material_category TEXT NOT NULL,
  average_total_cost DECIMAL(15, 2) NOT NULL,
  average_cost_per_m2 DECIMAL(10, 2) NOT NULL,
  sample_size INTEGER DEFAULT 1,
  benchmark_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(benchmark_group, material_category)
);

COMMENT ON TABLE construction_cost_benchmark_averages IS
'Average material costs across all benchmark projects. Used for quick cost estimation.';

COMMENT ON COLUMN construction_cost_benchmark_averages.benchmark_group IS 'Group name for this set of benchmarks (e.g., "2025 Brazilian Residential Construction")';
COMMENT ON COLUMN construction_cost_benchmark_averages.sample_size IS 'Number of projects included in this average';

-- RLS Policies (all users can view benchmarks, only admins can modify)
ALTER TABLE construction_cost_benchmark_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_cost_benchmark_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_cost_benchmark_averages ENABLE ROW LEVEL SECURITY;

-- View policies (all authenticated users can view benchmarks)
CREATE POLICY "All users can view benchmark projects"
  ON construction_cost_benchmark_projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All users can view benchmark materials"
  ON construction_cost_benchmark_materials FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All users can view benchmark averages"
  ON construction_cost_benchmark_averages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Modify policies (only admins)
CREATE POLICY "Admins can manage benchmark projects"
  ON construction_cost_benchmark_projects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage benchmark materials"
  ON construction_cost_benchmark_materials FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage benchmark averages"
  ON construction_cost_benchmark_averages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_benchmark_projects_cost_per_m2
  ON construction_cost_benchmark_projects(cost_per_m2);

CREATE INDEX idx_benchmark_projects_area
  ON construction_cost_benchmark_projects(total_area_m2);

CREATE INDEX idx_benchmark_materials_project
  ON construction_cost_benchmark_materials(benchmark_project_id);

CREATE INDEX idx_benchmark_materials_category
  ON construction_cost_benchmark_materials(material_category);

CREATE INDEX idx_benchmark_averages_group_category
  ON construction_cost_benchmark_averages(benchmark_group, material_category);

-- Updated_at triggers
CREATE TRIGGER update_benchmark_projects_updated_at
  BEFORE UPDATE ON construction_cost_benchmark_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benchmark_averages_updated_at
  BEFORE UPDATE ON construction_cost_benchmark_averages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate benchmark averages from projects
CREATE OR REPLACE FUNCTION calculate_benchmark_averages(group_name TEXT DEFAULT 'Default Group')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear existing averages for this group
  DELETE FROM construction_cost_benchmark_averages WHERE benchmark_group = group_name;

  -- Calculate and insert new averages
  INSERT INTO construction_cost_benchmark_averages (
    benchmark_group,
    material_category,
    average_total_cost,
    average_cost_per_m2,
    sample_size,
    benchmark_date
  )
  SELECT
    group_name,
    material_category,
    AVG(total_cost) as average_total_cost,
    AVG(cost_per_m2) as average_cost_per_m2,
    COUNT(*) as sample_size,
    CURRENT_DATE
  FROM construction_cost_benchmark_materials
  GROUP BY material_category;
END;
$$;

COMMENT ON FUNCTION calculate_benchmark_averages IS
'Recalculates average material costs from all benchmark projects. Call after importing new data.';

COMMIT;
