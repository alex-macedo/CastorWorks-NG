-- Migration: Standardize cost codes to use English keys with language column for names only
-- This fixes the language toggle bug where cost codes don't load when switching languages
--
-- Strategy:
-- 1. Keep 'code' as canonical English keys (LAB, MAT, EQT, SUB, FEE, OVH, ADM)
-- 2. Store localized names in the 'name' column with 'language' differentiating them
-- 3. WBS items will store the English 'code' value in standard_cost_code
-- 4. UI will look up translations based on code + current language

-- Step 1: Update Portuguese codes to use English canonical keys
UPDATE cost_codes SET code = 'LAB' WHERE code = 'MO' AND language = 'pt-BR';
UPDATE cost_codes SET code = 'EQT' WHERE code = 'EQP' AND language = 'pt-BR';
UPDATE cost_codes SET code = 'SUB' WHERE code = 'TER' AND language = 'pt-BR';
UPDATE cost_codes SET code = 'FEE' WHERE code = 'TAX' AND language = 'pt-BR';
UPDATE cost_codes SET code = 'OVH' WHERE code = 'IND' AND language = 'pt-BR';

-- Step 2: Update Spanish codes to use English canonical keys
UPDATE cost_codes SET code = 'LAB' WHERE code = 'MO' AND language = 'es-ES';
UPDATE cost_codes SET code = 'EQT' WHERE code = 'EQP' AND language = 'es-ES';
UPDATE cost_codes SET code = 'FEE' WHERE code = 'TAX' AND language = 'es-ES';
UPDATE cost_codes SET code = 'OVH' WHERE code = 'IND' AND language = 'es-ES';

-- Step 3: Update French codes to use English canonical keys
UPDATE cost_codes SET code = 'LAB' WHERE code = 'MO' AND language = 'fr-FR';
UPDATE cost_codes SET code = 'EQT' WHERE code = 'EQP' AND language = 'fr-FR';
UPDATE cost_codes SET code = 'SUB' WHERE code = 'ST' AND language = 'fr-FR';
UPDATE cost_codes SET code = 'FEE' WHERE code = 'TAX' AND language = 'fr-FR';
UPDATE cost_codes SET code = 'OVH' WHERE code = 'IND' AND language = 'fr-FR';

-- Step 4: Ensure all languages have the same set of canonical codes
-- Portuguese translations
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('LAB', 'Mão de Obra', 'pt-BR', 1, 10, true),
  ('MAT', 'Materiais', 'pt-BR', 1, 20, true),
  ('EQT', 'Equipamentos', 'pt-BR', 1, 30, true),
  ('SUB', 'Terceiros', 'pt-BR', 1, 40, true),
  ('FEE', 'Taxas', 'pt-BR', 1, 50, true),
  ('OVH', 'Indiretos', 'pt-BR', 1, 60, true),
  ('ADM', 'Despesas Administrativas', 'pt-BR', 1, 70, true)
ON CONFLICT (code, language) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- Spanish translations
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('LAB', 'Mano de Obra', 'es-ES', 1, 10, true),
  ('MAT', 'Materiales', 'es-ES', 1, 20, true),
  ('EQT', 'Equipos', 'es-ES', 1, 30, true),
  ('SUB', 'Subcontratación', 'es-ES', 1, 40, true),
  ('FEE', 'Tasas y Permisos', 'es-ES', 1, 50, true),
  ('OVH', 'Indirectos', 'es-ES', 1, 60, true),
  ('ADM', 'Gastos Administrativos', 'es-ES', 1, 70, true)
ON CONFLICT (code, language) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- French translations
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('LAB', 'Main d''Œuvre', 'fr-FR', 1, 10, true),
  ('MAT', 'Matériaux', 'fr-FR', 1, 20, true),
  ('EQT', 'Équipements', 'fr-FR', 1, 30, true),
  ('SUB', 'Sous-Traitance', 'fr-FR', 1, 40, true),
  ('FEE', 'Taxes et Permis', 'fr-FR', 1, 50, true),
  ('OVH', 'Indirects', 'fr-FR', 1, 60, true),
  ('ADM', 'Frais Administratifs', 'fr-FR', 1, 70, true)
ON CONFLICT (code, language) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- English translations (ensure they exist with proper names)
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('LAB', 'Labor', 'en-US', 1, 10, true),
  ('MAT', 'Materials', 'en-US', 1, 20, true),
  ('EQT', 'Equipment', 'en-US', 1, 30, true),
  ('SUB', 'Subcontract', 'en-US', 1, 40, true),
  ('FEE', 'Permits & Fees', 'en-US', 1, 50, true),
  ('OVH', 'Overhead / General Conditions', 'en-US', 1, 60, true),
  ('ADM', 'Administrative Expenses', 'en-US', 1, 70, true)
ON CONFLICT (code, language) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- Step 5: Update existing WBS template items that might have old cost codes
-- This ensures existing templates work with the new canonical codes
UPDATE project_wbs_template_items SET standard_cost_code = 'LAB' WHERE standard_cost_code IN ('MO');
UPDATE project_wbs_template_items SET standard_cost_code = 'EQT' WHERE standard_cost_code IN ('EQP');
UPDATE project_wbs_template_items SET standard_cost_code = 'SUB' WHERE standard_cost_code IN ('TER', 'ST');
UPDATE project_wbs_template_items SET standard_cost_code = 'FEE' WHERE standard_cost_code IN ('TAX');
UPDATE project_wbs_template_items SET standard_cost_code = 'OVH' WHERE standard_cost_code IN ('IND');

-- Step 6: Create a view for easier querying of cost codes with fallback to English
CREATE OR REPLACE VIEW cost_codes_with_fallback AS
SELECT DISTINCT ON (cc.code, COALESCE(cc_lang.language, cc.language))
  cc.code,
  COALESCE(cc_lang.name, cc.name) as name,
  COALESCE(cc_lang.language, cc.language) as language,
  cc.level,
  cc.sort_order,
  cc.is_active
FROM cost_codes cc
LEFT JOIN cost_codes cc_lang ON cc.code = cc_lang.code AND cc_lang.language != 'en-US'
WHERE cc.language = 'en-US' OR cc_lang.language IS NOT NULL
ORDER BY cc.code, COALESCE(cc_lang.language, cc.language), cc.sort_order;

-- Grant access to the view
GRANT SELECT ON cost_codes_with_fallback TO authenticated;
