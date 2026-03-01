-- CastorWorks INSS Obra Module - Database Schema
-- Brazilian Construction Tax Compliance (INSS de Obra)
--
-- This module enables:
-- - Tax project configuration linked to CastorWorks projects
-- - INSS/ISS estimates with Fator Social calculations
-- - Monthly submission tracking (SERO/DCTFWeb)
-- - Payment management and document checklist

BEGIN;

-- ============================================================================
-- ENUMERATIONS
-- ============================================================================

-- Owner type: PF (Pessoa Física) or PJ (Pessoa Jurídica)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_owner_type') THEN
    CREATE TYPE tax_owner_type AS ENUM ('PF', 'PJ');
  END IF;
END$$;

-- Construction category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_work_category') THEN
    CREATE TYPE tax_work_category AS ENUM (
      'OBRA_NOVA',
      'ACRESCIMO',
      'REFORMA',
      'DEMOLICAO'
    );
  END IF;
END$$;

-- Construction type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_construction_type') THEN
    CREATE TYPE tax_construction_type AS ENUM (
      'ALVENARIA',
      'MISTA',
      'MADEIRA',
      'PRE_MOLDADO',
      'METALICA'
    );
  END IF;
END$$;

-- Tax project status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_project_status') THEN
    CREATE TYPE tax_project_status AS ENUM (
      'DRAFT',
      'PLANNING',
      'IN_PROGRESS',
      'READY_FOR_SERO',
      'SERO_DONE',
      'LIABILITY_OPEN',
      'PARCELADO',
      'PAID',
      'CLOSED'
    );
  END IF;
END$$;

-- Tax payment status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_payment_status') THEN
    CREATE TYPE tax_payment_status AS ENUM (
      'PENDING',
      'PAID',
      'OVERDUE',
      'PARCELADO',
      'CANCELLED'
    );
  END IF;
END$$;

-- Tax document types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_document_type') THEN
    CREATE TYPE tax_document_type AS ENUM (
      'PROJETO_ARQUITETONICO',
      'MEMORIAL_DESCRITIVO',
      'ALVARA_CONSTRUCAO',
      'HABITE_SE',
      'ART_RRT',
      'NF_MATERIAL',
      'NF_SERVICO',
      'NF_PRE_MOLDADO',
      'COMPROVANTE_PAGAMENTO',
      'CONTRATO_TRABALHO',
      'DARF',
      'DCTFWEB_RECIBO',
      'CND',
      'CPEND',
      'OUTROS'
    );
  END IF;
END$$;

