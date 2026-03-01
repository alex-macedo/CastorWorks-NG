-- Migration: Seed template tables directly
-- Purpose: Ensure simplebudget template tables have data, regardless of source table state
-- This migration seeds the new template tables with the standard template data
-- Uses SECURITY DEFINER function to bypass RLS during migration

BEGIN;

-- Create a SECURITY DEFINER function to seed materials template (bypasses RLS)
CREATE OR REPLACE FUNCTION public.seed_materials_template()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count INTEGER;
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.simplebudget_materials_template;
  
  IF existing_count = 0 THEN
    RAISE NOTICE 'Seeding simplebudget_materials_template with 89 materials...';
    
    INSERT INTO public.simplebudget_materials_template (
      sinapi_code, group_name, description, quantity, unit, price_per_unit,
      freight_percentage, factor, tgfa_applicable, editable
    ) VALUES 
      -- Row 1: Total Metragem da Casa
      (NULL, 'Total Metragem da Casa (m²)', 'Total Metragem da Casa (m²)', 0, 'm²', 0, 0, 0.0, true, true),
      
      -- Mão-de-obra (5 items)
      (NULL, 'Mão-de-obra', 'Pedreiro', 0, 'm²', 850.00, 0, 0.0, true, true),
      (NULL, 'Mão-de-obra', 'Gerenciamento', 0, 'm²', 234.00, 0, 0.0, true, true),
      (NULL, 'Mão-de-obra', 'Encanador', 0, 'm²', 75.00, 0, 0.0, true, true),
      (NULL, 'Mão-de-obra', 'Eletricista', 0, 'm²', 75.00, 0, 0.0, true, true),
      (NULL, 'Mão-de-obra', 'Pintor', 0, 'm²', 90.00, 0, 0.0, true, true),
      
      -- Taxas/Impostos (3 items)
      (NULL, 'Taxas/Impostos', 'Aprovação Condomínio', 1.0, 'm²', 500.00, 0, 1.0, false, true),
      (NULL, 'Taxas/Impostos', 'Habite-se + ISS (Estimado com Base Histórica)', 1.0, 'm²', 4500.00, 0, 1.0, false, true),
      (NULL, 'Taxas/Impostos', 'INSS Final de Obra', 0, 'm²', 0, 0, 0.0, true, true),
      
      -- Projeto (4 items)
      (NULL, 'Projeto', 'Engenheiro civil', 0, 'm²', 10.00, 0, 0.0, true, true),
      (NULL, 'Projeto', 'Engenheiro elétrico', 0, 'm²', 7.50, 0, 0.0, true, true),
      (NULL, 'Projeto', 'Engenheiro elétrico', 0, 'm²', 7.50, 0, 0.0, true, true),
      (NULL, 'Projeto', 'Arquiteto', 0, 'm²', 46.67, 0, 0.0, true, true),
      
      -- Aluguéis (4 items)
      (NULL, 'Aluguéis', 'Locações mensais (banheiro, container, betoneira)', 18.0, 'mês', 600.00, 0, 18.0, false, true),
      (NULL, 'Aluguéis', 'Locações equipmentos diversos', 18.0, 'mês', 300.00, 0, 18.0, false, true),
      (NULL, 'Aluguéis', 'Caçamba', 25.0, 'um', 180.00, 0, 25.0, false, true),
      (NULL, 'Aluguéis', 'Locação de andaimes', 10.0, 'mês', 800.00, 0, 10.0, false, true),
      
      -- Alvenaria e Gesso (7 items)
      (NULL, 'Alvenaria e Gesso', 'Areia fina', 0, 'm³', 45.00, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Areia grossa', 0, 'm³', 17.50, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Pedra 1/2', 0, 'm³', 13.13, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Cal prime', 0, 'Kg', 10.34, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Cimento cauê', 0, 'Kg', 83.76, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Tijolo', 0, 'm²', 17.50, 0, 0.0, true, true),
      (NULL, 'Alvenaria e Gesso', 'Blocos de vedação', 0, 'm²', 35.63, 0, 0.0, true, true),
      
      -- Terraplanagem (2 items)
      (NULL, 'Terraplanagem', 'Operador de escavadeira', 1.0, '', 7000.00, 0, 1.0, false, true),
      (NULL, 'Terraplanagem', 'Caminhão de terra', 0, '', 350.00, 0, 0.0, false, true),
      
      -- Ferragem (2 items)
      (NULL, 'Ferragem', 'Pregos', 0, 'Kg', 6.96, 0, 0.0, true, true),
      (NULL, 'Ferragem', 'Ferragens em geral', 0, 'm³', 115.00, 0, 0.0, true, true),
      
      -- Casa (1 item)
      (NULL, 'Casa', 'Casas total (fundação a laje)', 100.0, 'm³', 450.00, 0, 100.0, false, true),
      
      -- Piso (1 item)
      (NULL, 'Piso', 'Contrapiso', 0, 'm³', 340.00, 0, 0.0, false, true),
      
      -- Madeira (3 items)
      (NULL, 'Madeira', 'Fundação', 0, 'm³', 42.00, 0, 0.0, true, true),
      (NULL, 'Madeira', 'Estrutura', 0, 'm³', 42.00, 0, 0.0, true, true),
      (NULL, 'Madeira', 'Madeirite plastificado', 0, 'm³', 12.50, 0, 0.0, true, true),
      
      -- Telhado (4 items)
      (NULL, 'Telhado', 'Cerâmica portuguesa', 0, '', 70.00, 0, 0.0, false, true),
      (NULL, 'Telhado', 'Telhado aparente', 0, '', 30.65, 0, 0.0, false, true),
      (NULL, 'Telhado', 'Calhas, rufos e pingadeiras', 0, '', 50.00, 0, 0.0, true, true),
      (NULL, 'Telhado', 'Embutido total', 0, '', 157.00, 0, 0.0, true, true),
      
      -- Laje (2 items)
      (NULL, 'Laje', 'Laje baixa', 180.0, '', 65.00, 0, 180.0, false, true),
      (NULL, 'Laje', 'Laje alta', 0, '', 65.00, 0, 0.0, false, true),
      
      -- Impermeabilização (4 items)
      (NULL, 'Impermeabilização', 'Fundação (Produto + M.O)', 1.0, '', 1.00, 0, 1.0, false, true),
      (NULL, 'Impermeabilização', 'Piscina (Produto + M.O)', 40.0, '', 50.00, 0, 40.0, false, true),
      (NULL, 'Impermeabilização', 'Laje (Produto + M.O)', 35.0, '', 150.00, 0, 35.0, false, true),
      (NULL, 'Impermeabilização', 'Muro de arrimo (Produto + M.O)', 1.0, '', 1.00, 0, 1.0, false, true),
      
      -- Elétrica (3 items)
      (NULL, 'Elétrica', 'Fios em geral', 0, '', 50.00, 0, 0.0, true, true),
      (NULL, 'Elétrica', 'Iluminação (interna e externa)', 0, '', 75.00, 0, 0.0, true, true),
      (NULL, 'Elétrica', 'Tomadas e interruptores', 0, '', 20.00, 0, 0.0, true, true),
      
      -- Hidráulica (1 item)
      (NULL, 'Hidráulica', 'Itens hidráulica (água quente + fria)', 0, '', 90.00, 0, 0.0, true, true),
      
      -- Acabamento e Finalização (43 items)
      (NULL, 'Acabamento e Finalização', 'Piso interno', 275.0, '', 85.00, 0, 275.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Piso externo', 28.0, '', 78.00, 0, 28.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Piso vinílico', 110.0, '', 160.00, 0, 110.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Piso de madeira', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Rodapé (pvc ou invertido)', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Argamassa/rejunte/espaçador (piso)', 120.0, '', 40.00, 0, 120.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Petit pave', 80.0, '', 120.00, 0, 80.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Fulget', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Deck de madeira', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Revestimento de banheiro', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Revestimento externo (fachada e muros)', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Revestimento piscina', 35.0, '', 138.00, 0, 35.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Argamassa/rejunte/espaçador (piscina)', 1.0, '', 1000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Kit iluminação piscina', 1.0, '', 2500.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Hidromassagem (bomba + hidrojatos)', 1.0, '', 0, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Sistema de bombas piscina', 1.0, '', 5000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Artefatos', 1.0, '', 2500.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Forro de gesso', 230.0, '', 70.00, 0, 230.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Sanca de gesso', 30.0, '', 70.00, 0, 30.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Forro de madeira', 70.0, '', 250.00, 0, 70.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Metais', 1.0, '', 13200.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Louça', 1.0, '', 12000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Nicho (mármore ou porcelanato)', 4.0, '', 0, 0, 4.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Box de vidro temperado', 4.0, '', 0, 0, 4.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Espelhos', 4.0, '', 0, 0, 4.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Esquadrias', 1.0, '', 72000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Mármore - pedras em geral', 1.0, '', 20000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Paisagismo', 1.0, '', 10000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Infraestrutura de ar condicionado', 6.0, '', 550.00, 0, 6.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Energia fotovoltaica', 1.0, '', 20000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Aquecimento solar (casa + piscina)', 1.0, '', 11000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Aquecimento - trocadores de calor piscina', 1.0, '', 12000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Automação (mão de obra + material)', 0, '', 0, 0, 0.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Coifa + braseiro + eletrodomesticos + ar condicionado', 1.0, '', 50000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Pintura em geral', 1.0, '', 20000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Porta principal', 1.0, '', 10000.00, 0, 1.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Portas internas', 8.0, '', 1800.00, 0, 8.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Fechadura eletrônica', 2.0, '', 1000.00, 0, 2.0, false, true),
      (NULL, 'Acabamento e Finalização', 'Planejados', 1.0, '', 140000.00, 0, 1.0, false, true),
      
      -- Custo Total Estimado (1 item - summary row)
      (NULL, 'Custo Total Estimado', 'Custo Total Estimado (Mão de Obra + Material + Taxas/Impostos)', 0, '', 0, 0, 0.0, false, true);
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % materials into simplebudget_materials_template', inserted_count;
    RETURN inserted_count;
  ELSE
    RAISE NOTICE 'simplebudget_materials_template already has % rows, skipping seed', existing_count;
    RETURN 0;
  END IF;
END;
$$;

-- Create a SECURITY DEFINER function to seed labor template (bypasses RLS)
CREATE OR REPLACE FUNCTION public.seed_labor_template()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count INTEGER;
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.simplebudget_labor_template;
  
  IF existing_count = 0 THEN
    RAISE NOTICE 'Seeding simplebudget_labor_template with 12 labor items...';
    
    INSERT INTO public.simplebudget_labor_template (
      "group", description, total_value, percentage, editable
    ) VALUES
      ('Fundação', 'Marcação e Escavação Alicerce', 28368.00, 12, true),
      ('Alvenaria', 'Baldrames, impermeabilização, alvenaria, posicionamento de ferragens, caixaria, vigas e colunas', 26004.00, 11, true),
      ('Muro/chapisco/reboco/emboço', 'Levantamento do muro, chapisco e embolso', 23640.00, 10, true),
      ('Hidráulica', 'Posicionamento dos canos, conexões para estruturação hidráulica', 28368.00, 12, true),
      ('Elétrica', 'Passagem de cabos, instalação de quadro, padrão, disjuntores e conectores em geral', 16548.00, 7, true),
      ('Laje', 'Posicionamento das treliças, isopores, conduítes, caixas de passagens e enchimento do concreto', 16548.00, 7, true),
      ('Acabamentos', 'Assentamento de pisos e revestimentos, pias, soleiras/alisares, janelas/vitrôs, portas e louças e metais', 23640.00, 10, true),
      ('Telhado', 'Posicionamento e corte das estruturas metálicas/madeira e alocação das telhas e calhas de acordo com o projeto', 14184.00, 6, true),
      ('Emassamento / Gesso', 'Aplicação de massa PVA, lixamento, aplicação de gesso', 18912.00, 8, true),
      ('Pintura Interna/Externa', 'Pintura conforme parâmetros do projeto (interno, externo e muros)', 16548.00, 7, true),
      ('Acabamentos e Finalização', 'Ajustes, impermeabilização do telhado, calçadas, frente, paisagismo e verniz nas portas', 14184.00, 6, true),
      ('Adicionais', 'Administração / Gestão / Custos Indiretos / EPIs', 9456.00, 4, true);
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % labor items into simplebudget_labor_template', inserted_count;
    RETURN inserted_count;
  ELSE
    RAISE NOTICE 'simplebudget_labor_template already has % rows, skipping seed', existing_count;
    RETURN 0;
  END IF;
END;
$$;

-- Execute the seed functions (bypasses RLS via SECURITY DEFINER)
DO $$
DECLARE
  materials_result INTEGER;
  labor_result INTEGER;
BEGIN
  SELECT public.seed_materials_template() INTO materials_result;
  SELECT public.seed_labor_template() INTO labor_result;
  
  RAISE NOTICE '=== Seed Execution Results ===';
  RAISE NOTICE 'Materials seeded: % rows', materials_result;
  RAISE NOTICE 'Labor seeded: % rows', labor_result;
END $$;

-- Final verification
DO $$
DECLARE
  materials_count INTEGER;
  labor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materials_count FROM public.simplebudget_materials_template;
  SELECT COUNT(*) INTO labor_count FROM public.simplebudget_labor_template;
  
  RAISE NOTICE '=== Final Template Data Status ===';
  RAISE NOTICE 'Materials: % items', materials_count;
  RAISE NOTICE 'Labor: % items', labor_count;
  
  IF materials_count = 0 OR labor_count = 0 THEN
    RAISE WARNING 'Template tables still empty after seed attempt';
  ELSE
    RAISE NOTICE 'Template tables successfully seeded!';
  END IF;
END $$;

-- Clean up seed functions (optional - can be kept for manual re-seeding)
-- DROP FUNCTION IF EXISTS public.seed_materials_template();
-- DROP FUNCTION IF EXISTS public.seed_labor_template();

COMMIT;
