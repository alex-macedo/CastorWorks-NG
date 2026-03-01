-- ==========================================================================
-- Seed remaining Construction Cost Benchmark projects from MÉDIA CUSTO OBRA PDF
-- Source: docs/EagleConstrutora/MEDIA CUSTO OBRA.pdf (24 completed projects)
-- This migration adds the 4 projects present in the PDF but not in prior seeds.
-- Uses only base columns so it runs whether or not 20260215 (source_id) was applied.
-- ==========================================================================

BEGIN;

INSERT INTO construction_cost_benchmark_projects (
  project_name,
  total_area_m2,
  total_cost,
  cost_per_m2,
  benchmark_date,
  source
)
SELECT
  n.project_name,
  n.total_area_m2,
  n.total_cost,
  n.cost_per_m2,
  '2025-01-01'::DATE,
  'MEDIA CUSTO OBRA PDF'
FROM (
  VALUES
    ('Casa Cascata II Levi',               330.00::DECIMAL, 182503.20::DECIMAL, 553.04::DECIMAL),
    ('Casa Recanto da Esmeraldas (Thiago)', 330.00::DECIMAL, 182503.20::DECIMAL, 553.04::DECIMAL),
    ('Casa Damha Sergio',                  330.00::DECIMAL, 182503.20::DECIMAL, 553.04::DECIMAL),
    ('Casa Danilo Piacenti (M14)',         330.00::DECIMAL, 182503.20::DECIMAL, 553.04::DECIMAL)
) AS n(project_name, total_area_m2, total_cost, cost_per_m2)
WHERE NOT EXISTS (
  SELECT 1
  FROM construction_cost_benchmark_projects p
  WHERE p.project_name = n.project_name
);

-- Optionally link to source when the sources table and columns exist (20260215)
DO $$
DECLARE
  v_source_id UUID;
  v_has_key_col BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'construction_cost_benchmark_projects' AND column_name = 'source_project_key'
  ) INTO v_has_key_col;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'construction_cost_benchmark_sources'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'construction_cost_benchmark_projects' AND column_name = 'source_id'
  ) THEN
    SELECT id INTO v_source_id
    FROM construction_cost_benchmark_sources
    WHERE source_name = 'MEDIA CUSTO OBRA PDF'
    LIMIT 1;
    IF v_source_id IS NOT NULL THEN
      IF v_has_key_col THEN
        UPDATE construction_cost_benchmark_projects p
        SET source_id = v_source_id,
            source_project_key = v.key,
            updated_at = now()
        FROM (VALUES
          ('Casa Cascata II Levi', 'cascata_ii_levi'),
          ('Casa Recanto da Esmeraldas (Thiago)', 'recanto_esmeraldas_thiago'),
          ('Casa Damha Sergio', 'damha_sergio'),
          ('Casa Danilo Piacenti (M14)', 'danilo_piacenti_m14')
        ) AS v(name, key)
        WHERE p.project_name = v.name AND p.source_id IS NULL;
      ELSE
        UPDATE construction_cost_benchmark_projects p
        SET source_id = v_source_id,
            updated_at = now()
        WHERE p.project_name IN (
          'Casa Cascata II Levi',
          'Casa Recanto da Esmeraldas (Thiago)',
          'Casa Damha Sergio',
          'Casa Danilo Piacenti (M14)'
        ) AND p.source_id IS NULL;
      END IF;
    END IF;
  END IF;
END $$;

COMMIT;
