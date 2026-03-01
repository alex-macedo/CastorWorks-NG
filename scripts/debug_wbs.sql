-- Check template structure
SELECT 
  id,
  parent_id,
  item_type,
  name,
  code_path,
  sort_order
FROM project_wbs_template_items
WHERE template_id = (SELECT id FROM project_wbs_templates LIMIT 1)
ORDER BY code_path;

-- Check a sample project's WBS items to see if parents are mapped correctly
SELECT 
  w.id,
  w.parent_id,
  w.source_template_item_id,
  w.item_type,
  w.name,
  w.code_path,
  t.parent_id as template_parent_id,
  t.name as template_name
FROM project_wbs_items w
LEFT JOIN project_wbs_template_items t ON w.source_template_item_id = t.id
WHERE w.project_id = (SELECT id FROM projects WHERE EXISTS (SELECT 1 FROM project_wbs_items WHERE project_id = projects.id) LIMIT 1)
ORDER BY w.code_path
LIMIT 20;
