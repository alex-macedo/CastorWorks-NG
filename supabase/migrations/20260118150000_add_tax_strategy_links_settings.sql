-- Migration to add configurable INSS Strategy links to app_settings

BEGIN;

-- 1. Add the column to app_settings if it doesn't exist
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tax_strategy_links JSONB DEFAULT '[]'::jsonb;

-- 2. Populate default values if empty
UPDATE app_settings 
SET tax_strategy_links = '[
  {"step_order": 1, "summary": "Alvará de Construção", "description": "Obtenção da licença municipal autorizando o início da obra.", "external_url": "https://www.gov.br/pt-br/servicos/obter-alvara-de-construcao"},
  {"step_order": 2, "summary": "Cadastro da Obra (CNO)", "description": "Inscrição da obra no Cadastro Nacional de Obras da Receita Federal.", "external_url": "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/cno-cadastro-nacional-de-obras"},
  {"step_order": 3, "summary": "Cadastro de Empregados (eSocial)", "description": "Registro formal dos trabalhadores e prestadores de serviço vinculados ao CNO.", "external_url": "https://www.gov.br/esocial/pt-br"},
  {"step_order": 4, "summary": "Pagamento Mensal (DCTF Web)", "description": "Transmissão mensal das contribuições e aproveitamento de créditos de retenção.", "external_url": "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/dctfweb"},
  {"step_order": 5, "summary": "Habite-se", "description": "Certificado de conclusão emitido pela prefeitura (Gatilho para Fator Social).", "external_url": null},
  {"step_order": 6, "summary": "Regularização (Sero)", "description": "Aferição final no Serviço Eletrônico de Aferição de Obras para fechamento do INSS.", "external_url": "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sero"},
  {"step_order": 7, "summary": "Pagamento Residual", "description": "Emissão e quitação da DARF final apurada no encerramento da obra.", "external_url": null},
  {"step_order": 8, "summary": "Certidão Negativa (CND)", "description": "Emissão da Certidão Negativa de Débitos Previdenciários (Obrigatória para Registro).", "external_url": "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/certidoes-e-situacao-fiscal"},
  {"step_order": 9, "summary": "Registro no Cartório de Imóveis", "description": "Averbação da construção na matrícula do imóvel para regularidade total.", "external_url": null}
]'::jsonb
WHERE tax_strategy_links IS NULL OR tax_strategy_links = '[]'::jsonb;

-- 3. Update the trigger function to use configured links
CREATE OR REPLACE FUNCTION initialize_tax_guide_steps()
RETURNS TRIGGER AS $$
DECLARE
  v_links JSONB;
  v_step RECORD;
BEGIN
  -- Try to get links from app_settings
  SELECT tax_strategy_links INTO v_links FROM app_settings LIMIT 1;
  
  -- If not found or null, use hardcoded defaults as fallback
  IF v_links IS NULL OR jsonb_array_length(v_links) = 0 THEN
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
  ELSE
    -- Use configured links from settings
    FOR v_step IN SELECT * FROM jsonb_to_recordset(v_links) AS x(step_order int, summary text, description text, external_url text)
    LOOP
      INSERT INTO tax_guide_process (tax_project_id, step_order, summary, description, external_url)
      VALUES (NEW.id, v_step.step_order, v_step.summary, v_step.description, v_step.external_url);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
