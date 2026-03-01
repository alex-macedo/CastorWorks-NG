-- Data Validation Script for Dropdown Options Migration
-- This script checks for invalid dropdown values in existing data

-- Check for invalid project types
SELECT 
  'projects' as table_name,
  'project_type' as field_name,
  p.id as record_id,
  p.project_type as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.project_type NOT IN (
  'residential', 'commercial', 'renovation', 'infrastructure', 
  'project_owned', 'project_customer'
)
AND p.project_type IS NOT NULL;

-- Check for invalid project statuses
SELECT 
  'projects' as table_name,
  'project_status' as field_name,
  p.id as record_id,
  p.project_status as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.project_status NOT IN (
  'planning', 'in_progress', 'paused', 'completed', 'active', 
  'delayed', 'on_track', 'at_risk', 'on_hold'
)
AND p.project_status IS NOT NULL;

-- Check for invalid construction units
SELECT 
  'projects' as table_name,
  'construction_unit' as field_name,
  p.id as record_id,
  p.construction_unit as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.construction_unit NOT IN ('square_meter', 'square_feet')
AND p.construction_unit IS NOT NULL;

-- Check for invalid floor types
SELECT 
  'projects' as table_name,
  'floor_type' as field_name,
  p.id as record_id,
  p.floor_type as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.floor_type NOT IN (
  'ground_floor', 'ground_plus_1', 'ground_plus_2', 
  'ground_plus_3', 'ground_plus_4'
)
AND p.floor_type IS NOT NULL;

-- Check for invalid finishing types
SELECT 
  'projects' as table_name,
  'finishing_type' as field_name,
  p.id as record_id,
  p.finishing_type as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.finishing_type NOT IN ('simple', 'medium', 'high')
AND p.finishing_type IS NOT NULL;

-- Check for invalid roof types
SELECT 
  'projects' as table_name,
  'roof_type' as field_name,
  p.id as record_id,
  p.roof_type as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.roof_type NOT IN ('colonial', 'built_in', 'waterproofed')
AND p.roof_type IS NOT NULL;

-- Check for invalid terrain types
SELECT 
  'projects' as table_name,
  'terrain_type' as field_name,
  p.id as record_id,
  p.terrain_type as invalid_value,
  p.name as record_name,
  p.created_at
FROM projects p
WHERE p.terrain_type NOT IN ('flat', 'slope', 'upslope')
AND p.terrain_type IS NOT NULL;

-- Check for invalid task priorities
SELECT 
  'architect_tasks' as table_name,
  'priority' as field_name,
  t.id as record_id,
  t.priority as invalid_value,
  t.title as record_name,
  t.created_at
FROM architect_tasks t
WHERE t.priority NOT IN ('low', 'medium', 'high', 'urgent')
AND t.priority IS NOT NULL;

-- Summary counts
SELECT 
  'Invalid Project Types' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE project_type NOT IN (
  'residential', 'commercial', 'renovation', 'infrastructure', 
  'project_owned', 'project_customer'
)
AND project_type IS NOT NULL

UNION ALL

SELECT 
  'Invalid Project Statuses' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE project_status NOT IN (
  'planning', 'in_progress', 'paused', 'completed', 'active', 
  'delayed', 'on_track', 'at_risk', 'on_hold'
)
AND project_status IS NOT NULL

UNION ALL

SELECT 
  'Invalid Construction Units' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE construction_unit NOT IN ('square_meter', 'square_feet')
AND construction_unit IS NOT NULL

UNION ALL

SELECT 
  'Invalid Floor Types' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE floor_type NOT IN (
  'ground_floor', 'ground_plus_1', 'ground_plus_2', 
  'ground_plus_3', 'ground_plus_4'
)
AND floor_type IS NOT NULL

UNION ALL

SELECT 
  'Invalid Finishing Types' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE finishing_type NOT IN ('simple', 'medium', 'high')
AND finishing_type IS NOT NULL

UNION ALL

SELECT 
  'Invalid Roof Types' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE roof_type NOT IN ('colonial', 'built_in', 'waterproofed')
AND roof_type IS NOT NULL

UNION ALL

SELECT 
  'Invalid Terrain Types' as check_name,
  COUNT(*) as invalid_count
FROM projects 
WHERE terrain_type NOT IN ('flat', 'slope', 'upslope')
AND terrain_type IS NOT NULL

UNION ALL

SELECT 
  'Invalid Task Priorities' as check_name,
  COUNT(*) as invalid_count
FROM architect_tasks 
WHERE priority NOT IN ('low', 'medium', 'high', 'urgent')
AND priority IS NOT NULL;
