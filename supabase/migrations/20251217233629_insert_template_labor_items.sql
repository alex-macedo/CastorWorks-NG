-- Insert template labor items with NULL project_id
-- Foreign key constraints allow NULL values, so no need to drop them

BEGIN;

-- Make project_id nullable and remove FK constraint to allow templates (like materials table)
ALTER TABLE public.project_labor ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.project_labor DROP CONSTRAINT IF EXISTS project_labor_project_id_fkey;

-- Insert template labor items (using template UUID for consistency with materials)
INSERT INTO public.project_labor (project_id, "group", description, total_value, percentage)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'Fundação', 'Marcação e Escavação Alicerce', 28368.00, 12),
  ('00000000-0000-0000-0000-000000000000', 'Alvenaria', 'Baldrames, impermeabilização, alvenaria, posicionamento de ferragens, caixaria, vigas e colunas', 26004.00, 11),
  ('00000000-0000-0000-0000-000000000000', 'Muro/chapisco/reboco/emboço', 'Levantamento do muro, chapisco e embolso', 23640.00, 10),
  ('00000000-0000-0000-0000-000000000000', 'Hidráulica', 'Posicionamento dos canos, conexões para estruturação hidráulica', 28368.00, 12),
  ('00000000-0000-0000-0000-000000000000', 'Elétrica', 'Passagem de cabos, instalação de quadro, padrão, disjuntores e conectores em geral', 16548.00, 7),
  ('00000000-0000-0000-0000-000000000000', 'Laje', 'Posicionamento das treliças, isopores, conduítes, caixas de passagens e enchimento do concreto', 16548.00, 7),
  ('00000000-0000-0000-0000-000000000000', 'Acabamentos', 'Assentamento de pisos e revestimentos, pias, soleiras/alisares, janelas/vitrôs, portas e louças e metais', 23640.00, 10),
  ('00000000-0000-0000-0000-000000000000', 'Telhado', 'Posicionamento e corte das estruturas metálicas/madeira e alocação das telhas e calhas de acordo com o projeto', 14184.00, 6),
  ('00000000-0000-0000-0000-000000000000', 'Emassamento / Gesso', 'Aplicação de massa PVA, lixamento, aplicação de gesso', 18912.00, 8),
  ('00000000-0000-0000-0000-000000000000', 'Pintura Interna/Externa', 'Pintura conforme parâmetros do projeto (interno, externo e muros)', 16548.00, 7),
  ('00000000-0000-0000-0000-000000000000', 'Acabamentos e Finalização', 'Ajustes, impermeabilização do telhado, calçadas, frente, paisagismo e verniz nas portas', 14184.00, 6),
  ('00000000-0000-0000-0000-000000000000', 'Adicionais', 'Administração / Gestão / Custos Indiretos / EPIs', 9456.00, 4);

-- Update RLS policies to handle template items (project_id = template UUID)
-- Templates should be readable by authenticated users, but only admins can modify

DROP POLICY IF EXISTS "project_labor_select_policy" ON public.project_labor;
CREATE POLICY "project_labor_select_policy"
  ON public.project_labor
  FOR SELECT
  TO authenticated
  USING (
    project_id = '00000000-0000-0000-0000-000000000000' OR  -- Templates accessible to all authenticated users
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "project_labor_insert_policy" ON public.project_labor;
CREATE POLICY "project_labor_insert_policy"
  ON public.project_labor
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id = '00000000-0000-0000-0000-000000000000' OR  -- Anyone can create template items (for now)
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "project_labor_update_policy" ON public.project_labor;
CREATE POLICY "project_labor_update_policy"
  ON public.project_labor
  FOR UPDATE
  TO authenticated
  USING (
    project_id = '00000000-0000-0000-0000-000000000000' OR  -- Anyone can modify templates (for now)
    has_project_access(auth.uid(), project_id)
  )
  WITH CHECK (
    project_id = '00000000-0000-0000-0000-000000000000' OR
    has_project_access(auth.uid(), project_id)
  );

DROP POLICY IF EXISTS "project_labor_delete_policy" ON public.project_labor;
CREATE POLICY "project_labor_delete_policy"
  ON public.project_labor
  FOR DELETE
  TO authenticated
  USING (
    project_id = '00000000-0000-0000-0000-000000000000' OR  -- Anyone can delete templates (for now)
    has_project_access(auth.uid(), project_id)
  );

COMMIT;