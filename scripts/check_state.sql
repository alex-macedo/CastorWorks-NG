SELECT 
    (SELECT count(*) FROM projects) as total_projects,
    (SELECT count(*) FROM projects WHERE client_id IS NOT NULL) as projects_with_client,
    (SELECT count(*) FROM clients) as total_clients;
