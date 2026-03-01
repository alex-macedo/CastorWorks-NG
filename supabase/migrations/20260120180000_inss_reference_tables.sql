-- Migration: INSS Reference Tables for Database-Driven Configuration
-- Created: 2026-01-20
-- Purpose: Replace hardcoded INSS calculation constants with admin-manageable database tables
-- Reference: IN RFB 2021/2021 (Instrução Normativa RFB nº 2021/2021)

-- ============================================================================
-- Table 1: inss_rates_history
-- Stores INSS contribution rate components for historical accuracy and auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_rates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  patronal_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000,      -- 20% employer contribution
  sat_gilrat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0800,    -- 8% work accident insurance
  terceiros_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0580,     -- 5.8% third-party contributions
  additional_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0300,    -- 3% additional contributions
  total_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    patronal_rate + sat_gilrat_rate + terceiros_rate + additional_rate
  ) STORED,
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_rate_range CHECK (
    patronal_rate >= 0 AND patronal_rate <= 1 AND
    sat_gilrat_rate >= 0 AND sat_gilrat_rate <= 1 AND
    terceiros_rate >= 0 AND terceiros_rate <= 1 AND
    additional_rate >= 0 AND additional_rate <= 1
  ),
  CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Index for efficient date-based lookups
CREATE INDEX idx_inss_rates_effective_date ON inss_rates_history(effective_from DESC);

-- ============================================================================
-- Table 2: inss_fator_social_brackets
-- Stores Fator Social thresholds by area (IN RFB 2021/2021, Art. 26, § 1º)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_fator_social_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  area_min DECIMAL(10,2) NOT NULL,
  area_max DECIMAL(10,2) NOT NULL,
  fator_social DECIMAL(4,2) NOT NULL,
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_area_range CHECK (area_max > area_min AND area_min >= 0),
  CONSTRAINT valid_fator CHECK (fator_social > 0 AND fator_social <= 1),
  CONSTRAINT valid_bracket_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Index for efficient area-based lookups
CREATE INDEX idx_fator_social_area ON inss_fator_social_brackets(area_min, area_max);
CREATE INDEX idx_fator_social_effective ON inss_fator_social_brackets(effective_from DESC);

-- ============================================================================
-- Table 3: inss_category_reductions
-- Stores work category reduction multipliers (IN RFB 2021/2021, Art. 26, § 4º)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_category_reductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  category_code TEXT NOT NULL,           -- OBRA_NOVA, ACRESCIMO, REFORMA, DEMOLICAO
  category_name_pt TEXT NOT NULL,
  category_name_en TEXT NOT NULL,
  reduction_percentage DECIMAL(5,2) NOT NULL,  -- 0 for new, 65 for renovation, 90 for demolition
  multiplier DECIMAL(4,2) GENERATED ALWAYS AS (1 - reduction_percentage / 100) STORED,
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_reduction CHECK (reduction_percentage >= 0 AND reduction_percentage <= 100)
);

-- Unique constraint on category code per effective period
CREATE UNIQUE INDEX idx_category_unique ON inss_category_reductions(category_code, effective_from)
  WHERE effective_to IS NULL;

-- ============================================================================
-- Table 4: inss_labor_percentages
-- Stores labor percentage by construction type
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_labor_percentages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  construction_type_code TEXT NOT NULL,  -- ALVENARIA, MISTA, MADEIRA, PRE_MOLDADO, METALICA
  construction_type_name_pt TEXT NOT NULL,
  construction_type_name_en TEXT NOT NULL,
  labor_percentage DECIMAL(5,2) NOT NULL,  -- As percentage (e.g., 40 for 40%)
  labor_decimal DECIMAL(4,2) GENERATED ALWAYS AS (labor_percentage / 100) STORED,
  notes TEXT,
  legal_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_labor_pct CHECK (labor_percentage > 0 AND labor_percentage <= 100)
);

-- Unique constraint on type code per effective period
CREATE UNIQUE INDEX idx_labor_type_unique ON inss_labor_percentages(construction_type_code, effective_from)
  WHERE effective_to IS NULL;

-- ============================================================================
-- Table 5: inss_destination_factors
-- Stores equivalence factors by construction purpose
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_destination_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  destination_code TEXT NOT NULL,
  destination_name_pt TEXT NOT NULL,
  destination_name_en TEXT NOT NULL,
  equivalence_factor DECIMAL(4,2) NOT NULL,
  area_limit DECIMAL(10,2),              -- For casa popular: 70m² limit
  special_reduction_pct DECIMAL(5,2),    -- Additional reduction percentage (e.g., 50 for popular housing)
  notes TEXT,
  legal_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_factor CHECK (equivalence_factor > 0 AND equivalence_factor <= 2),
  CONSTRAINT valid_special_reduction CHECK (special_reduction_pct IS NULL OR (special_reduction_pct >= 0 AND special_reduction_pct <= 100))
);

