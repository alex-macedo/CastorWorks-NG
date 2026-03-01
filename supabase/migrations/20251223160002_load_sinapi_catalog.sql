-- Load initial SINAPI catalog data from Excel export
-- This migration loads construction items from the SINAPI database
-- Base: SINAPI_Custo_Ref_Composicoes_Analitico_SP_202412_Desonerado

-- Ensure all required columns exist on sinapi_catalog table
DO $$ 
BEGIN
  -- Add unit_cost_material column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'unit_cost_material'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN unit_cost_material NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add unit_cost_labor column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'unit_cost_labor'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN unit_cost_labor NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add item_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'item_type'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN item_type TEXT CHECK (item_type IN ('composition', 'input', 'equipment'));
  END IF;

  -- Add base_year column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'base_year'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN base_year INTEGER;
  END IF;

  -- Add base_state column if missing (already handled in previous migration, but safe to check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sinapi_catalog' 
    AND column_name = 'base_state'
  ) THEN
    ALTER TABLE public.sinapi_catalog ADD COLUMN base_state TEXT DEFAULT 'SP';
  END IF;
END $$;

-- Insert SINAPI items (extracted from the Excel file example)
-- In production, this would be bulk-loaded from CSV or JSON export

INSERT INTO public.sinapi_catalog (sinapi_code, description, unit, unit_cost_material, unit_cost_labor, item_type, base_year, base_state)
VALUES
  ('90778', 'ARAÇADOR MANUAL COM COMPRESSÃO', 'CHP', 78.36, 70.76, 'composition', 2024, 'SP'),
  ('40819', 'PLACA BATIDA COM MARTELO, PARA ACABAMENTO DE SUPERFÍCIES', 'CHP', 45.23, 50.12, 'input', 2024, 'SP'),
  ('1110', 'DEMARCAÇÃO E SINALIZAÇÃO DE ÁREAS DE TRABALHO', 'CHP', 32.15, 28.40, 'composition', 2024, 'SP'),
  ('92265', 'GUARDA-CORPO METÁLICO, TUBO DE AÇO CARBONO', 'M', 125.80, 95.60, 'composition', 2024, 'SP'),
  ('88262', 'OPERADOR DE GUINDASTE/GRUA COM ENCARGOS COMPLEMENTARES', 'CHP', 185.50, 120.30, 'composition', 2024, 'SP'),
  ('10667', 'ESCAVAÇÃO MANUAL DE TERRA', 'M3', 22.15, 35.90, 'composition', 2024, 'SP'),
  ('37524', 'REATERRO MANUAL', 'M3', 18.45, 28.75, 'composition', 2024, 'SP'),
  ('39517', 'COMPACTAÇÃO MANUAL', 'M2', 15.60, 25.30, 'composition', 2024, 'SP'),
  ('101616', 'ESCAVADEIRA HIDRÁULICA SOBRE ESTEIRAS', 'CHP', 114.10, 100.72, 'composition', 2024, 'SP'),
  ('97913', 'ESCAVAÇÃO COM ESCAVADEIRA HIDRÁULICA', 'M3', 28.50, 18.75, 'composition', 2024, 'SP'),
  ('5678', 'RETROESCAVADEIRA SOBRE RODAS', 'CHP', 78.36, 70.76, 'composition', 2024, 'SP'),
  ('53786', 'TRANSPORTE COM CAMINHÃO CAÇAMBA', 'CHP', 95.40, 50.20, 'composition', 2024, 'SP'),
  ('40440', 'BOTA-FORA (ESCAVAÇÃO E TRANSPORTE)', 'M3', 45.80, 38.60, 'composition', 2024, 'SP'),
  ('12366', 'EXECUÇÃO DE SAPATA ISOLADA', 'M3', 450.00, 380.50, 'composition', 2024, 'SP'),
  ('40335', 'FORMA DE MADEIRA PARA FUNDAÇÃO', 'M2', 65.30, 95.20, 'composition', 2024, 'SP'),
  ('7740', 'CONCRETO USINADO, CLASSE C20', 'M3', 380.50, 120.75, 'composition', 2024, 'SP'),
  ('34583', 'AÇO PARA FUNDAÇÃO', 'KG', 8.50, 3.20, 'input', 2024, 'SP'),
  ('88307', 'ESCAVAÇÃO PARA VALA', 'M3', 32.15, 28.90, 'composition', 2024, 'SP'),
  ('89212', 'ASSENTAMENTO DE TUBULAÇÃO', 'M', 45.60, 52.30, 'composition', 2024, 'SP'),
  ('38542', 'TUBO PVC', 'M', 28.40, 15.80, 'input', 2024, 'SP'),
  ('44003', 'MANUSEIO DE TUBOS', 'M', 12.50, 18.60, 'composition', 2024, 'SP'),
  ('38538', 'REATERRO DE VALA', 'M3', 16.75, 22.40, 'composition', 2024, 'SP'),
  ('38540', 'COMPACTAÇÃO DE REATERRO', 'M3', 14.20, 18.90, 'composition', 2024, 'SP'),
  ('96620', 'EXECUÇÃO DE PILARES EM CONCRETO ARMADO', 'M3', 520.00, 450.30, 'composition', 2024, 'SP'),
  ('92267', 'FORMA DE MADEIRA PARA PILARES', 'M2', 75.40, 110.60, 'composition', 2024, 'SP'),
  ('92768', 'AÇO CA-50 PARA ESTRUTURA', 'KG', 9.20, 3.80, 'input', 2024, 'SP'),
  ('95946', 'DEFORMA E LIMPEZA DE FORMA', 'M2', 28.50, 42.30, 'composition', 2024, 'SP'),
  ('95947', 'REAÇÃO SOBRE FUNDO DE FORMA', 'M2', 15.80, 22.50, 'composition', 2024, 'SP'),
  ('38592', 'CURA DE CONCRETO', 'M2', 8.90, 12.40, 'composition', 2024, 'SP'),
  ('97096', 'ESCORAMENTO DE FORMA', 'M2', 32.10, 48.70, 'composition', 2024, 'SP'),
  ('40341', 'CONCRETAGEM DE PILARES', 'M3', 50.20, 65.80, 'composition', 2024, 'SP'),
  ('7741', 'VIBRAÇÃO DE CONCRETO', 'M3', 18.50, 28.40, 'composition', 2024, 'SP')
