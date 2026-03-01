-- Check WBS parent relationships for a project
WITH RECURSIVE wbs_tree AS (
  -- Root items (no parent)
  SELECT 
    w.id,
    w.name,
    w.wbs_code,
    w.parent_id,
    NULL::text as parent_name,
    0 as level
  FROM project_wbs_items w
  WHERE w.project_id = (
    SELECT id FROM projects 
    WHERE EXISTS (SELECT 1 FROM project_wbs_items WHERE project_id = projects.id) 
    LIMIT 1
  )
  AND w.parent_id IS NULL

  UNION ALL

  -- Child items
  SELECT 
    w.id,
    w.name,
    w.wbs_code,
    w.parent_id,
    p.name as parent_name,
    t.level + 1
  FROM project_wbs_items w
  INNER JOIN wbs_tree t ON w.parent_id = t.id
  INNER JOIN project_wbs_items p ON w.parent_id = p.id
)
SELECT 
  wbs_code,
  name,
  parent_id,
  parent_name,
  level
FROM wbs_tree
ORDER BY wbs_code;
