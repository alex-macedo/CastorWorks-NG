-- Insert new roadmap phase for Master Data Management
INSERT INTO roadmap_phases (phase_name, phase_number, description, status, start_date, end_date)
VALUES (
  'Master Data Management',
  5,
  'Implement CRUD pages for managing construction activity templates and project phases',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days'
);

-- Insert tasks for the new phase
WITH new_phase AS (
  SELECT id FROM roadmap_phases WHERE phase_number = 5
)
INSERT INTO roadmap_tasks (phase_id, title, description, category, status, priority, estimated_hours, completion_percentage)
SELECT 
  new_phase.id,
  title,
  description,
  'implementation',
  'in_progress',
  priority,
  estimated_hours,
  0
FROM new_phase,
(VALUES
  ('Database Initialization', 'Create default construction activity template with 21 standard activities', 'high', 0.5),
  ('Enhance Project Phases Hook', 'Add CRUD mutations to useProjectPhases hook', 'high', 0.25),
  ('Construction Activities Page', 'Create page to manage activity templates with CRUD operations', 'critical', 1.0),
  ('Project Phases Page', 'Create page to manage project phases with timeline visualization', 'critical', 1.0),
  ('UI Components - Templates', 'Build TemplateCard, TemplateEditorDialog, ActivityListItem components', 'medium', 0.75),
  ('UI Components - Phases', 'Build PhaseForm, PhaseTimeline, PhasesTable components', 'medium', 0.75),
  ('Navigation & Routing', 'Add routes and navigation links for new pages', 'high', 0.25),
  ('Translations', 'Add translations for all new UI elements in 4 languages', 'medium', 0.5)
) AS t(title, description, priority, estimated_hours);

-- Insert default construction activity template if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM activity_templates WHERE template_name = 'Default Construction Activities') THEN
    INSERT INTO activity_templates (
      template_name,
      description,
      is_default,
      is_system,
      activities
    ) VALUES (
      'Default Construction Activities',
      'Standard construction workflow for residential projects',
      true,
      true,
      '[
        {"sequence": 1, "name": "Definição da Obra", "defaultDays": 10},
        {"sequence": 2, "name": "Terraplanagem e infra da Obra", "defaultDays": 10},
        {"sequence": 3, "name": "Marcação e Escavação Alicerce", "defaultDays": 10},
        {"sequence": 4, "name": "Colocação das ferragens", "defaultDays": 10},
        {"sequence": 5, "name": "Enchimento Alicerce", "defaultDays": 10},
        {"sequence": 6, "name": "Impermeabilização", "defaultDays": 5},
        {"sequence": 7, "name": "Alvenaria (casa e muros) e colunas", "defaultDays": 29},
        {"sequence": 8, "name": "Vigas e fechamentos", "defaultDays": 16},
        {"sequence": 9, "name": "Preparação para Laje e conduítes", "defaultDays": 12},
        {"sequence": 10, "name": "Laje", "defaultDays": 10},
        {"sequence": 11, "name": "Telhado", "defaultDays": 12},
        {"sequence": 12, "name": "Instalação hidráulica", "defaultDays": 10},
        {"sequence": 13, "name": "Instalação elétrica", "defaultDays": 10},
        {"sequence": 14, "name": "Reboco interno e externo", "defaultDays": 20},
        {"sequence": 15, "name": "Contrapiso", "defaultDays": 7},
        {"sequence": 16, "name": "Esquadrias (portas e janelas)", "defaultDays": 8},
        {"sequence": 17, "name": "Revestimentos (pisos e azulejos)", "defaultDays": 15},
        {"sequence": 18, "name": "Pintura", "defaultDays": 12},
        {"sequence": 19, "name": "Louças e metais", "defaultDays": 5},
        {"sequence": 20, "name": "Acabamentos finais", "defaultDays": 10},
        {"sequence": 21, "name": "Limpeza final", "defaultDays": 3}
      ]'::jsonb
    );
  END IF;
END $$;