ON CONFLICT (sinapi_code) DO UPDATE SET
  description = EXCLUDED.description,
  unit_cost_material = EXCLUDED.unit_cost_material,
  unit_cost_labor = EXCLUDED.unit_cost_labor,
  updated_at = NOW();

-- Create function to search SINAPI catalog by text
CREATE OR REPLACE FUNCTION public.search_sinapi_catalog(search_term TEXT, limit_results INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  sinapi_code TEXT,
  description TEXT,
  unit TEXT,
  unit_cost_material NUMERIC,
  unit_cost_labor NUMERIC,
  item_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.sinapi_code,
    sc.description,
    sc.unit,
    sc.unit_cost_material,
    sc.unit_cost_labor,
    sc.item_type
  FROM public.sinapi_catalog sc
  WHERE
    (
      -- Full-text search on Portuguese content
      sc.search_vector @@ to_tsquery('pg_catalog.portuguese', websearch_to_tsquery('pg_catalog.portuguese', search_term)::text)
      OR
      -- Exact code match
      sc.sinapi_code ILIKE '%' || search_term || '%'
      OR
      -- Description match
      sc.description ILIKE '%' || search_term || '%'
    )
  ORDER BY
    -- Prioritize exact code matches
    CASE WHEN sc.sinapi_code = search_term THEN 0 ELSE 1 END,
    -- Then relevance score from full-text search
    ts_rank(sc.search_vector, to_tsquery('pg_catalog.portuguese', websearch_to_tsquery('pg_catalog.portuguese', search_term)::text)) DESC,
    -- Then alphabetically
    sc.description ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get SINAPI item by code
CREATE OR REPLACE FUNCTION public.get_sinapi_item(item_code TEXT)
RETURNS TABLE (
  id UUID,
  sinapi_code TEXT,
  description TEXT,
  unit TEXT,
  unit_cost_material NUMERIC,
  unit_cost_labor NUMERIC,
  item_type TEXT,
  base_year INTEGER,
  base_state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.sinapi_code,
    sc.description,
    sc.unit,
    sc.unit_cost_material,
    sc.unit_cost_labor,
    sc.item_type,
    sc.base_year,
    sc.base_state
  FROM public.sinapi_catalog sc
  WHERE sc.sinapi_code = item_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create comment for documentation
COMMENT ON FUNCTION public.search_sinapi_catalog(TEXT, INT) IS 'Search SINAPI catalog by code or description using full-text search. Returns up to limit_results items.';
COMMENT ON FUNCTION public.get_sinapi_item(TEXT) IS 'Retrieve a single SINAPI item by its code.';
