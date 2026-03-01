-- CastorWorks INSS Obra Module - Tax Guide Process
-- Implements the lifecycle management process from legal permit to real estate registry

BEGIN;

-- Table to store the specific steps for a tax project's compliance journey
CREATE TABLE IF NOT EXISTS tax_guide_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_project_id UUID NOT NULL REFERENCES tax_projects(id) ON DELETE CASCADE,
  
  -- Step details
  step_order INTEGER NOT NULL,
  summary VARCHAR(255) NOT NULL,
  description TEXT,
  external_url TEXT, -- Link to e-CAC, Prefecture portal, etc.
  
  -- Tracking
  due_date DATE,
  attachment_url TEXT, -- Storage path for the resulting document
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
  
  -- Metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_tax_guide_project ON tax_guide_process(tax_project_id);
CREATE INDEX IF NOT EXISTS idx_tax_guide_order ON tax_guide_process(step_order);

-- RLS Policies
ALTER TABLE tax_guide_process ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view guide for accessible projects" ON tax_guide_process
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = tax_guide_process.tax_project_id
      AND has_project_access(auth.uid(), tp.project_id)
    )
  );

CREATE POLICY "Users can update guide for accessible projects" ON tax_guide_process
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = tax_guide_process.tax_project_id
      AND has_project_access(auth.uid(), tp.project_id)
    )
  );

-- Function to initialize standard steps for a new tax project
CREATE OR REPLACE FUNCTION initialize_tax_guide_steps()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tax_guide_process (tax_project_id, step_order, summary, description, external_url)
  VALUES
    (NEW.id, 1, 'Alvará de Construção', 'Obtenção da licença municipal autorizando o início da obra.', 'https://www.gov.br/pt-br/servicos/obter-alvara-de-construcao'),
    (NEW.id, 2, 'Cadastro da Obra (CNO)', 'Inscrição da obra no Cadastro Nacional de Obras da Receita Federal.', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/cno-cadastro-nacional-de-obras'),
    (NEW.id, 3, 'Cadastro de Empregados (eSocial)', 'Registro formal dos trabalhadores e prestadores de serviço vinculados ao CNO.', 'https://www.gov.br/esocial/pt-br'),
    (NEW.id, 4, 'Pagamento Mensal (DCTF Web)', 'Transmissão mensal das contribuições e aproveitamento de créditos de retenção.', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/dctfweb'),
    (NEW.id, 5, 'Habite-se', 'Certificado de conclusão emitido pela prefeitura (Gatilho para Fator Social).', NULL),
    (NEW.id, 6, 'Regularização (Sero)', 'Aferição final no Serviço Eletrônico de Aferição de Obras para fechamento do INSS.', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sero'),
    (NEW.id, 7, 'Pagamento Residual', 'Emissão e quitação da DARF final apurada no encerramento da obra.', NULL),
    (NEW.id, 8, 'Certidão Negativa (CND)', 'Emissão da Certidão Negativa de Débitos Previdenciários (Obrigatória para Registro).', 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/certidoes-e-situacao-fiscal'),
    (NEW.id, 9, 'Registro no Cartório de Imóveis', 'Averbação da construção na matrícula do imóvel para regularidade total.', NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-populate steps when a tax project is created
DROP TRIGGER IF EXISTS trg_init_tax_guide ON tax_projects;
CREATE TRIGGER trg_init_tax_guide
  AFTER INSERT ON tax_projects
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tax_guide_steps();

COMMIT;
