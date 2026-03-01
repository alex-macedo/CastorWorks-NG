-- Migration: Seed construction cost benchmarks from PDF data
-- Purpose: Import historical construction cost data for benchmarking
-- Date: 2026-02-14
-- Data Source: MÉDIA CUSTO OBRA PDF

BEGIN;

-- Insert benchmark projects from PDF
INSERT INTO construction_cost_benchmark_projects (project_name, total_area_m2, total_cost, cost_per_m2, benchmark_date) VALUES
  ('Casa Pedro e Olivia', 262.49, 107513.60, 597.30, '2025-01-01'),
  ('Casa Bruna e Paulo', 200.00, 108358.15, 541.79, '2025-01-01'),
  ('Casa Jose Francisco', 262.49, 145618.10, 554.76, '2025-01-01'),
  ('Casa Helena', 330.00, 175605.74, 532.14, '2025-01-01'),
  ('Casa Wania', 190.00, 103374.09, 544.07, '2025-01-01'),
  ('Casa Matheus', 180.00, 104642.00, 581.34, '2025-01-01'),
  ('Casa Guilherme', 262.49, 107513.60, 597.30, '2025-01-01'),
  ('Casa Danilo Marcio', 420.00, 219387.65, 522.35, '2025-01-01'),
  ('Casa Valeria', 262.49, 145618.10, 554.76, '2025-01-01'),
  ('Casa Otavio', 330.00, 175605.74, 532.14, '2025-01-01'),
  ('Casa Gilmar e Renata', 330.00, 175605.74, 532.14, '2025-01-01'),
  ('Casa Edson', 190.00, 103374.09, 544.07, '2025-01-01'),
  ('Casa Gabriel e Natalia', 180.00, 104642.00, 581.34, '2025-01-01'),
  ('Casa Edgar', 262.49, 107513.60, 597.30, '2025-01-01'),
  ('Casa Edner e Natalia', 200.00, 108358.15, 541.79, '2025-01-01'),
  ('Casa Henrique e Michele', 262.49, 145618.10, 554.76, '2025-01-01'),
  ('Casa Ricardo e Kelly', 330.00, 175605.74, 532.14, '2025-01-01'),
  ('Casa Renato e Debora', 190.00, 103374.09, 544.07, '2025-01-01'),
  ('Casa Mauricio e Elizabeth', 180.00, 104642.00, 581.34, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Get project IDs for material cost insertion
DO $$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
BEGIN
  -- Casa Pedro e Olivia materials
  SELECT id INTO v_project_id FROM construction_cost_benchmark_projects WHERE project_name = 'Casa Pedro e Olivia' LIMIT 1;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO construction_cost_benchmark_materials (benchmark_project_id, material_category, total_cost, cost_per_m2) VALUES
      (v_project_id, 'DIVERSOS', 21864.20, 83.30),
      (v_project_id, 'MADEIRA', 3777.80, 14.39),
      (v_project_id, 'PONTALETE/CAIBRO', 2034.00, 7.75),
      (v_project_id, 'FERRAGEM', 33792.30, 101.87),
      (v_project_id, 'PEDRISCO/PEDRA 1/2', 2725.00, 10.38),
      (v_project_id, 'AREIA FINA', 11687.00, 44.52),
      (v_project_id, 'CIMENTO', 23132.80, 88.13),
      (v_project_id, 'CAL', 11397.10, 43.42),
      (v_project_id, 'BLOCO', 17549.00, 66.86),
      (v_project_id, 'TIJOLO', 5330.00, 20.31),
      (v_project_id, 'IMPERMEABILIZANTE', 2822.90, 10.75),
      (v_project_id, 'PREGO', 1480.00, 5.64),
      (v_project_id, 'AREIA GROSSA', 5704.00, 21.73),
      (v_project_id, 'ARGAMASSA', 2322.00, 8.85)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Casa Bruna e Paulo materials
  SELECT id INTO v_project_id FROM construction_cost_benchmark_projects WHERE project_name = 'Casa Bruna e Paulo' LIMIT 1;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO construction_cost_benchmark_materials (benchmark_project_id, material_category, total_cost, cost_per_m2) VALUES
      (v_project_id, 'DIVERSOS', 2028.20, 10.15),
      (v_project_id, 'MADEIRA', 12829.80, 64.15),
      (v_project_id, 'PONTALETE/CAIBRO', 599.20, 3.00),
      (v_project_id, 'FERRAGEM', 27504.55, 137.52),
      (v_project_id, 'PEDRISCO/PEDRA 1/2', 3150.00, 15.75),
      (v_project_id, 'AREIA FINA', 4440.00, 22.20),
      (v_project_id, 'CIMENTO', 18205.90, 91.03),
      (v_project_id, 'CAL', 8267.90, 41.34),
      (v_project_id, 'BLOCO', 15640.00, 78.20),
      (v_project_id, 'TIJOLO', 4612.50, 23.06),
      (v_project_id, 'IMPERMEABILIZANTE', 1208.50, 6.04),
      (v_project_id, 'PREGO/ARAME', 2547.90, 12.74),
      (v_project_id, 'AREIA GROSSA', 5952.50, 29.76),
      (v_project_id, 'ARGAMASSA', 1554.50, 7.77)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Casa Helena materials
  SELECT id INTO v_project_id FROM construction_cost_benchmark_projects WHERE project_name = 'Casa Helena' LIMIT 1;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO construction_cost_benchmark_materials (benchmark_project_id, material_category, total_cost, cost_per_m2) VALUES
      (v_project_id, 'DIVERSOS', 2680.60, 13.68),
      (v_project_id, 'MADEIRA', 36230.60, 107.11),
      (v_project_id, 'PONTALETE/CAIBRO', 1220.00, 6.42),
      (v_project_id, 'FERRAGEM', 52068.00, 274.04),
      (v_project_id, 'PEDRISCO/PEDRA 1/2', 7854.00, 41.34),
      (v_project_id, 'AREIA FINA', 11658.00, 61.36),
      (v_project_id, 'CIMENTO', 30758.00, 161.88),
      (v_project_id, 'CAL', 1136.00, 5.98),
      (v_project_id, 'BLOCO', 21587.00, 113.62),
      (v_project_id, 'TIJOLO', 5082.00, 26.75),
      (v_project_id, 'IMPERMEABILIZANTE', 1428.00, 7.52),
      (v_project_id, 'PREGO/ARAME', 8964.00, 47.18),
      (v_project_id, 'AREIA GROSSA', 10520.00, 55.37),
      (v_project_id, 'ARGAMASSA', 380.74, 2.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Casa Matheus materials
  SELECT id INTO v_project_id FROM construction_cost_benchmark_projects WHERE project_name = 'Casa Matheus' LIMIT 1;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO construction_cost_benchmark_materials (benchmark_project_id, material_category, total_cost, cost_per_m2) VALUES
      (v_project_id, 'DIVERSOS', 685.70, 3.80),
      (v_project_id, 'MADEIRA', 13078.60, 72.66),
      (v_project_id, 'PONTALETE/CAIBRO', 742.00, 4.12),
      (v_project_id, 'FERRAGEM', 32474.90, 180.42),
      (v_project_id, 'PEDRISCO/PEDRA 1/2', 3060.00, 17.00),
      (v_project_id, 'AREIA FINA', 8173.00, 45.41),
      (v_project_id, 'CIMENTO', 16321.20, 90.67),
      (v_project_id, 'CAL', 3100.50, 17.23),
      (v_project_id, 'BLOCO', 10218.00, 56.77),
      (v_project_id, 'TIJOLO', 6514.00, 36.19),
      (v_project_id, 'IMPERMEABILIZANTE', 1970.40, 10.95),
      (v_project_id, 'PREGO/ARAME', 3903.20, 21.68),
      (v_project_id, 'AREIA GROSSA', 4402.50, 24.46),
      (v_project_id, 'ARGAMASSA', 0.00, 0.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Casa Wania materials
  SELECT id INTO v_project_id FROM construction_cost_benchmark_projects WHERE project_name = 'Casa Wania' LIMIT 1;
  IF v_project_id IS NOT NULL THEN
    INSERT INTO construction_cost_benchmark_materials (benchmark_project_id, material_category, total_cost, cost_per_m2) VALUES
      (v_project_id, 'DIVERSOS', 1377.00, 7.25),
      (v_project_id, 'MADEIRA', 10124.60, 53.29),
      (v_project_id, 'PONTALETE/CAIBRO', 1220.00, 6.42),
      (v_project_id, 'FERRAGEM', 31847.89, 167.62),
      (v_project_id, 'PEDRISCO/PEDRA 1/2', 3915.00, 20.61),
      (v_project_id, 'AREIA FINA', 6780.00, 35.68),
      (v_project_id, 'CIMENTO', 17094.60, 89.97),
      (v_project_id, 'CAL', 572.40, 3.01),
      (v_project_id, 'BLOCO', 14112.70, 74.28),
      (v_project_id, 'TIJOLO', 3082.30, 16.22),
      (v_project_id, 'IMPERMEABILIZANTE', 724.00, 3.81),
      (v_project_id, 'PREGO/ARAME', 4964.90, 26.13),
      (v_project_id, 'AREIA GROSSA', 7520.00, 39.58),
      (v_project_id, 'ARGAMASSA', 38.70, 0.20)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Calculate and populate average costs
  PERFORM calculate_benchmark_averages('2025 Brazilian Residential Construction');
END $$;

COMMIT;
