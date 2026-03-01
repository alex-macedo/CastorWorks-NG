-- Test Script: Verify WBS Template Parent-Child Hierarchy Fix
-- Purpose: Check that the parent-child relationships are correctly maintained after applying template

-- Step 1: Check the template structure
\echo '=== Template Structure (Source) ==='
SELECT 
  t.id,
  t.parent_id,
  CASE 
    WHEN t.parent_id IS NULL THEN '└─'
    ELSE '  └─'
  END || t.name as hierarchy,
  t.item_type,
  t.code_path,
  t.wbs_code
FROM project_wbs_template_items t
WHERE template_id = (SELECT id FROM project_wbs_templates WHERE is_default = true LIMIT 1)
ORDER BY t.code_path;

-- Step 2: Find a project with WBS items (or create a test one)
\echo ''
\echo '=== Sample Project WBS Items (Result) ==='
SELECT 
  w.id,
  w.parent_id,
  w.source_template_item_id,
  CASE 
    WHEN w.parent_id IS NULL THEN '└─'
    ELSE '  └─'
  END || w.name as hierarchy,
  w.item_type,
  w.code_path,
  w.wbs_code,
  t.name as template_source_name,
  t.parent_id as template_parent_id
FROM project_wbs_items w
LEFT JOIN project_wbs_template_items t ON w.source_template_item_id = t.id
WHERE w.project_id = (
  SELECT id FROM projects 
  WHERE EXISTS (SELECT 1 FROM project_wbs_items WHERE project_id = projects.id) 
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY w.code_path;

-- Step 3: Verify parent-child integrity
\echo ''
\echo '=== Parent-Child Integrity Check ==='
-- This query checks if any child item's parent_id doesn't match the expected mapping
WITH latest_project AS (
  SELECT id FROM projects 
  WHERE EXISTS (SELECT 1 FROM project_wbs_items WHERE project_id = projects.id) 
  ORDER BY created_at DESC 
  LIMIT 1
),
parent_mapping_check AS (
  SELECT 
    child.id as child_id,
    child.name as child_name,
    child.parent_id as actual_parent_id,
    parent_in_project.id as expected_parent_id,
    parent_in_project.name as expected_parent_name,
    CASE 
      WHEN child.parent_id = parent_in_project.id OR (child.parent_id IS NULL AND parent_in_project.id IS NULL) THEN 'OK'
      ELSE 'MISMATCH'
    END as status
  FROM project_wbs_items child
  -- Join to template to get the template's parent_id
  INNER JOIN project_wbs_template_items child_template 
    ON child.source_template_item_id = child_template.id
  -- If template has a parent, find the corresponding project item
  LEFT JOIN project_wbs_template_items parent_template 
    ON child_template.parent_id = parent_template.id
  LEFT JOIN project_wbs_items parent_in_project 
    ON parent_in_project.source_template_item_id = parent_template.id
    AND parent_in_project.project_id = child.project_id
  WHERE child.project_id = (SELECT id FROM latest_project)
)
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(child_name, ', ') as items
FROM parent_mapping_check
GROUP BY status;

-- Step 4: Show any mismatches in detail
\echo ''
\echo '=== Detailed Mismatches (if any) ==='
WITH latest_project AS (
  SELECT id FROM projects 
  WHERE EXISTS (SELECT 1 FROM project_wbs_items WHERE project_id = projects.id) 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  child.name as child_name,
  child.parent_id as actual_parent_id,
  actual_parent.name as actual_parent_name,
  expected_parent.id as expected_parent_id,
  expected_parent.name as expected_parent_name,
  child_template.parent_id as template_parent_id
FROM project_wbs_items child
INNER JOIN project_wbs_template_items child_template 
  ON child.source_template_item_id = child_template.id
LEFT JOIN project_wbs_template_items parent_template 
  ON child_template.parent_id = parent_template.id
LEFT JOIN project_wbs_items expected_parent 
  ON expected_parent.source_template_item_id = parent_template.id
  AND expected_parent.project_id = child.project_id
LEFT JOIN project_wbs_items actual_parent
  ON child.parent_id = actual_parent.id
WHERE child.project_id = (SELECT id FROM latest_project)
  AND (child.parent_id != expected_parent.id OR (child.parent_id IS NULL AND expected_parent.id IS NOT NULL) OR (child.parent_id IS NOT NULL AND expected_parent.id IS NULL))
ORDER BY child.code_path;

\echo ''
\echo '=== Summary ==='
\echo 'If "Detailed Mismatches" shows no rows, the parent-child hierarchy is working correctly!'
\echo 'All child items should have their parent_id matching the mapped parent from the template.'