-- ============================================================================
-- TAX PROJECTS - Links tax data to CastorWorks projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- CNO Registration
  cno_number VARCHAR(14),
  cno_registered_at TIMESTAMPTZ,

  -- Owner Information
  owner_type tax_owner_type NOT NULL,
  owner_document VARCHAR(14), -- CPF (11) or CNPJ (14)
  pj_has_accounting BOOLEAN, -- Only for PJ

  -- Area Information
  area_main NUMERIC(12, 2) NOT NULL DEFAULT 0,
  area_complementary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  area_total NUMERIC(12, 2) GENERATED ALWAYS AS (area_main + area_complementary) STORED,

  -- Construction Classification
  category tax_work_category NOT NULL DEFAULT 'OBRA_NOVA',
  construction_type tax_construction_type NOT NULL DEFAULT 'ALVENARIA',
  destination VARCHAR(50) NOT NULL DEFAULT 'RESIDENCIAL_UNIFAMILIAR',

  -- Location
  state_code CHAR(2) NOT NULL,
  municipality VARCHAR(100),

  -- Dates
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,

  -- Status
  status tax_project_status NOT NULL DEFAULT 'PLANNING',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ck_tax_projects_state_len CHECK (char_length(state_code) = 2),
  CONSTRAINT ck_tax_projects_area_positive CHECK (area_main >= 0 AND area_complementary >= 0),
  CONSTRAINT ck_tax_projects_pj_accounting CHECK (
    (owner_type = 'PJ' AND pj_has_accounting IS NOT NULL) OR
    (owner_type = 'PF' AND pj_has_accounting IS NULL)
  ),
  CONSTRAINT uq_tax_projects_project UNIQUE (project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_projects_project ON tax_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_tax_projects_status ON tax_projects(status);
CREATE INDEX IF NOT EXISTS idx_tax_projects_cno ON tax_projects(cno_number) WHERE cno_number IS NOT NULL;

-- ============================================================================
-- TAX ESTIMATES - History of INSS/ISS calculations
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- VAU Reference
  vau_used NUMERIC(14, 6) NOT NULL,
  vau_reference_date DATE NOT NULL,

  -- Calculation Breakdown
  cod NUMERIC(14, 2) NOT NULL, -- Custo da Obra por Destinação
  rmt_base NUMERIC(14, 2) NOT NULL, -- Remuneração Mão de Obra Base

  -- Reductions Applied
  fator_social NUMERIC(6, 4), -- PF only (0.20 to 0.90)
  category_reduction NUMERIC(6, 4), -- Reforma: 0.35, Demolição: 0.10
  pre_moldados_applied BOOLEAN DEFAULT FALSE,

  -- Final Values
  rmt_final NUMERIC(14, 2) NOT NULL,
  labor_deductions NUMERIC(14, 2) DEFAULT 0,

  -- INSS Results
  inss_estimate NUMERIC(14, 2) NOT NULL,
  inss_without_strategy NUMERIC(14, 2) NOT NULL,
  potential_savings NUMERIC(14, 2) GENERATED ALWAYS AS (inss_without_strategy - inss_estimate) STORED,

  -- ISS (if applicable)
  iss_estimate NUMERIC(14, 2),

  -- Metadata
  calculation_method VARCHAR(20) DEFAULT 'AREA_VAU',
  confidence_score INTEGER DEFAULT 50,
  assumptions JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ck_tax_estimates_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_estimates_project ON tax_estimates(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_estimates_date ON tax_estimates(calculated_at DESC);

-- ============================================================================
-- TAX SUBMISSIONS - Monthly SERO/DCTFWeb tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- Reference Period
  reference_month VARCHAR(7) NOT NULL, -- YYYY-MM format

  -- SERO Status
  sero_submitted BOOLEAN DEFAULT FALSE,
  sero_submission_date TIMESTAMPTZ,
  sero_receipt TEXT,

  -- DCTFWeb Status
  dctfweb_submitted BOOLEAN DEFAULT FALSE,
  dctfweb_transmission_date TIMESTAMPTZ,
  dctfweb_receipt_number VARCHAR(50),

  -- Declared Values
  labor_amount_declared NUMERIC(14, 2),
  materials_documented NUMERIC(14, 2),
  inss_calculated NUMERIC(14, 2),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT uq_tax_submissions_month UNIQUE (tax_project_id, reference_month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_submissions_project ON tax_submissions(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_submissions_month ON tax_submissions(reference_month);

-- ============================================================================
-- TAX PAYMENTS - Payment tracking and DARF management
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- Payment Details
  tax_type VARCHAR(10) NOT NULL DEFAULT 'INSS', -- INSS or ISS
  reference_period VARCHAR(7), -- YYYY-MM format
  amount NUMERIC(14, 2) NOT NULL,

  -- Due Date Tracking
  due_date DATE NOT NULL,
  payment_date DATE,

  -- DARF Information
  darf_number VARCHAR(50),
  darf_receipt_url TEXT,

  -- Status
  status tax_payment_status NOT NULL DEFAULT 'PENDING',

  -- Parcelamento (Installment) Info
  is_parcelado BOOLEAN DEFAULT FALSE,
  parcelamento_number VARCHAR(50),
  installment_number INTEGER,
  total_installments INTEGER,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ck_tax_payments_amount_positive CHECK (amount > 0),
  CONSTRAINT ck_tax_payments_tax_type CHECK (tax_type IN ('INSS', 'ISS'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_payments_project ON tax_payments(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_payments_status ON tax_payments(status);
CREATE INDEX IF NOT EXISTS idx_tax_payments_due_date ON tax_payments(due_date);

-- ============================================================================
-- TAX DOCUMENTS - Document checklist and tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- Document Information
  document_type tax_document_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- File Storage
  file_path TEXT NOT NULL, -- Storage bucket path
  file_url TEXT, -- Signed URL (temporary)

  -- Document Metadata
  document_date DATE,
  document_value NUMERIC(14, 2), -- For invoices
  issuer VARCHAR(255),

  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ck_tax_documents_value CHECK (document_value IS NULL OR document_value >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_documents_project ON tax_documents(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_type ON tax_documents(document_type);

-- ============================================================================
-- VAU REFERENCE TABLE - Admin-maintained VAU values by state
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_vau_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference Period
  ref_month DATE NOT NULL,
  state_code CHAR(2) NOT NULL,
  destination_code VARCHAR(50) NOT NULL,

  -- VAU Value
  vau_value NUMERIC(14, 6) NOT NULL,

  -- Source Information
  source_note TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT ck_tax_vau_ref_month CHECK (EXTRACT(DAY FROM ref_month) = 1),
  CONSTRAINT ck_tax_vau_state_len CHECK (char_length(state_code) = 2),
  CONSTRAINT uq_tax_vau_reference UNIQUE (ref_month, state_code, destination_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_vau_lookup ON tax_vau_reference(ref_month, state_code, destination_code);

-- ============================================================================
-- TAX ALERTS - Deadline and compliance notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,

  -- Alert Information
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,

  -- Due Date (if applicable)
  due_date DATE,

  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ck_tax_alerts_severity CHECK (severity IN ('INFO', 'WARNING', 'URGENT', 'CRITICAL')),
  CONSTRAINT ck_tax_alerts_type CHECK (alert_type IN (
    'DCTFWEB_DUE',
    'DARF_DUE',
    'SERO_UPDATE_NEEDED',
    'DOCUMENT_MISSING',
    'AREA_BOUNDARY_WARNING',
    'DECADENCIA_OPPORTUNITY',
    'PARCELAMENTO_DUE',
    'CND_EXPIRING'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_alerts_project ON tax_alerts(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_alerts_unresolved ON tax_alerts(tax_project_id) WHERE NOT resolved;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_tax_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tax_projects_updated_at ON tax_projects;
CREATE TRIGGER trg_tax_projects_updated_at
  BEFORE UPDATE ON tax_projects
  FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

DROP TRIGGER IF EXISTS trg_tax_submissions_updated_at ON tax_submissions;
CREATE TRIGGER trg_tax_submissions_updated_at
  BEFORE UPDATE ON tax_submissions
  FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

DROP TRIGGER IF EXISTS trg_tax_payments_updated_at ON tax_payments;
CREATE TRIGGER trg_tax_payments_updated_at
  BEFORE UPDATE ON tax_payments
  FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

DROP TRIGGER IF EXISTS trg_tax_vau_reference_updated_at ON tax_vau_reference;
CREATE TRIGGER trg_tax_vau_reference_updated_at
  BEFORE UPDATE ON tax_vau_reference
  FOR EACH ROW EXECUTE FUNCTION update_tax_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tax_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_vau_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_alerts ENABLE ROW LEVEL SECURITY;

-- Tax Projects: Access via project access
CREATE POLICY "Users can view tax projects they have access to" ON tax_projects
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert tax projects for accessible projects" ON tax_projects
  FOR INSERT WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update tax projects they have access to" ON tax_projects
  FOR UPDATE USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can delete tax projects" ON tax_projects
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Tax Estimates: Access via tax project
CREATE POLICY "Users can view estimates for accessible tax projects" ON tax_estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = tax_estimates.tax_project_id
      AND has_project_access(auth.uid(), tp.project_id)
    )
  );

CREATE POLICY "Users can insert estimates for accessible tax projects" ON tax_estimates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = tax_estimates.tax_project_id
      AND has_project_access(auth.uid(), tp.project_id)
    )
  );

-- Tax Submissions: Access via tax project
CREATE POLICY "Users can view submissions for accessible tax projects" ON tax_submissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_submissions.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can insert submissions for accessible tax projects" ON tax_submissions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_submissions.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can update submissions for accessible tax projects" ON tax_submissions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_submissions.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can delete submissions for accessible tax projects" ON tax_submissions
  FOR DELETE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_submissions.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

-- Tax Payments: Access via tax project
CREATE POLICY "Users can view payments for accessible tax projects" ON tax_payments
  FOR SELECT USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_payments.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can insert payments for accessible tax projects" ON tax_payments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_payments.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can update payments for accessible tax projects" ON tax_payments
  FOR UPDATE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_payments.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can delete payments for accessible tax projects" ON tax_payments
  FOR DELETE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_payments.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

-- Tax Documents: Access via tax project
CREATE POLICY "Users can view documents for accessible tax projects" ON tax_documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_documents.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can insert documents for accessible tax projects" ON tax_documents
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_documents.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can update documents for accessible tax projects" ON tax_documents
  FOR UPDATE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_documents.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can delete documents for accessible tax projects" ON tax_documents
  FOR DELETE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_documents.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

-- VAU Reference: Read-only for all authenticated, write for admins
CREATE POLICY "Authenticated users can read VAU reference" ON tax_vau_reference
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert VAU reference" ON tax_vau_reference
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update VAU reference" ON tax_vau_reference
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete VAU reference" ON tax_vau_reference
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Tax Alerts: Access via tax project
CREATE POLICY "Users can view alerts for accessible tax projects" ON tax_alerts
  FOR SELECT USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_alerts.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can insert alerts for accessible tax projects" ON tax_alerts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_alerts.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can update alerts for accessible tax projects" ON tax_alerts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_alerts.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

CREATE POLICY "Users can delete alerts for accessible tax projects" ON tax_alerts
  FOR DELETE USING (EXISTS (SELECT 1 FROM tax_projects tp WHERE tp.id = tax_alerts.tax_project_id AND has_project_access(auth.uid(), tp.project_id)));

-- ============================================================================
-- SEED VAU DATA (January 2025 reference values)
-- ============================================================================
INSERT INTO tax_vau_reference (ref_month, state_code, destination_code, vau_value, source_note)
VALUES
  ('2025-01-01', 'AC', 'RESIDENCIAL_UNIFAMILIAR', 1350.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'AL', 'RESIDENCIAL_UNIFAMILIAR', 1320.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'AP', 'RESIDENCIAL_UNIFAMILIAR', 1340.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'AM', 'RESIDENCIAL_UNIFAMILIAR', 1380.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'BA', 'RESIDENCIAL_UNIFAMILIAR', 1350.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'CE', 'RESIDENCIAL_UNIFAMILIAR', 1340.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'DF', 'RESIDENCIAL_UNIFAMILIAR', 1500.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'ES', 'RESIDENCIAL_UNIFAMILIAR', 1420.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'GO', 'RESIDENCIAL_UNIFAMILIAR', 1400.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'MA', 'RESIDENCIAL_UNIFAMILIAR', 1300.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'MT', 'RESIDENCIAL_UNIFAMILIAR', 1420.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'MS', 'RESIDENCIAL_UNIFAMILIAR', 1410.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'MG', 'RESIDENCIAL_UNIFAMILIAR', 1380.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'PA', 'RESIDENCIAL_UNIFAMILIAR', 1350.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'PB', 'RESIDENCIAL_UNIFAMILIAR', 1310.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'PR', 'RESIDENCIAL_UNIFAMILIAR', 1410.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'PE', 'RESIDENCIAL_UNIFAMILIAR', 1340.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'PI', 'RESIDENCIAL_UNIFAMILIAR', 1280.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'RJ', 'RESIDENCIAL_UNIFAMILIAR', 1489.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'RN', 'RESIDENCIAL_UNIFAMILIAR', 1330.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'RS', 'RESIDENCIAL_UNIFAMILIAR', 1449.25, 'Reference value Jan 2025'),
  ('2025-01-01', 'RO', 'RESIDENCIAL_UNIFAMILIAR', 1380.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'RR', 'RESIDENCIAL_UNIFAMILIAR', 1360.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'SC', 'RESIDENCIAL_UNIFAMILIAR', 1445.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'SP', 'RESIDENCIAL_UNIFAMILIAR', 1520.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'SE', 'RESIDENCIAL_UNIFAMILIAR', 1320.00, 'Reference value Jan 2025'),
  ('2025-01-01', 'TO', 'RESIDENCIAL_UNIFAMILIAR', 1370.00, 'Reference value Jan 2025')
ON CONFLICT DO NOTHING;

COMMIT;
