CREATE OR REPLACE FUNCTION check_project_clients()
RETURNS TABLE (total_projects bigint, projects_with_client bigint, total_clients bigint) 
LANGUAGE sql AS $$
  SELECT 
    (SELECT count(*) FROM projects),
    (SELECT count(*) FROM projects WHERE client_id IS NOT NULL),
    (SELECT count(*) FROM clients);
$$;
