-- Get the current definition of the function
SELECT pg_get_functiondef('apply_wbs_template_to_project_internal(uuid, uuid)'::regprocedure);
