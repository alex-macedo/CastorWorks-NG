-- ==========================================================================
-- Import MÉDIA CUSTO OBRA PDF source + benchmark dataset
-- Source file: docs/EagleConstrutora/MEDIA CUSTO OBRA.pdf
-- SHA256: aa61656d4b8476991946d1c15a161e24c1cce8a415a004b8ac53b2b3fceac4ff
-- ==========================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1) Track benchmark document sources (auditability / reproducibility)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS construction_cost_benchmark_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  source_file_path TEXT NOT NULL,
  source_file_hash TEXT NOT NULL,
  source_version TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE construction_cost_benchmark_sources IS
'Registry of external benchmark documents imported into the construction benchmark model.';

COMMENT ON COLUMN construction_cost_benchmark_sources.source_file_path IS
'Workspace-relative path of imported document.';

COMMENT ON COLUMN construction_cost_benchmark_sources.source_file_hash IS
'SHA-256 hash of source file content for import traceability.';

ALTER TABLE construction_cost_benchmark_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'construction_cost_benchmark_sources'
      AND policyname = 'All users can view benchmark sources'
  ) THEN
    CREATE POLICY "All users can view benchmark sources"
      ON construction_cost_benchmark_sources FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'construction_cost_benchmark_sources'
      AND policyname = 'Admins can manage benchmark sources'
  ) THEN
    CREATE POLICY "Admins can manage benchmark sources"
      ON construction_cost_benchmark_sources FOR ALL
      USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_benchmark_sources_updated_at'
  ) THEN
    CREATE TRIGGER update_benchmark_sources_updated_at
      BEFORE UPDATE ON construction_cost_benchmark_sources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2) Persist extracted page text from source PDF
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS construction_cost_benchmark_source_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES construction_cost_benchmark_sources(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  extracted_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, page_number)
);

COMMENT ON TABLE construction_cost_benchmark_source_pages IS
'Raw text extracted from each imported benchmark source page.';

ALTER TABLE construction_cost_benchmark_source_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'construction_cost_benchmark_source_pages'
      AND policyname = 'All users can view benchmark source pages'
  ) THEN
    CREATE POLICY "All users can view benchmark source pages"
      ON construction_cost_benchmark_source_pages FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'construction_cost_benchmark_source_pages'
      AND policyname = 'Admins can manage benchmark source pages'
  ) THEN
    CREATE POLICY "Admins can manage benchmark source pages"
      ON construction_cost_benchmark_source_pages FOR ALL
      USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3) Link benchmark projects to source document
-- --------------------------------------------------------------------------
ALTER TABLE construction_cost_benchmark_projects
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES construction_cost_benchmark_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_project_key TEXT;

CREATE INDEX IF NOT EXISTS idx_benchmark_projects_source_id
  ON construction_cost_benchmark_projects(source_id);

-- --------------------------------------------------------------------------
-- 4) Insert source registry row (idempotent)
-- --------------------------------------------------------------------------
INSERT INTO construction_cost_benchmark_sources (
  source_name,
  source_file_path,
  source_file_hash,
  source_version,
  notes
)
VALUES (
  'MEDIA CUSTO OBRA PDF',
  'docs/EagleConstrutora/MEDIA CUSTO OBRA.pdf',
  'aa61656d4b8476991946d1c15a161e24c1cce8a415a004b8ac53b2b3fceac4ff',
  '2026-02-15',
  'Imported benchmark summary and material-category averages extracted from source PDF.'
)
ON CONFLICT (source_name) DO UPDATE
SET
  source_file_path = EXCLUDED.source_file_path,
  source_file_hash = EXCLUDED.source_file_hash,
  source_version = EXCLUDED.source_version,
  notes = EXCLUDED.notes,
  updated_at = now();

-- --------------------------------------------------------------------------
-- 5) Store page-level extracted source snippets (idempotent)
-- --------------------------------------------------------------------------
WITH source_row AS (
  SELECT id FROM construction_cost_benchmark_sources
  WHERE source_name = 'MEDIA CUSTO OBRA PDF'
)
INSERT INTO construction_cost_benchmark_source_pages (source_id, page_number, extracted_text)
SELECT
  source_row.id,
  page_data.page_number,
  page_data.extracted_text