-- Unique constraint on destination code per effective period
CREATE UNIQUE INDEX idx_destination_unique ON inss_destination_factors(destination_code, effective_from)
  WHERE effective_to IS NULL;

-- ============================================================================
-- Table 6: inss_fator_ajuste_rules
-- Stores Fator de Ajuste eligibility rules (IN RFB 2021/2021, Art. 33)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_fator_ajuste_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  area_threshold DECIMAL(10,2) NOT NULL,         -- 350m² boundary
  min_remuneration_pct DECIMAL(5,2) NOT NULL,    -- 50% or 70% of RMT minimum
  max_reduction_pct DECIMAL(5,2) NOT NULL,       -- Maximum savings percentage
  requires_dctfweb BOOLEAN NOT NULL DEFAULT true,
  dctfweb_exempt_first_month BOOLEAN NOT NULL DEFAULT true,
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_remuneration_pct CHECK (min_remuneration_pct > 0 AND min_remuneration_pct <= 100),
  CONSTRAINT valid_max_reduction CHECK (max_reduction_pct > 0 AND max_reduction_pct <= 100)
);

-- Index for area threshold lookups
CREATE INDEX idx_fator_ajuste_area ON inss_fator_ajuste_rules(area_threshold);

-- ============================================================================
-- Table 7: inss_prefab_rules
-- Stores prefabricated material reduction rules (IN RFB 2021/2021, Art. 26, § 2º)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_prefab_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  min_invoice_pct_of_cod DECIMAL(5,2) NOT NULL,  -- 40% threshold
  reduction_pct DECIMAL(5,2) NOT NULL,            -- 70% reduction
  excluded_items TEXT[] NOT NULL DEFAULT ARRAY[
    'lajes_pre_moldadas',
    'fundacoes',
    'pisos',
    'cobertura',
    'reparticoes_internas'
  ],
  apply_selic_adjustment BOOLEAN NOT NULL DEFAULT true,
  selic_additional_pct DECIMAL(5,2) DEFAULT 1.00,  -- +1%
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_invoice_threshold CHECK (min_invoice_pct_of_cod > 0 AND min_invoice_pct_of_cod <= 100),
  CONSTRAINT valid_prefab_reduction CHECK (reduction_pct > 0 AND reduction_pct <= 100)
);

-- ============================================================================
-- Table 8: inss_usinados_rules (Ready-mix concrete/mortar deduction)
-- Stores usinados deduction rules (IN RFB 2021/2021, Art. 26, § 5º)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inss_usinados_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  deduction_pct_of_cod DECIMAL(5,2) NOT NULL DEFAULT 5.00,  -- 5% of COD
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[
    'concreto_usinado',
    'argamassa_usinada',
    'massa_asfaltica'
  ],
  legal_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_usinados_deduction CHECK (deduction_pct_of_cod > 0 AND deduction_pct_of_cod <= 100)
);

-- ============================================================================
-- RLS Policies: Read for authenticated users, write for admins only
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE inss_rates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_fator_social_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_category_reductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_labor_percentages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_destination_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_fator_ajuste_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_prefab_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inss_usinados_rules ENABLE ROW LEVEL SECURITY;

-- Read policies (all authenticated users)
CREATE POLICY "Authenticated users can read INSS rates" ON inss_rates_history
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read Fator Social brackets" ON inss_fator_social_brackets
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read category reductions" ON inss_category_reductions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read labor percentages" ON inss_labor_percentages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read destination factors" ON inss_destination_factors
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read Fator de Ajuste rules" ON inss_fator_ajuste_rules
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read prefab rules" ON inss_prefab_rules
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read usinados rules" ON inss_usinados_rules
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Write policies (admin only)
CREATE POLICY "Admins can manage INSS rates" ON inss_rates_history
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage Fator Social brackets" ON inss_fator_social_brackets
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage category reductions" ON inss_category_reductions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage labor percentages" ON inss_labor_percentages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage destination factors" ON inss_destination_factors
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage Fator de Ajuste rules" ON inss_fator_ajuste_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage prefab rules" ON inss_prefab_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage usinados rules" ON inss_usinados_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Seed Data: Initial values based on IN RFB 2021/2021 (effective June 1, 2021)
-- ============================================================================

