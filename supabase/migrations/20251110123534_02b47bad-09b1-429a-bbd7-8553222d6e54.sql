-- Insert Brazilian Residential Construction Phase Template
INSERT INTO phase_templates (template_name, description, is_default, is_system, phases)
VALUES (
  'Brazilian Residential Construction',
  'Comprehensive construction phases based on Brazilian construction standards with detailed budget distribution',
  true,
  true,
  '[
    {"sequence": 1, "phaseName": "FOUNDATION", "defaultDurationDays": 10, "defaultBudgetPercentage": 3},
    {"sequence": 2, "phaseName": "BEAM FOUNDATION (BALDRAME)", "defaultDurationDays": 14, "defaultBudgetPercentage": 14},
    {"sequence": 3, "phaseName": "LOW RETAINING WALL", "defaultDurationDays": 12, "defaultBudgetPercentage": 12},
    {"sequence": 4, "phaseName": "LOWER SLAB FORMWORK", "defaultDurationDays": 14, "defaultBudgetPercentage": 11},
    {"sequence": 5, "phaseName": "UPPER MASONRY", "defaultDurationDays": 10, "defaultBudgetPercentage": 3},
    {"sequence": 6, "phaseName": "UPPER SLAB FORMWORK", "defaultDurationDays": 10, "defaultBudgetPercentage": 6},
    {"sequence": 7, "phaseName": "SUBFLOOR", "defaultDurationDays": 8, "defaultBudgetPercentage": 6},
    {"sequence": 8, "phaseName": "PLASTER AND RENDER", "defaultDurationDays": 15, "defaultBudgetPercentage": 12},
    {"sequence": 9, "phaseName": "THRESHOLD AND DOOR FRAME", "defaultDurationDays": 5, "defaultBudgetPercentage": 1},
    {"sequence": 10, "phaseName": "FLOOR LEVELING", "defaultDurationDays": 7, "defaultBudgetPercentage": 2},
    {"sequence": 11, "phaseName": "TOTAL COATING", "defaultDurationDays": 14, "defaultBudgetPercentage": 11},
    {"sequence": 12, "phaseName": "ELECTRICAL", "defaultDurationDays": 10, "defaultBudgetPercentage": 5},
    {"sequence": 13, "phaseName": "PLUMBING", "defaultDurationDays": 10, "defaultBudgetPercentage": 6},
    {"sequence": 14, "phaseName": "WALL", "defaultDurationDays": 5, "defaultBudgetPercentage": 2},
    {"sequence": 15, "phaseName": "RETAINING WALL", "defaultDurationDays": 8, "defaultBudgetPercentage": 4},
    {"sequence": 16, "phaseName": "POOL", "defaultDurationDays": 12, "defaultBudgetPercentage": 5},
    {"sequence": 17, "phaseName": "TECHNICAL RESERVE", "defaultDurationDays": 3, "defaultBudgetPercentage": 1}
  ]'::jsonb
);

-- Insert Brazilian Construction Activities Template
INSERT INTO activity_templates (template_name, description, is_default, is_system, activities)
VALUES (
  'Brazilian Construction Activities',
  'Detailed construction activities aligned with Brazilian construction workflow',
  true,
  true,
  '[
    {"sequence": 1, "activityName": "LAYOUT (GABARITO)", "defaultDays": 3},
    {"sequence": 2, "activityName": "CONCRETE PILES", "defaultDays": 7},
    {"sequence": 3, "activityName": "BEAM FOUNDATION", "defaultDays": 9},
    {"sequence": 4, "activityName": "BASE FOUNDATION", "defaultDays": 4},
    {"sequence": 5, "activityName": "BEAM DEFORMING", "defaultDays": 1},
    {"sequence": 6, "activityName": "LOW MASONRY (3M)", "defaultDays": 6},
    {"sequence": 7, "activityName": "HIGH MASONRY (3M)", "defaultDays": 6},
    {"sequence": 8, "activityName": "ASSEMBLE AND POUR LOWER SLAB", "defaultDays": 12},
    {"sequence": 9, "activityName": "LOWER SLAB DEFORMING", "defaultDays": 2},
    {"sequence": 10, "activityName": "UPPER MASONRY - LOW SECTION", "defaultDays": 5},
    {"sequence": 11, "activityName": "UPPER MASONRY - HIGH SECTION", "defaultDays": 5},
    {"sequence": 12, "activityName": "ASSEMBLE AND POUR UPPER SLAB", "defaultDays": 8},
    {"sequence": 13, "activityName": "UPPER SLAB DEFORMING", "defaultDays": 2},
    {"sequence": 14, "activityName": "SUBFLOOR - INTERNAL AND EXTERNAL", "defaultDays": 8},
    {"sequence": 15, "activityName": "PLASTER AND RENDER", "defaultDays": 15},
    {"sequence": 16, "activityName": "THRESHOLD AND DOOR FRAME", "defaultDays": 5},
    {"sequence": 17, "activityName": "FLOOR LEVELING", "defaultDays": 7},
    {"sequence": 18, "activityName": "TOTAL COATING", "defaultDays": 14},
    {"sequence": 19, "activityName": "ELECTRICAL INSTALLATION", "defaultDays": 10},
    {"sequence": 20, "activityName": "PLUMBING INSTALLATION", "defaultDays": 10},
    {"sequence": 21, "activityName": "WALL CONSTRUCTION", "defaultDays": 5},
    {"sequence": 22, "activityName": "RETAINING WALL", "defaultDays": 8},
    {"sequence": 23, "activityName": "POOL CONSTRUCTION", "defaultDays": 12},
    {"sequence": 24, "activityName": "TECHNICAL RESERVE", "defaultDays": 3}
  ]'::jsonb
);