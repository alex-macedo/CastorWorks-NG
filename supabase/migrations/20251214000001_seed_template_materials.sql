-- Seed template materials from projects_materials_list.csv
-- These materials use special template project_id '00000000-0000-0000-0000-000000000000'

BEGIN;

-- Delete existing template materials only (not project-specific materials)
DELETE FROM public.project_materials 
WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- Insert template materials (89 items from CSV)
INSERT INTO public.project_materials (
  project_id,
  description,
  group_name,
  tgfa_applicable,
  factor,
  unit,
  price_per_unit,
  quantity
) VALUES 
  -- Row 1: Total Metragem da Casa
  ('00000000-0000-0000-0000-000000000000', 'Total Metragem da Casa (m²)', 'Total Metragem da Casa (m²)', true, 0.0, 'm²', 0, 0),
  
  -- Mão-de-obra (5 items)
  ('00000000-0000-0000-0000-000000000000', 'Pedreiro', 'Mão-de-obra', true, 0.0, 'm²', 850.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Gerenciamento', 'Mão-de-obra', true, 0.0, 'm²', 234.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Encanador', 'Mão-de-obra', true, 0.0, 'm²', 75.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Eletricista', 'Mão-de-obra', true, 0.0, 'm²', 75.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Pintor', 'Mão-de-obra', true, 0.0, 'm²', 90.00, 0),
  
  -- Taxas/Impostos (3 items)
  ('00000000-0000-0000-0000-000000000000', 'Aprovação Condomínio', 'Taxas/Impostos', false, 1.0, 'm²', 500.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Habite-se + ISS (Estimado com Base Histórica)', 'Taxas/Impostos', false, 1.0, 'm²', 4500.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'INSS Final de Obra', 'Taxas/Impostos', true, 0.0, 'm²', 0, 0),
  
  -- Projeto (4 items)
  ('00000000-0000-0000-0000-000000000000', 'Engenheiro civil', 'Projeto', true, 0.0, 'm²', 10.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Engenheiro elétrico', 'Projeto', true, 0.0, 'm²', 7.50, 0),
  ('00000000-0000-0000-0000-000000000000', 'Engenheiro elétrico', 'Projeto', true, 0.0, 'm²', 7.50, 0),
  ('00000000-0000-0000-0000-000000000000', 'Arquiteto', 'Projeto', true, 0.0, 'm²', 46.67, 0),
  
  -- Aluguéis (4 items)
  ('00000000-0000-0000-0000-000000000000', 'Locações mensais (banheiro, container, betoneira)', 'Aluguéis', false, 18.0, 'mês', 600.00, 18.0),
  ('00000000-0000-0000-0000-000000000000', 'Locações equipmentos diversos', 'Aluguéis', false, 18.0, 'mês', 300.00, 18.0),
  ('00000000-0000-0000-0000-000000000000', 'Caçamba', 'Aluguéis', false, 25.0, 'um', 180.00, 25.0),
  ('00000000-0000-0000-0000-000000000000', 'Locação de andaimes', 'Aluguéis', false, 10.0, 'mês', 800.00, 10.0),
  
  -- Alvenaria e Gesso (7 items)
  ('00000000-0000-0000-0000-000000000000', 'Areia fina', 'Alvenaria e Gesso', true, 0.0, 'm³', 45.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Areia grossa', 'Alvenaria e Gesso', true, 0.0, 'm³', 17.50, 0),
  ('00000000-0000-0000-0000-000000000000', 'Pedra 1/2', 'Alvenaria e Gesso', true, 0.0, 'm³', 13.13, 0),
  ('00000000-0000-0000-0000-000000000000', 'Cal prime', 'Alvenaria e Gesso', true, 0.0, 'Kg', 10.34, 0),
  ('00000000-0000-0000-0000-000000000000', 'Cimento cauê', 'Alvenaria e Gesso', true, 0.0, 'Kg', 83.76, 0),
  ('00000000-0000-0000-0000-000000000000', 'Tijolo', 'Alvenaria e Gesso', true, 0.0, 'm²', 17.50, 0),
  ('00000000-0000-0000-0000-000000000000', 'Blocos de vedação', 'Alvenaria e Gesso', true, 0.0, 'm²', 35.63, 0),
  
  -- Terraplanagem (2 items)
  ('00000000-0000-0000-0000-000000000000', 'Operador de escavadeira', 'Terraplanagem', false, 1.0, '', 7000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Caminhão de terra', 'Terraplanagem', false, 0.0, '', 350.00, 0),
  
  -- Ferragem (2 items)
  ('00000000-0000-0000-0000-000000000000', 'Pregos', 'Ferragem', true, 0.0, 'Kg', 6.96, 0),
  ('00000000-0000-0000-0000-000000000000', 'Ferragens em geral', 'Ferragem', true, 0.0, 'm³', 115.00, 0),
  
  -- Casa (1 item)
  ('00000000-0000-0000-0000-000000000000', 'Casas total (fundação a laje)', 'Casa', false, 100.0, 'm³', 450.00, 100.0),
  
  -- Piso (1 item)
  ('00000000-0000-0000-0000-000000000000', 'Contrapiso', 'Piso', false, 0.0, 'm³', 340.00, 0),
  
  -- Madeira (3 items)
  ('00000000-0000-0000-0000-000000000000', 'Fundação', 'Madeira', true, 0.0, 'm³', 42.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Estrutura', 'Madeira', true, 0.0, 'm³', 42.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Madeirite plastificado', 'Madeira', true, 0.0, 'm³', 12.50, 0),
  
  -- Telhado (4 items)
  ('00000000-0000-0000-0000-000000000000', 'Cerâmica portuguesa', 'Telhado', false, 0.0, '', 70.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Telhado aparente', 'Telhado', false, 0.0, '', 30.65, 0),
  ('00000000-0000-0000-0000-000000000000', 'Calhas, rufos e pingadeiras', 'Telhado', true, 0.0, '', 50.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Embutido total', 'Telhado', true, 0.0, '', 157.00, 0),
  
  -- Laje (2 items)
  ('00000000-0000-0000-0000-000000000000', 'Laje baixa', 'Laje', false, 180.0, '', 65.00, 180.0),
  ('00000000-0000-0000-0000-000000000000', 'Laje alta', 'Laje', false, 0.0, '', 65.00, 0),
  
  -- Impermeabilização (4 items)
  ('00000000-0000-0000-0000-000000000000', 'Fundação (Produto + M.O)', 'Impermeabilização', false, 1.0, '', 1.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Piscina (Produto + M.O)', 'Impermeabilização', false, 40.0, '', 50.00, 40.0),
  ('00000000-0000-0000-0000-000000000000', 'Laje (Produto + M.O)', 'Impermeabilização', false, 35.0, '', 150.00, 35.0),
  ('00000000-0000-0000-0000-000000000000', 'Muro de arrimo (Produto + M.O)', 'Impermeabilização', false, 1.0, '', 1.00, 1.0),
  
  -- Elétrica (3 items)
  ('00000000-0000-0000-0000-000000000000', 'Fios em geral', 'Elétrica', true, 0.0, '', 50.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Iluminação (interna e externa)', 'Elétrica', true, 0.0, '', 75.00, 0),
  ('00000000-0000-0000-0000-000000000000', 'Tomadas e interruptores', 'Elétrica', true, 0.0, '', 20.00, 0),
  
  -- Hidráulica (1 item)
  ('00000000-0000-0000-0000-000000000000', 'Itens hidráulica (água quente + fria)', 'Hidráulica', true, 0.0, '', 90.00, 0),
  
  -- Acabamento e Finalização (43 items)
  ('00000000-0000-0000-0000-000000000000', 'Piso interno', 'Acabamento e Finalização', false, 275.0, '', 85.00, 275.0),
  ('00000000-0000-0000-0000-000000000000', 'Piso externo', 'Acabamento e Finalização', false, 28.0, '', 78.00, 28.0),
  ('00000000-0000-0000-0000-000000000000', 'Piso vinílico', 'Acabamento e Finalização', false, 110.0, '', 160.00, 110.0),
  ('00000000-0000-0000-0000-000000000000', 'Piso de madeira', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Rodapé (pvc ou invertido)', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Argamassa/rejunte/espaçador (piso)', 'Acabamento e Finalização', false, 120.0, '', 40.00, 120.0),
  ('00000000-0000-0000-0000-000000000000', 'Petit pave', 'Acabamento e Finalização', false, 80.0, '', 120.00, 80.0),
  ('00000000-0000-0000-0000-000000000000', 'Fulget', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Deck de madeira', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Revestimento de banheiro', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Revestimento externo (fachada e muros)', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Revestimento piscina', 'Acabamento e Finalização', false, 35.0, '', 138.00, 35.0),
  ('00000000-0000-0000-0000-000000000000', 'Argamassa/rejunte/espaçador (piscina)', 'Acabamento e Finalização', false, 1.0, '', 1000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Kit iluminação piscina', 'Acabamento e Finalização', false, 1.0, '', 2500.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Hidromassagem (bomba + hidrojatos)', 'Acabamento e Finalização', false, 1.0, '', 0, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Sistema de bombas piscina', 'Acabamento e Finalização', false, 1.0, '', 5000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Artefatos', 'Acabamento e Finalização', false, 1.0, '', 2500.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Forro de gesso', 'Acabamento e Finalização', false, 230.0, '', 70.00, 230.0),
  ('00000000-0000-0000-0000-000000000000', 'Sanca de gesso', 'Acabamento e Finalização', false, 30.0, '', 70.00, 30.0),
  ('00000000-0000-0000-0000-000000000000', 'Forro de madeira', 'Acabamento e Finalização', false, 70.0, '', 250.00, 70.0),
  ('00000000-0000-0000-0000-000000000000', 'Metais', 'Acabamento e Finalização', false, 1.0, '', 13200.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Louça', 'Acabamento e Finalização', false, 1.0, '', 12000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Nicho (mármore ou porcelanato)', 'Acabamento e Finalização', false, 4.0, '', 0, 4.0),
  ('00000000-0000-0000-0000-000000000000', 'Box de vidro temperado', 'Acabamento e Finalização', false, 4.0, '', 0, 4.0),
  ('00000000-0000-0000-0000-000000000000', 'Espelhos', 'Acabamento e Finalização', false, 4.0, '', 0, 4.0),
  ('00000000-0000-0000-0000-000000000000', 'Esquadrias', 'Acabamento e Finalização', false, 1.0, '', 72000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Mármore - pedras em geral', 'Acabamento e Finalização', false, 1.0, '', 20000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Paisagismo', 'Acabamento e Finalização', false, 1.0, '', 10000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Infraestrutura de ar condicionado', 'Acabamento e Finalização', false, 6.0, '', 550.00, 6.0),
  ('00000000-0000-0000-0000-000000000000', 'Energia fotovoltaica', 'Acabamento e Finalização', false, 1.0, '', 20000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Aquecimento solar (casa + piscina)', 'Acabamento e Finalização', false, 1.0, '', 11000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Aquecimento - trocadores de calor piscina', 'Acabamento e Finalização', false, 1.0, '', 12000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Automação (mão de obra + material)', 'Acabamento e Finalização', false, 0.0, '', 0, 0),
  ('00000000-0000-0000-0000-000000000000', 'Coifa + braseiro + eletrodomesticos + ar condicionado', 'Acabamento e Finalização', false, 1.0, '', 50000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Pintura em geral', 'Acabamento e Finalização', false, 1.0, '', 20000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Porta principal', 'Acabamento e Finalização', false, 1.0, '', 10000.00, 1.0),
  ('00000000-0000-0000-0000-000000000000', 'Portas internas', 'Acabamento e Finalização', false, 8.0, '', 1800.00, 8.0),
  ('00000000-0000-0000-0000-000000000000', 'Fechadura eletrônica', 'Acabamento e Finalização', false, 2.0, '', 1000.00, 2.0),
  ('00000000-0000-0000-0000-000000000000', 'Planejados', 'Acabamento e Finalização', false, 1.0, '', 140000.00, 1.0),
  
  -- Custo Total Estimado (1 item - summary row)
  ('00000000-0000-0000-0000-000000000000', 'Custo Total Estimado (Mão de Obra + Material + Taxas/Impostos)', 'Custo Total Estimado', false, 0.0, '', 0, 0)

ON CONFLICT DO NOTHING;

COMMIT;