-- INSS Rates (IN RFB 2021/2021, Art. 26)
INSERT INTO inss_rates_history (effective_from, patronal_rate, sat_gilrat_rate, terceiros_rate, additional_rate, legal_reference, notes)
VALUES ('2021-06-01', 0.2000, 0.0800, 0.0580, 0.0300, 'IN RFB 2021/2021, Art. 26', 'Initial rates from IN RFB 2021/2021 effective June 1, 2021. Total: 36.8%');

-- Fator Social Brackets (IN RFB 2021/2021, Art. 26, § 1º, I-V)
INSERT INTO inss_fator_social_brackets (effective_from, area_min, area_max, fator_social, legal_reference, notes) VALUES
('2021-06-01', 0.00, 100.00, 0.20, 'IN RFB 2021/2021, Art. 26, § 1º, I', 'Area up to 100m² - 20% applied'),
('2021-06-01', 100.01, 200.00, 0.40, 'IN RFB 2021/2021, Art. 26, § 1º, II', 'Area 100.01-200m² - 40% applied'),
('2021-06-01', 200.01, 300.00, 0.55, 'IN RFB 2021/2021, Art. 26, § 1º, III', 'Area 200.01-300m² - 55% applied'),
('2021-06-01', 300.01, 400.00, 0.70, 'IN RFB 2021/2021, Art. 26, § 1º, IV', 'Area 300.01-400m² - 70% applied'),
('2021-06-01', 400.01, 999999.99, 0.90, 'IN RFB 2021/2021, Art. 26, § 1º, V', 'Area above 400m² - 90% applied');

-- Category Reductions (IN RFB 2021/2021, Art. 26, § 4º)
INSERT INTO inss_category_reductions (effective_from, category_code, category_name_pt, category_name_en, reduction_percentage, legal_reference, notes) VALUES
('2021-06-01', 'OBRA_NOVA', 'Obra Nova', 'New Construction', 0, 'IN RFB 2021/2021, Art. 26', 'No reduction for new construction'),
('2021-06-01', 'ACRESCIMO', 'Acréscimo', 'Addition', 0, 'IN RFB 2021/2021, Art. 26', 'No reduction for additions'),
('2021-06-01', 'REFORMA', 'Reforma', 'Renovation', 65, 'IN RFB 2021/2021, Art. 26, § 4º', '65% reduction for renovation works'),
('2021-06-01', 'DEMOLICAO', 'Demolição', 'Demolition', 90, 'IN RFB 2021/2021, Art. 26, § 4º', '90% reduction for demolition works');

-- Labor Percentages (Industry standards for construction types)
INSERT INTO inss_labor_percentages (effective_from, construction_type_code, construction_type_name_pt, construction_type_name_en, labor_percentage, notes, legal_reference) VALUES
('2021-06-01', 'ALVENARIA', 'Alvenaria', 'Masonry', 40, 'Standard masonry construction - highest labor intensity', 'Industry standard'),
('2021-06-01', 'MISTA', 'Mista', 'Mixed', 30, 'Mixed materials construction', 'Industry standard'),
('2021-06-01', 'MADEIRA', 'Madeira', 'Wood', 30, 'Wood frame construction', 'Industry standard'),
('2021-06-01', 'PRE_MOLDADO', 'Pré-moldado', 'Prefabricated', 12, 'Prefabricated components - lower on-site labor', 'Industry standard'),
('2021-06-01', 'METALICA', 'Metálica', 'Steel', 18, 'Steel frame construction', 'Industry standard');

-- Destination Factors (IN RFB 2021/2021)
INSERT INTO inss_destination_factors (effective_from, destination_code, destination_name_pt, destination_name_en, equivalence_factor, area_limit, special_reduction_pct, legal_reference, notes) VALUES
('2021-06-01', 'CASA_POPULAR', 'Casa Popular', 'Popular Housing', 0.55, 70, 50, 'IN RFB 2021/2021', 'Popular housing up to 70m² with 50% additional reduction'),
('2021-06-01', 'RESIDENCIAL_UNIFAMILIAR', 'Residencial Unifamiliar', 'Single-Family Residential', 1.00, NULL, NULL, 'IN RFB 2021/2021', 'Standard single-family residential'),
('2021-06-01', 'RESIDENCIAL_MULTIFAMILIAR', 'Residencial Multifamiliar', 'Multi-Family Residential', 1.00, NULL, NULL, 'IN RFB 2021/2021', 'Multi-family residential buildings'),
('2021-06-01', 'COMERCIAL', 'Comercial', 'Commercial', 1.00, NULL, NULL, 'IN RFB 2021/2021', 'Commercial buildings'),
('2021-06-01', 'CONJUNTO_HABITACIONAL', 'Conjunto Habitacional', 'Housing Complex', 0.60, NULL, NULL, 'IN RFB 2021/2021', 'Housing complex/development'),
('2021-06-01', 'GALPAO_INDUSTRIAL', 'Galpão Industrial', 'Industrial Warehouse', 0.70, NULL, NULL, 'IN RFB 2021/2021', 'Industrial warehouse/shed'),
('2021-06-01', 'EDIFICIO_GARAGENS', 'Edifício Garagens', 'Garage Building', 0.80, NULL, 20, 'IN RFB 2021/2021', 'Garage building with 20% additional reduction');

