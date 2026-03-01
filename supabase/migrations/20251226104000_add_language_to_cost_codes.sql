-- Migration: Add language support to cost_codes table
-- This enables multilingual cost codes (e.g., MO/MAT/EQP for pt-BR, LAB/MAT/EQT for en-US)

-- Step 1: Add language column with default value
ALTER TABLE cost_codes ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';

-- Step 2: Update existing records to have en-US language
UPDATE cost_codes SET language = 'en-US' WHERE language IS NULL OR language = '';

-- Step 3: Make language NOT NULL after backfill
ALTER TABLE cost_codes ALTER COLUMN language SET NOT NULL;

-- Step 4: Drop old unique constraint on code
ALTER TABLE cost_codes DROP CONSTRAINT IF EXISTS cost_codes_code_key;
ALTER TABLE cost_codes DROP CONSTRAINT IF EXISTS cost_codes_code_unique;

-- Step 5: Add composite unique constraint (code + language)
ALTER TABLE cost_codes ADD CONSTRAINT cost_codes_code_language_unique UNIQUE (code, language);

-- Step 6: Add check constraint for valid languages
ALTER TABLE cost_codes ADD CONSTRAINT check_language_valid 
  CHECK (language IN ('en-US', 'pt-BR', 'es-ES', 'fr-FR'));

-- Step 7: Add index on language for performance
CREATE INDEX IF NOT EXISTS idx_cost_codes_language ON cost_codes(language);

-- Step 8: Seed multilingual cost codes
-- Portuguese (Brazil) cost codes
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('MO', 'Mão de Obra', 'pt-BR', 1, 10, true),
  ('MAT', 'Materiais', 'pt-BR', 1, 20, true),
  ('EQP', 'Equipamentos', 'pt-BR', 1, 30, true),
  ('TER', 'Terceiros', 'pt-BR', 1, 40, true),
  ('TAX', 'Taxas', 'pt-BR', 1, 50, true),
  ('IND', 'Indiretos', 'pt-BR', 1, 60, true),
  ('ADM', 'Despesas Administrativas', 'pt-BR', 1, 70, true)
ON CONFLICT (code, language) DO NOTHING;

-- English (US) cost codes (if not already present)
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('LAB', 'Labor', 'en-US', 1, 10, true),
  ('MAT', 'Materials', 'en-US', 1, 20, true),
  ('EQT', 'Equipment', 'en-US', 1, 30, true),
  ('SUB', 'Subcontract', 'en-US', 1, 40, true),
  ('FEE', 'Permits & Fees', 'en-US', 1, 50, true),
  ('OVH', 'Overhead / General Conditions', 'en-US', 1, 60, true),
  ('ADM', 'Administrative Expenses', 'en-US', 1, 70, true)
ON CONFLICT (code, language) DO NOTHING;

-- Spanish (Spain) cost codes - using similar structure to English
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('MO', 'Mano de Obra', 'es-ES', 1, 10, true),
  ('MAT', 'Materiales', 'es-ES', 1, 20, true),
  ('EQP', 'Equipos', 'es-ES', 1, 30, true),
  ('SUB', 'Subcontratación', 'es-ES', 1, 40, true),
  ('TAX', 'Tasas y Permisos', 'es-ES', 1, 50, true),
  ('IND', 'Indirectos', 'es-ES', 1, 60, true),
  ('ADM', 'Gastos Administrativos', 'es-ES', 1, 70, true)
ON CONFLICT (code, language) DO NOTHING;

-- French (France) cost codes - using similar structure to English
INSERT INTO cost_codes (code, name, language, level, sort_order, is_active) VALUES
  ('MO', 'Main dEuvre', 'fr-FR', 1, 10, true),
  ('MAT', 'Matériaux', 'fr-FR', 1, 20, true),
  ('EQP', 'Équipements', 'fr-FR', 1, 30, true),
  ('ST', 'Sous-Traitance', 'fr-FR', 1, 40, true),
  ('TAX', 'Taxes et Permis', 'fr-FR', 1, 50, true),
  ('IND', 'Indirects', 'fr-FR', 1, 60, true),
  ('ADM', 'Frais Administratifs', 'fr-FR', 1, 70, true)
ON CONFLICT (code, language) DO NOTHING;

-- Add RLS policy for cost_codes if not already present
-- Users can view all cost codes
DROP POLICY IF EXISTS "Users can view cost codes" ON cost_codes;
CREATE POLICY "Users can view cost codes"
  ON cost_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify cost codes (this is a system table)
DROP POLICY IF EXISTS "Only admins can modify cost codes" ON cost_codes;
CREATE POLICY "Only admins can modify cost codes"
  ON cost_codes FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );
