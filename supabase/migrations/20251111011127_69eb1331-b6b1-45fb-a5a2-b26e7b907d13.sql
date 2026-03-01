-- Fix Brazilian Construction Activities to use proper capitalization
UPDATE activity_templates
SET activities = '[
  {"sequence": 1, "activityName": "Layout (Gabarito)", "defaultDays": 3},
  {"sequence": 2, "activityName": "Concrete Piles", "defaultDays": 7},
  {"sequence": 3, "activityName": "Beam Foundation", "defaultDays": 9},
  {"sequence": 4, "activityName": "Base Foundation", "defaultDays": 4},
  {"sequence": 5, "activityName": "Beam Deforming", "defaultDays": 1},
  {"sequence": 6, "activityName": "Low Masonry (3m)", "defaultDays": 6},
  {"sequence": 7, "activityName": "High Masonry (3m)", "defaultDays": 6},
  {"sequence": 8, "activityName": "Assemble and Pour Lower Slab", "defaultDays": 12},
  {"sequence": 9, "activityName": "Lower Slab Deforming", "defaultDays": 2},
  {"sequence": 10, "activityName": "Upper Masonry - Low Section", "defaultDays": 5},
  {"sequence": 11, "activityName": "Upper Masonry - High Section", "defaultDays": 5},
  {"sequence": 12, "activityName": "Assemble and Pour Upper Slab", "defaultDays": 8},
  {"sequence": 13, "activityName": "Upper Slab Deforming", "defaultDays": 2},
  {"sequence": 14, "activityName": "Subfloor - Internal and External", "defaultDays": 8},
  {"sequence": 15, "activityName": "Plaster and Render", "defaultDays": 15},
  {"sequence": 16, "activityName": "Threshold and Door Frame", "defaultDays": 5},
  {"sequence": 17, "activityName": "Floor Leveling", "defaultDays": 7},
  {"sequence": 18, "activityName": "Total Coating", "defaultDays": 14},
  {"sequence": 19, "activityName": "Electrical Installation", "defaultDays": 10},
  {"sequence": 20, "activityName": "Plumbing Installation", "defaultDays": 10},
  {"sequence": 21, "activityName": "Wall Construction", "defaultDays": 5},
  {"sequence": 22, "activityName": "Retaining Wall", "defaultDays": 8},
  {"sequence": 23, "activityName": "Pool Construction", "defaultDays": 12},
  {"sequence": 24, "activityName": "Technical Reserve", "defaultDays": 3}
]'::jsonb
WHERE template_name = 'Brazilian Construction Activities' AND is_system = true;

-- Fix Default Construction Activities to use correct field name (activityName instead of name)
UPDATE activity_templates
SET activities = '[
  {"sequence": 1, "activityName": "Definição da Obra", "defaultDays": 10},
  {"sequence": 2, "activityName": "Terraplanagem e infra da Obra", "defaultDays": 10},
  {"sequence": 3, "activityName": "Marcação e Escavação Alicerce", "defaultDays": 10},
  {"sequence": 4, "activityName": "Colocação das ferragens", "defaultDays": 10},
  {"sequence": 5, "activityName": "Enchimento Alicerce", "defaultDays": 10},
  {"sequence": 6, "activityName": "Impermeabilização", "defaultDays": 5},
  {"sequence": 7, "activityName": "Alvenaria (casa e muros) e colunas", "defaultDays": 29},
  {"sequence": 8, "activityName": "Vigas e fechamentos", "defaultDays": 16},
  {"sequence": 9, "activityName": "Preparação para Laje e conduítes", "defaultDays": 12},
  {"sequence": 10, "activityName": "Laje", "defaultDays": 10},
  {"sequence": 11, "activityName": "Telhado", "defaultDays": 12},
  {"sequence": 12, "activityName": "Instalação hidráulica", "defaultDays": 10},
  {"sequence": 13, "activityName": "Instalação elétrica", "defaultDays": 10},
  {"sequence": 14, "activityName": "Reboco interno e externo", "defaultDays": 20},
  {"sequence": 15, "activityName": "Contrapiso", "defaultDays": 7},
  {"sequence": 16, "activityName": "Esquadrias (portas e janelas)", "defaultDays": 8},
  {"sequence": 17, "activityName": "Revestimentos (pisos e azulejos)", "defaultDays": 15},
  {"sequence": 18, "activityName": "Pintura", "defaultDays": 12},
  {"sequence": 19, "activityName": "Louças e metais", "defaultDays": 5},
  {"sequence": 20, "activityName": "Acabamentos finais", "defaultDays": 10},
  {"sequence": 21, "activityName": "Limpeza final", "defaultDays": 3}
]'::jsonb
WHERE template_name = 'Default Construction Activities' AND is_system = true;