-- Fator de Ajuste Rules (IN RFB 2021/2021, Art. 33)
INSERT INTO inss_fator_ajuste_rules (effective_from, area_threshold, min_remuneration_pct, max_reduction_pct, requires_dctfweb, dctfweb_exempt_first_month, legal_reference, notes) VALUES
('2021-06-01', 350.00, 50, 73.52, true, true, 'IN RFB 2021/2021, Art. 33', 'Works up to 350m²: 50% minimum remuneration, up to 73.52% reduction'),
('2021-06-01', 999999.99, 70, 62.00, true, true, 'IN RFB 2021/2021, Art. 33', 'Works above 350m²: 70% minimum remuneration, up to 62% reduction');

-- Prefab Rules (IN RFB 2021/2021, Art. 26, § 2º)
INSERT INTO inss_prefab_rules (effective_from, min_invoice_pct_of_cod, reduction_pct, apply_selic_adjustment, selic_additional_pct, legal_reference, notes)
VALUES ('2021-06-01', 40, 70, true, 1.00, 'IN RFB 2021/2021, Art. 26, § 2º', 'Prefab invoices must be >= 40% of COD for 70% reduction. Excluded: slabs, foundations, floors, roofing, partitions');

-- Usinados Rules (IN RFB 2021/2021, Art. 26, § 5º)
INSERT INTO inss_usinados_rules (effective_from, deduction_pct_of_cod, legal_reference, notes)
VALUES ('2021-06-01', 5, 'IN RFB 2021/2021, Art. 26, § 5º', '5% of COD deduction for ready-mix concrete, mortar, and asphalt');

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inss_reference_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inss_rates_updated
  BEFORE UPDATE ON inss_rates_history
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_fator_social_updated
  BEFORE UPDATE ON inss_fator_social_brackets
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_category_reductions_updated
  BEFORE UPDATE ON inss_category_reductions
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_labor_percentages_updated
  BEFORE UPDATE ON inss_labor_percentages
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_destination_factors_updated
  BEFORE UPDATE ON inss_destination_factors
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_fator_ajuste_rules_updated
  BEFORE UPDATE ON inss_fator_ajuste_rules
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_prefab_rules_updated
  BEFORE UPDATE ON inss_prefab_rules
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

CREATE TRIGGER trg_usinados_rules_updated
  BEFORE UPDATE ON inss_usinados_rules
  FOR EACH ROW EXECUTE FUNCTION update_inss_reference_timestamp();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE inss_rates_history IS 'INSS contribution rate components with historical tracking. Total rate = patronal + sat_gilrat + terceiros + additional (typically 36.8%)';
COMMENT ON TABLE inss_fator_social_brackets IS 'Fator Social reduction brackets based on construction area. Only applies to PF (individuals). Ref: IN RFB 2021/2021, Art. 26, § 1º';
COMMENT ON TABLE inss_category_reductions IS 'Work category multipliers: 0% for new/addition, 65% for renovation, 90% for demolition. Ref: IN RFB 2021/2021, Art. 26, § 4º';
COMMENT ON TABLE inss_labor_percentages IS 'Labor percentage by construction type. Affects base RMT calculation.';
COMMENT ON TABLE inss_destination_factors IS 'Equivalence factors by construction purpose. Includes area limits and special reductions for popular housing.';
COMMENT ON TABLE inss_fator_ajuste_rules IS 'Fator de Ajuste eligibility rules based on area threshold and remuneration requirements. Ref: IN RFB 2021/2021, Art. 33';
COMMENT ON TABLE inss_prefab_rules IS 'Prefabricated material reduction rules. 70% reduction when invoices >= 40% of COD. Ref: IN RFB 2021/2021, Art. 26, § 2º';
COMMENT ON TABLE inss_usinados_rules IS 'Ready-mix concrete/mortar/asphalt deduction rules. 5% of COD. Ref: IN RFB 2021/2021, Art. 26, § 5º';