FROM source_row
CROSS JOIN (
  VALUES
    (
      1,
      'Resumo PDF - página 1: MÉDIA 3.091.476,22 R$ | 553,04 R$/m² | 5590 m². Casas com total e VLR/m²: Pedro e Olivia (107.513,60 | 597,30), Bruna e Paulo (108.358,15 | 541,79), Jose Francisco (145.618,10 | 554,76), Helena (175.605,74 | 532,14), Wania (103.374,09 | 544,07), Matheus (104.642,00 | 581,34), Guilherme (107.513,60 | 597,30), Danilo Marcio (219.387,65 | 522,35), Valeria (145.618,10 | 554,76), Otavio (175.605,74 | 532,14).'
    ),
    (
      2,
      'Resumo PDF - página 2: Continuação dos projetos: Gilmar e Renata (175.605,74 | 532,14), Edson (103.374,09 | 544,07), Gabriel e Natalia (104.642,00 | 581,34), Edgar (107.513,60 | 597,30), Edner e Natalia (108.358,15 | 541,79), Henrique e Michele (145.618,10 | 554,76), Ricardo e Kelly (175.605,74 | 532,14), Renato e Debora (103.374,09 | 544,07), Mauricio e Elizabeth (104.642,00 | 581,34).'
    )
) AS page_data(page_number, extracted_text)
ON CONFLICT (source_id, page_number) DO UPDATE
SET extracted_text = EXCLUDED.extracted_text;

-- --------------------------------------------------------------------------
-- 6) Upsert project summary benchmarks from PDF
-- --------------------------------------------------------------------------
WITH source_row AS (
  SELECT id FROM construction_cost_benchmark_sources
  WHERE source_name = 'MEDIA CUSTO OBRA PDF'
),
pdf_projects AS (
  SELECT * FROM (
    VALUES
      ('Casa Pedro e Olivia',         180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'pedro_olivia'),
      ('Casa Bruna e Paulo',          200.00::DECIMAL, 108358.15::DECIMAL, 541.79::DECIMAL, 'bruna_paulo'),
      ('Casa Jose Francisco',         262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'jose_francisco'),
      ('Casa Helena',                 330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'helena'),
      ('Casa Wania',                  190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'wania'),
      ('Casa Matheus',                180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'matheus'),
      ('Casa Guilherme',              180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'guilherme'),
      ('Casa Danilo Marcio',          420.00::DECIMAL, 219387.65::DECIMAL, 522.35::DECIMAL, 'danilo_marcio'),
      ('Casa Valeria',                262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'valeria'),
      ('Casa Otavio',                 330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'otavio'),
      ('Casa Gilmar e Renata',        330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'gilmar_renata'),
      ('Casa Edson',                  190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'edson'),
      ('Casa Gabriel e Natalia',      180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'gabriel_natalia'),
      ('Casa Edgar',                  180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'edgar'),
      ('Casa Edner e Natalia',        200.00::DECIMAL, 108358.15::DECIMAL, 541.79::DECIMAL, 'edner_natalia'),
      ('Casa Henrique e Michele',     262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'henrique_michele'),
      ('Casa Ricardo e Kelly',        330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'ricardo_kelly'),
      ('Casa Renato e Debora',        190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'renato_debora'),
      ('Casa Mauricio e Elizabeth',   180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'mauricio_elizabeth')
  ) AS rows(project_name, total_area_m2, total_cost, cost_per_m2, source_project_key)
)
UPDATE construction_cost_benchmark_projects p
SET
  total_area_m2 = d.total_area_m2,
  total_cost = d.total_cost,
  cost_per_m2 = d.cost_per_m2,
  benchmark_date = '2025-01-01',
  source = 'MEDIA CUSTO OBRA PDF',
  source_id = s.id,
  source_project_key = d.source_project_key,
  updated_at = now()
FROM pdf_projects d
CROSS JOIN source_row s
WHERE p.project_name = d.project_name;

