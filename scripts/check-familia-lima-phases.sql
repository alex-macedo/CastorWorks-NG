-- Check phases for "Residencial Familia Lima" project
SELECT
  p.id as project_id,
  p.name as project_name,
  p.start_date as project_start,
  p.end_date as project_end,
  COUNT(pp.id) as total_phases
FROM projects p
LEFT JOIN project_phases pp ON pp.project_id = p.id
WHERE p.name ILIKE '%Familia Lima%'
GROUP BY p.id, p.name, p.start_date, p.end_date;

-- Get all phases for this project
SELECT
  pp.id,
  pp.phase_name,
  pp.start_date,
  pp.end_date,
  pp.status,
  pp.progress_percentage,
  pp.created_at
FROM projects p
JOIN project_phases pp ON pp.project_id = p.id
WHERE p.name ILIKE '%Familia Lima%'
ORDER BY pp.start_date;