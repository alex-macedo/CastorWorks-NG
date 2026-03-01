-- Populate SINAPI catalog with ~50 common construction materials for São Paulo (SP)

-- Concrete & Masonry (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('88485', 'CIMENTO PORTLAND COMUM, SACO DE 50 KG', 'kg', 0.85, 'SP', 'Alvenaria', 'Cimento', '2024-01-01'),
('00004302', 'AREIA MEDIA - POSTO JAZIDA (RETIRADO NA JAZIDA, SEM TRANSPORTE)', 'm³', 68.50, 'SP', 'Alvenaria', 'Areia', '2024-01-01'),
('00000389', 'BLOCO CERAMICO DE VEDACAO COM 08 FUROS, DIMENSOES 9X19X19 CM', 'un', 1.25, 'SP', 'Alvenaria', 'Blocos', '2024-01-01'),
('00000455', 'BLOCO CERAMICO DE VEDACAO COM 06 FUROS, DIMENSOES 14X19X19 CM', 'un', 1.85, 'SP', 'Alvenaria', 'Blocos', '2024-01-01'),
('00005278', 'PEDRA BRITADA N. 1 (9,5 A 19 MM) - POSTO PEDREIRA/FORNECEDOR', 'm³', 85.00, 'SP', 'Concreto', 'Brita', '2024-01-01'),
('00034069', 'CONCRETO FCK = 25 MPA, VIRADO EM BETONEIRA DE 400 L', 'm³', 385.00, 'SP', 'Concreto', 'Concreto', '2024-01-01'),
('00034085', 'CONCRETO FCK = 30 MPA, VIRADO EM BETONEIRA DE 400 L', 'm³', 425.00, 'SP', 'Concreto', 'Concreto', '2024-01-01'),
('00000175', 'ACO CA-50, DIAMETRO DE 10.0 MM - VERGALHAO', 'kg', 6.80, 'SP', 'Concreto', 'Ferragem', '2024-01-01'),
('00000179', 'ACO CA-50, DIAMETRO DE 12.5 MM - VERGALHAO', 'kg', 6.70, 'SP', 'Concreto', 'Ferragem', '2024-01-01'),
('00000183', 'ACO CA-60, DIAMETRO DE 6.3 MM - VERGALHAO', 'kg', 7.20, 'SP', 'Concreto', 'Ferragem', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Electrical Materials (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('74209/001', 'CABO DE COBRE FLEXIVEL CLASSE 4 OU 5, ANTI-CHAMA 750 V, SECAO NOMINAL DE 1,5 MM2', 'm', 2.15, 'SP', 'Elétrica', 'Cabos', '2024-01-01'),
('74209/002', 'CABO DE COBRE FLEXIVEL CLASSE 4 OU 5, ANTI-CHAMA 750 V, SECAO NOMINAL DE 2,5 MM2', 'm', 3.45, 'SP', 'Elétrica', 'Cabos', '2024-01-01'),
('74209/003', 'CABO DE COBRE FLEXIVEL CLASSE 4 OU 5, ANTI-CHAMA 750 V, SECAO NOMINAL DE 4,0 MM2', 'm', 5.20, 'SP', 'Elétrica', 'Cabos', '2024-01-01'),
('74209/004', 'CABO DE COBRE FLEXIVEL CLASSE 4 OU 5, ANTI-CHAMA 750 V, SECAO NOMINAL DE 6,0 MM2', 'm', 8.50, 'SP', 'Elétrica', 'Cabos', '2024-01-01'),
('74120/001', 'CONDULETE DE ALUMINIO, TIPO X, PARA ELETRODUTO DE 1/2"', 'un', 10.50, 'SP', 'Elétrica', 'Conduítes', '2024-01-01'),
('74120/002', 'CONDULETE DE ALUMINIO, TIPO X, PARA ELETRODUTO DE 3/4"', 'un', 12.80, 'SP', 'Elétrica', 'Conduítes', '2024-01-01'),
('74140/001', 'ELETRODUTO PVC RIGIDO ROSCAVEL, DN 20 MM (1/2")', 'm', 6.80, 'SP', 'Elétrica', 'Eletrodutos', '2024-01-01'),
('74140/002', 'ELETRODUTO PVC RIGIDO ROSCAVEL, DN 25 MM (3/4")', 'm', 9.20, 'SP', 'Elétrica', 'Eletrodutos', '2024-01-01'),
('74151/001', 'INTERRUPTOR Simple (1 TECLA), INCLUINDO SUPORTE E PLACA', 'un', 15.50, 'SP', 'Elétrica', 'Interruptores', '2024-01-01'),
('74151/002', 'INTERRUPTOR DUPLO (2 TECLAS), INCLUINDO SUPORTE E PLACA', 'un', 22.00, 'SP', 'Elétrica', 'Interruptores', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Plumbing Materials (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('74158/001', 'TUBO PVC RIGIDO ROSCAVEL, ESGOTO PREDIAL, DN 40 MM', 'm', 8.50, 'SP', 'Hidráulica', 'Tubos', '2024-01-01'),
('74158/002', 'TUBO PVC RIGIDO ROSCAVEL, ESGOTO PREDIAL, DN 100 MM', 'm', 18.50, 'SP', 'Hidráulica', 'Tubos', '2024-01-01'),
('74158/003', 'TUBO PVC RIGIDO SOLDAVEL, AGUA FRIA, DN 20 MM', 'm', 5.80, 'SP', 'Hidráulica', 'Tubos', '2024-01-01'),
('74158/004', 'TUBO PVC RIGIDO SOLDAVEL, AGUA FRIA, DN 25 MM', 'm', 7.50, 'SP', 'Hidráulica', 'Tubos', '2024-01-01'),
('74163/001', 'REGISTRO DE GAVETA BRUTO, LATAO, ROSCAVEL, 1/2"', 'un', 35.00, 'SP', 'Hidráulica', 'Registros', '2024-01-01'),
('74163/002', 'REGISTRO DE GAVETA BRUTO, LATAO, ROSCAVEL, 3/4"', 'un', 45.00, 'SP', 'Hidráulica', 'Registros', '2024-01-01'),
('74165/001', 'JOELHO 90 GRAUS, PVC, SOLDAVEL, DN 20 MM', 'un', 1.20, 'SP', 'Hidráulica', 'Conexões', '2024-01-01'),
('74165/002', 'JOELHO 90 GRAUS, PVC, SOLDAVEL, DN 25 MM', 'un', 1.85, 'SP', 'Hidráulica', 'Conexões', '2024-01-01'),
('74170/001', 'VASO SANITARIO CONVENCIONAL, LOUCA BRANCA', 'un', 185.00, 'SP', 'Hidráulica', 'Louças', '2024-01-01'),
('74170/002', 'LAVATORIO SUSPENSO COM COLUNA, LOUCA BRANCA', 'un', 145.00, 'SP', 'Hidráulica', 'Louças', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Finishes & Tiles (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('87765', 'PISO CERAMICO ESMALTADO DE ALTA RESISTENCIA A ABRASAO (PEI > 4)', 'm²', 28.50, 'SP', 'Revestimentos', 'Pisos', '2024-01-01'),
('87766', 'PISO CERAMICO ESMALTADO DE MEDIA RESISTENCIA A ABRASAO (PEI 3)', 'm²', 22.00, 'SP', 'Revestimentos', 'Pisos', '2024-01-01'),
('87520', 'REVESTIMENTO CERAMICO PARA PAREDE INTERNA COM PLACAS TIPO ESMALTADA BRILHANTE DE DIMENSOES 20X20 CM', 'm²', 24.80, 'SP', 'Revestimentos', 'Azulejos', '2024-01-01'),
('87521', 'REVESTIMENTO CERAMICO PARA PAREDE INTERNA COM PLACAS TIPO ESMALTADA BRILHANTE DE DIMENSOES 30X30 CM', 'm²', 32.50, 'SP', 'Revestimentos', 'Azulejos', '2024-01-01'),
('88264', 'ARGAMASSA INDUSTRIALIZADA PARA ASSENTAMENTO DE PISO E AZULEJO, INTERNO', 'kg', 0.52, 'SP', 'Revestimentos', 'Argamassa', '2024-01-01'),
('88288', 'REJUNTE A BASE DE CIMENTO BRANCO OU CINZA', 'kg', 4.80, 'SP', 'Revestimentos', 'Rejunte', '2024-01-01'),
('87877', 'GRANITO CINZA ANDORINHA, E = 2 CM', 'm²', 185.00, 'SP', 'Revestimentos', 'Granito', '2024-01-01'),
('87878', 'MARMORE BRANCO, E = 2 CM', 'm²', 220.00, 'SP', 'Revestimentos', 'Mármore', '2024-01-01'),
('88319', 'GESSO EM PO PARA REVESTIMENTO', 'kg', 0.95, 'SP', 'Revestimentos', 'Gesso', '2024-01-01'),
('88320', 'GESSO ACARTONADO (DRYWALL) TIPO STANDARD', 'm²', 28.00, 'SP', 'Revestimentos', 'Gesso', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Paint & Waterproofing (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('88905', 'TINTA LATEX ACRILICA PREMIUM, COR BRANCA', 'galão', 125.00, 'SP', 'Pintura', 'Tintas', '2024-01-01'),
('88906', 'TINTA LATEX ACRILICA STANDARD, COR BRANCA', 'galão', 85.00, 'SP', 'Pintura', 'Tintas', '2024-01-01'),
('88907', 'TINTA ACRILICA FOSCA PREMIUM, COR BRANCA', 'galão', 145.00, 'SP', 'Pintura', 'Tintas', '2024-01-01'),
('88908', 'TINTA ESMALTE SINTETICO BRILHANTE, COR BRANCA', 'galão', 165.00, 'SP', 'Pintura', 'Tintas', '2024-01-01'),
('88909', 'VERNIZ MARITIMO TRANSPARENTE', 'galão', 185.00, 'SP', 'Pintura', 'Verniz', '2024-01-01'),
('88910', 'MASSA CORRIDA ACRILICA PARA INTERIOR', 'kg', 3.80, 'SP', 'Pintura', 'Massas', '2024-01-01'),
('88911', 'SELADOR ACRILICO', 'galão', 68.00, 'SP', 'Pintura', 'Selador', '2024-01-01'),
('88430', 'IMPERMEABILIZANTE ACRILICO PARA LAJE', 'kg', 8.50, 'SP', 'Pintura', 'Impermeabilizante', '2024-01-01'),
('88431', 'MANTA ASFALTICA, ESPESSURA 3MM', 'm²', 32.00, 'SP', 'Pintura', 'Impermeabilizante', '2024-01-01'),
('88432', 'ARGAMASSA POLIMERICA IMPERMEAVEL', 'kg', 12.50, 'SP', 'Pintura', 'Impermeabilizante', '2024-01-01')
ON CONFLICT DO NOTHING;

-- Wood & Doors (10 items)
INSERT INTO sinapi_catalog (sinapi_code, description, unit, reference_price, state, category, subcategory, reference_date) VALUES
('00009738', 'TABUA DE PINUS 3A., BRUTA, 2,5 X 30 CM', 'm', 24.50, 'SP', 'Esquadrias', 'Madeira', '2024-01-01'),
('00009739', 'TABUA DE PINUS 3A., APARELHADA, 2,5 X 30 CM', 'm', 32.00, 'SP', 'Esquadrias', 'Madeira', '2024-01-01'),
('00009740', 'VIGA DE PINUS AUTOCLAVADO, 6 X 12 CM', 'm', 28.50, 'SP', 'Esquadrias', 'Madeira', '2024-01-01'),
('00009741', 'VIGA DE PINUS AUTOCLAVADO, 6 X 16 CM', 'm', 35.00, 'SP', 'Esquadrias', 'Madeira', '2024-01-01'),
('00040940', 'PORTA DE MADEIRA SEMI-OCA (LEVE OU MEDIA), PARA PINTURA, PADRAO MEDIO, 80 X 210 CM', 'un', 285.00, 'SP', 'Esquadrias', 'Portas', '2024-01-01'),
('00040941', 'PORTA DE MADEIRA SEMI-OCA (LEVE OU MEDIA), PARA PINTURA, PADRAO MEDIO, 70 X 210 CM', 'un', 265.00, 'SP', 'Esquadrias', 'Portas', '2024-01-01'),
('00041062', 'JANELA DE ALUMINIO DE CORRER, 2 FOLHAS MOVEIS, PADRAO MEDIO, COM VIDRO', 'm²', 385.00, 'SP', 'Esquadrias', 'Janelas', '2024-01-01'),
('00041063', 'JANELA DE ALUMINIO BASCULANTE, PADRAO MEDIO, COM VIDRO', 'm²', 420.00, 'SP', 'Esquadrias', 'Janelas', '2024-01-01'),
('00041064', 'PORTA DE ALUMINIO DE ABRIR, 1 FOLHA, PADRAO MEDIO, COM VIDRO', 'm²', 465.00, 'SP', 'Esquadrias', 'Portas', '2024-01-01'),
('00041065', 'FECHADURA PARA PORTA INTERNA, TIPO CYLINDRO, COMPLETA', 'un', 85.00, 'SP', 'Esquadrias', 'Ferragens', '2024-01-01')
ON CONFLICT DO NOTHING;