WITH source_row AS (
  SELECT id FROM construction_cost_benchmark_sources
  WHERE source_name = 'MEDIA CUSTO OBRA PDF'
),
pdf_projects AS (
  SELECT * FROM (
    VALUES
      ('Casa Pedro e Olivia',         180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'pedro_olivia'),
      ('Casa Bruna e Paulo',          200.00::DECIMAL, 108358.15::DECIMAL, 541.79::DECIMAL, 'bruna_paulo'),
      ('Casa Jose Francisco',         262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'jose_francisco'),
      ('Casa Helena',                 330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'helena'),
      ('Casa Wania',                  190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'wania'),
      ('Casa Matheus',                180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'matheus'),
      ('Casa Guilherme',              180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'guilherme'),
      ('Casa Danilo Marcio',          420.00::DECIMAL, 219387.65::DECIMAL, 522.35::DECIMAL, 'danilo_marcio'),
      ('Casa Valeria',                262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'valeria'),
      ('Casa Otavio',                 330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'otavio'),
      ('Casa Gilmar e Renata',        330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'gilmar_renata'),
      ('Casa Edson',                  190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'edson'),
      ('Casa Gabriel e Natalia',      180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'gabriel_natalia'),
      ('Casa Edgar',                  180.00::DECIMAL, 107513.60::DECIMAL, 597.30::DECIMAL, 'edgar'),
      ('Casa Edner e Natalia',        200.00::DECIMAL, 108358.15::DECIMAL, 541.79::DECIMAL, 'edner_natalia'),
      ('Casa Henrique e Michele',     262.49::DECIMAL, 145618.10::DECIMAL, 554.76::DECIMAL, 'henrique_michele'),
      ('Casa Ricardo e Kelly',        330.00::DECIMAL, 175605.74::DECIMAL, 532.14::DECIMAL, 'ricardo_kelly'),
      ('Casa Renato e Debora',        190.00::DECIMAL, 103374.09::DECIMAL, 544.07::DECIMAL, 'renato_debora'),
      ('Casa Mauricio e Elizabeth',   180.00::DECIMAL, 104642.00::DECIMAL, 581.34::DECIMAL, 'mauricio_elizabeth')
  ) AS rows(project_name, total_area_m2, total_cost, cost_per_m2, source_project_key)
)
INSERT INTO construction_cost_benchmark_projects (
  project_name,
  total_area_m2,
  total_cost,
  cost_per_m2,
  benchmark_date,
  source,
  source_id,
  source_project_key
)
SELECT
  d.project_name,
  d.total_area_m2,
  d.total_cost,
  d.cost_per_m2,
  '2025-01-01',
  'MEDIA CUSTO OBRA PDF',
  s.id,
  d.source_project_key
FROM pdf_projects d
CROSS JOIN source_row s
WHERE NOT EXISTS (
  SELECT 1
  FROM construction_cost_benchmark_projects p
  WHERE p.project_name = d.project_name
);

-- --------------------------------------------------------------------------
-- 7) Upsert PDF category averages from source summary line
-- --------------------------------------------------------------------------
WITH avg_rows AS (
  SELECT * FROM (
    VALUES
      ('DIVERSOS', 48477.10::DECIMAL, 8.67::DECIMAL),
      ('MADEIRA', 379870.40::DECIMAL, 67.96::DECIMAL),
      ('PONTALETE/CAIBRO', 27764.80::DECIMAL, 4.97::DECIMAL),
      ('FERRAGEM', 879752.56::DECIMAL, 157.38::DECIMAL),
      ('PEDRISCO/PEDRA 1/2', 91115.20::DECIMAL, 16.30::DECIMAL),
      ('AREIA FINA', 206400.00::DECIMAL, 36.92::DECIMAL),
      ('CIMENTO', 511639.20::DECIMAL, 91.53::DECIMAL),
      ('CAL', 117719.60::DECIMAL, 21.06::DECIMAL),
      ('BLOCO', 388226.80::DECIMAL, 69.45::DECIMAL),
      ('TIJOLO', 118803.20::DECIMAL, 21.25::DECIMAL),
      ('IMPERMEABILIZANTE', 51716.80::DECIMAL, 9.25::DECIMAL),
      ('PREGO/ARAME', 99812.40::DECIMAL, 17.86::DECIMAL),
      ('AREIA GROSSA', 152994.40::DECIMAL, 27.37::DECIMAL),
      ('ARGAMASSA', 17183.76::DECIMAL, 3.07::DECIMAL)
  ) AS rows(material_category, average_total_cost, average_cost_per_m2)
)
INSERT INTO construction_cost_benchmark_averages (
  benchmark_group,
  material_category,
  average_total_cost,
  average_cost_per_m2,
  sample_size,
  benchmark_date
)
SELECT
  'MEDIA CUSTO OBRA PDF',
  a.material_category,
  a.average_total_cost,
  a.average_cost_per_m2,
  19,
  '2025-01-01'
FROM avg_rows a
ON CONFLICT (benchmark_group, material_category) DO UPDATE
SET
  average_total_cost = EXCLUDED.average_total_cost,
  average_cost_per_m2 = EXCLUDED.average_cost_per_m2,
  sample_size = EXCLUDED.sample_size,
  benchmark_date = EXCLUDED.benchmark_date,
  updated_at = now();

COMMIT;
