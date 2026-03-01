-- ============================================================================
-- CastorWorks Architect Projects Data Cleanup - RPC Function (Corrected)
-- Created: 2025-01-30
-- Description: Comprehensive RPC function to safely delete target architect projects
-- Target Projects: All instances of "Renovação de Hotel Boutique" and "Torre Corporativa Sustentável"
-- ============================================================================

-- Create the main deletion RPC function
CREATE OR REPLACE FUNCTION delete_architect_projects_safely(
    p_target_project_names TEXT[] DEFAULT ARRAY['Renovação de Hotel Boutique', 'Torre Corporativa Sustentável'],
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_create_backup BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    step_number INTEGER,
    table_name TEXT,
    records_deleted BIGINT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_step_counter INTEGER := 0;
    v_total_deleted BIGINT := 0;
    v_backup_filename TEXT;
    v_start_time TIMESTAMP WITH TIME ZONE := now();
    v_records_in_backup BIGINT;
    v_target_project_ids UUID[];
BEGIN
    -- Validate input parameters
    IF p_target_project_names IS NULL OR array_length(p_target_project_names, 1) = 0 THEN
        RAISE EXCEPTION 'Target project names array cannot be empty';
    END IF;

    -- Get the actual project IDs
    SELECT ARRAY_AGG(DISTINCT id) INTO v_target_project_ids
    FROM projects 
    WHERE name = ANY(p_target_project_names);

    IF v_target_project_ids IS NULL OR array_length(v_target_project_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No projects found with names: %', p_target_project_names;
    END IF;

    -- Create backup if requested
    IF p_create_backup THEN
        v_backup_filename := 'backup_architect_projects_' || to_char(now(), 'YYYY-MM-DD_HH24-MI-SS') || '.sql';
        
        -- Create backup table
        EXECUTE format('CREATE TEMPORARY TABLE backup_architect_projects_%s AS 
            SELECT ''architect_opportunities'' as table_name, id::text, project_name, client_id, created_at
            FROM architect_opportunities 
            WHERE project_name IN (''Renovação Lobby + Restaurante'', ''Comissão Torre Sustentável'')
            UNION ALL
            SELECT ''architect_briefings'', id::text, project_id::text, project_id::text, created_at
            FROM architect_briefings WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_meetings'', id::text, project_id::text, COALESCE(client_id::text, project_id::text), created_at
            FROM architect_meetings WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_site_diary'', id::text, project_id::text, project_id::text, created_at
            FROM architect_site_diary WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_tasks'', id::text, title, project_id::text, created_at
            FROM architect_tasks WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_task_comments'', id::text, task_id::text, user_id::text, created_at
            FROM architect_task_comments WHERE task_id IN (
                SELECT id FROM architect_tasks WHERE project_id = ANY($1)
            )
            UNION ALL
            SELECT ''architect_moodboard_sections'', id::text, name, project_id::text, created_at
            FROM architect_moodboard_sections WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_moodboard_images'', id::text, description, project_id::text, created_at
            FROM architect_moodboard_images WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_moodboard_colors'', id::text, color_name, project_id::text, created_at
            FROM architect_moodboard_colors WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''architect_client_portal_tokens'', id::text, token, project_id::text, created_at
            FROM architect_client_portal_tokens WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''projects'', id::text, name, COALESCE(client_id::text, ''no-client'') as client_id, created_at
            FROM projects WHERE id = ANY($1)
            UNION ALL
            SELECT ''project_documents'', id::text, file_name, project_id::text, uploaded_at
            FROM project_documents WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_photos'', id::text, caption, project_id::text, taken_at
            FROM project_photos WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_budget_items'', id::text, description, project_id::text, created_at
            FROM project_budget_items WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_resources'', id::text, name, project_id::text, created_at
            FROM project_resources WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_materials'', id::text, name, project_id::text, created_at
            FROM project_materials WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_phases'', id::text, name, project_id::text, created_at
            FROM project_phases WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_activities'', id::text, title, project_id::text, created_at
            FROM project_activities WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_milestones'', id::text, title, project_id::text, created_at
            FROM project_milestones WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''project_team_members'', id::text, role, project_id::text, created_at
            FROM project_team_members WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''time_logs'', id::text, description, project_id::text, created_at
            FROM time_logs WHERE project_id = ANY($1)
            UNION ALL
            SELECT ''daily_logs'', id::text, tasks_completed, project_id::text, log_date
            FROM daily_logs WHERE project_id = ANY($1)', 
            to_char(now(), 'YYYYMMDDHH24MISS'), v_target_project_ids);
        
        GET DIAGNOSTICS v_records_in_backup = ROW_COUNT;
        
        RETURN QUERY SELECT 1, 'backup_creation', v_records_in_backup, 'SUCCESS', 
            format('Created backup with % records for % projects', v_records_in_backup, array_length(v_target_project_ids, 1));
    END IF;

    -- Step 1: Delete architect task comments (children of tasks)
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_task_comments', 
            (SELECT COUNT(*) FROM architect_task_comments WHERE task_id IN (
                SELECT id FROM architect_tasks WHERE project_id = ANY(v_target_project_ids)
            )), 'DRY_RUN', 'Would delete task comments';
    ELSE
        DELETE FROM architect_task_comments 
        WHERE task_id IN (
            SELECT id FROM architect_tasks WHERE project_id = ANY(v_target_project_ids)
        );
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_task_comments', v_total_deleted, 'SUCCESS', 
            format('Deleted % task comment records', v_total_deleted);
    END IF;

    -- Step 2: Delete architect tasks
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_tasks', 
            (SELECT COUNT(*) FROM architect_tasks WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete architect tasks';
    ELSE
        DELETE FROM architect_tasks WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_tasks', v_total_deleted, 'SUCCESS', 
            format('Deleted % architect task records', v_total_deleted);
    END IF;

    -- Step 3: Delete architect meetings
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_meetings', 
            (SELECT COUNT(*) FROM architect_meetings WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete architect meetings';
    ELSE
        DELETE FROM architect_meetings WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_meetings', v_total_deleted, 'SUCCESS', 
            format('Deleted % architect meeting records', v_total_deleted);
    END IF;

    -- Step 4: Delete architect briefings
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_briefings', 
            (SELECT COUNT(*) FROM architect_briefings WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete architect briefings';
    ELSE
        DELETE FROM architect_briefings WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_briefings', v_total_deleted, 'SUCCESS', 
            format('Deleted % architect briefing records', v_total_deleted);
    END IF;

    -- Step 5: Delete architect opportunities
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_opportunities', 
            (SELECT COUNT(*) FROM architect_opportunities 
             WHERE project_name IN ('Renovação Lobby + Restaurante', 'Comissão Torre Sustentável')), 
            'DRY_RUN', 'Would delete architect opportunities';
    ELSE
        DELETE FROM architect_opportunities 
        WHERE project_name IN ('Renovação Lobby + Restaurante', 'Comissão Torre Sustentável');
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_opportunities', v_total_deleted, 'SUCCESS', 
            format('Deleted % architect opportunity records', v_total_deleted);
    END IF;

    -- Step 6: Delete moodboard images (children of sections)
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_images', 
            (SELECT COUNT(*) FROM architect_moodboard_images WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete moodboard images';
    ELSE
        DELETE FROM architect_moodboard_images WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_images', v_total_deleted, 'SUCCESS', 
            format('Deleted % moodboard image records', v_total_deleted);
    END IF;

    -- Step 7: Delete moodboard colors
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_colors', 
            (SELECT COUNT(*) FROM architect_moodboard_colors WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete moodboard colors';
    ELSE
        DELETE FROM architect_moodboard_colors WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_colors', v_total_deleted, 'SUCCESS', 
            format('Deleted % moodboard color records', v_total_deleted);
    END IF;

    -- Step 8: Delete moodboard sections
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_sections', 
            (SELECT COUNT(*) FROM architect_moodboard_sections WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete moodboard sections';
    ELSE
        DELETE FROM architect_moodboard_sections WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_moodboard_sections', v_total_deleted, 'SUCCESS', 
            format('Deleted % moodboard section records', v_total_deleted);
    END IF;

    -- Step 9: Delete architect site diary entries
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_site_diary', 
            (SELECT COUNT(*) FROM architect_site_diary WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete site diary entries';
    ELSE
        DELETE FROM architect_site_diary WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_site_diary', v_total_deleted, 'SUCCESS', 
            format('Deleted % site diary records', v_total_deleted);
    END IF;

    -- Step 10: Delete architect client portal tokens
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'architect_client_portal_tokens', 
            (SELECT COUNT(*) FROM architect_client_portal_tokens WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete client portal tokens';
    ELSE
        DELETE FROM architect_client_portal_tokens WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'architect_client_portal_tokens', v_total_deleted, 'SUCCESS', 
            format('Deleted % client portal token records', v_total_deleted);
    END IF;

    -- Step 11: Delete project photos
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_photos', 
            (SELECT COUNT(*) FROM project_photos WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project photos';
    ELSE
        DELETE FROM project_photos WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_photos', v_total_deleted, 'SUCCESS', 
            format('Deleted % project photo records', v_total_deleted);
    END IF;

    -- Step 12: Delete project documents
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_documents', 
            (SELECT COUNT(*) FROM project_documents WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project documents';
    ELSE
        DELETE FROM project_documents WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_documents', v_total_deleted, 'SUCCESS', 
            format('Deleted % project document records', v_total_deleted);
    END IF;

    -- Step 13: Delete project budget items
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_budget_items', 
            (SELECT COUNT(*) FROM project_budget_items WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project budget items';
    ELSE
        DELETE FROM project_budget_items WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_budget_items', v_total_deleted, 'SUCCESS', 
            format('Deleted % project budget item records', v_total_deleted);
    END IF;

    -- Step 14: Delete project resources
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_resources', 
            (SELECT COUNT(*) FROM project_resources WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project resources';
    ELSE
        DELETE FROM project_resources WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_resources', v_total_deleted, 'SUCCESS', 
            format('Deleted % project resource records', v_total_deleted);
    END IF;

    -- Step 15: Delete project materials
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_materials', 
            (SELECT COUNT(*) FROM project_materials WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project materials';
    ELSE
        DELETE FROM project_materials WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_materials', v_total_deleted, 'SUCCESS', 
            format('Deleted % project material records', v_total_deleted);
    END IF;

    -- Step 16: Delete project activities
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_activities', 
            (SELECT COUNT(*) FROM project_activities WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project activities';
    ELSE
        DELETE FROM project_activities WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_activities', v_total_deleted, 'SUCCESS', 
            format('Deleted % project activity records', v_total_deleted);
    END IF;

    -- Step 17: Delete project phases
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_phases', 
            (SELECT COUNT(*) FROM project_phases WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project phases';
    ELSE
        DELETE FROM project_phases WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_phases', v_total_deleted, 'SUCCESS', 
            format('Deleted % project phase records', v_total_deleted);
    END IF;

    -- Step 18: Delete project milestones
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_milestones', 
            (SELECT COUNT(*) FROM project_milestones WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project milestones';
    ELSE
        DELETE FROM project_milestones WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_milestones', v_total_deleted, 'SUCCESS', 
            format('Deleted % project milestone records', v_total_deleted);
    END IF;

    -- Step 19: Delete project team members
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'project_team_members', 
            (SELECT COUNT(*) FROM project_team_members WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete project team members';
    ELSE
        DELETE FROM project_team_members WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'project_team_members', v_total_deleted, 'SUCCESS', 
            format('Deleted % project team member records', v_total_deleted);
    END IF;

    -- Step 20: Delete time logs
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'time_logs', 
            (SELECT COUNT(*) FROM time_logs WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete time logs';
    ELSE
        DELETE FROM time_logs WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'time_logs', v_total_deleted, 'SUCCESS', 
            format('Deleted % time log records', v_total_deleted);
    END IF;

    -- Step 21: Delete daily logs
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'daily_logs', 
            (SELECT COUNT(*) FROM daily_logs WHERE project_id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete daily logs';
    ELSE
        DELETE FROM daily_logs WHERE project_id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'daily_logs', v_total_deleted, 'SUCCESS', 
            format('Deleted % daily log records', v_total_deleted);
    END IF;

    -- Step 22: Delete the main project records (LAST)
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'projects', 
            (SELECT COUNT(*) FROM projects WHERE id = ANY(v_target_project_ids)), 
            'DRY_RUN', 'Would delete main project records';
    ELSE
        DELETE FROM projects WHERE id = ANY(v_target_project_ids);
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'projects', v_total_deleted, 'SUCCESS', 
            format('Deleted % main project records', v_total_deleted);
    END IF;

    -- Step 23: Clean up seed registry entries
    v_step_counter := v_step_counter + 1;
    IF p_dry_run THEN
        RETURN QUERY SELECT v_step_counter, 'seed_data_registry', 
            (SELECT COUNT(*) FROM seed_data_registry 
             WHERE entity_data::text LIKE '%Renovação de Hotel Boutique%'
                OR entity_data::text LIKE '%Torre Corporativa Sustentável%'), 
            'DRY_RUN', 'Would delete seed registry entries';
    ELSE
        DELETE FROM seed_data_registry 
        WHERE entity_data::text LIKE '%Renovação de Hotel Boutique%'
           OR entity_data::text LIKE '%Torre Corporativa Sustentável%';
        GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
        RETURN QUERY SELECT v_step_counter, 'seed_data_registry', v_total_deleted, 'SUCCESS', 
            format('Deleted % seed registry records', v_total_deleted);
    END IF;

    -- Final summary
    v_step_counter := v_step_counter + 1;
    RETURN QUERY SELECT v_step_counter, 'summary', 
        EXTRACT(EPOCH FROM (now() - v_start_time))::BIGINT, 
        CASE WHEN p_dry_run THEN 'DRY_RUN_COMPLETE' ELSE 'DELETION_COMPLETE' END,
        format('Process completed in % seconds. Mode: %. Target projects: %', 
            EXTRACT(EPOCH FROM (now() - v_start_time)), 
            CASE WHEN p_dry_run THEN 'DRY RUN (no data deleted)' ELSE 'LIVE DELETION' END,
            p_target_project_names);

EXCEPTION
    WHEN OTHERS THEN
        v_step_counter := v_step_counter + 1;
        RETURN QUERY SELECT v_step_counter, 'ERROR', 0, 'FAILED', 
            format('Error: %', SQLERRM);
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_architect_projects_safely TO authenticated;

-- Create a helper function to verify deletion results
CREATE OR REPLACE FUNCTION verify_architect_projects_deletion(
    p_target_project_names TEXT[] DEFAULT ARRAY['Renovação de Hotel Boutique', 'Torre Corporativa Sustentável']
)
RETURNS TABLE(
    table_name TEXT,
    remaining_records BIGINT,
    status TEXT
) AS $$
DECLARE
    v_target_project_ids UUID[];
BEGIN
    -- Get the actual project IDs
    SELECT ARRAY_AGG(DISTINCT id) INTO v_target_project_ids
    FROM projects 
    WHERE name = ANY(p_target_project_names);

    RETURN QUERY
    SELECT 'architect_opportunities'::TEXT, 
           COUNT(*)::BIGINT, 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END::TEXT
    FROM architect_opportunities 
    WHERE project_name IN ('Renovação Lobby + Restaurante', 'Comissão Torre Sustentável')
    
    UNION ALL
    
    SELECT 'architect_briefings', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_briefings 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_meetings', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_meetings 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_site_diary', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_site_diary 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_tasks', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_tasks 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_task_comments', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_task_comments 
    WHERE task_id IN (
        SELECT id FROM architect_tasks WHERE project_id = ANY(v_target_project_ids)
    )
    
    UNION ALL
    
    SELECT 'architect_moodboard_sections', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_moodboard_sections 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_moodboard_images', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_moodboard_images 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_moodboard_colors', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_moodboard_colors 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'architect_client_portal_tokens', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM architect_client_portal_tokens 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'projects', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM projects 
    WHERE id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_documents', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_documents 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_photos', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_photos 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_budget_items', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_budget_items 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_resources', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_resources 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_materials', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_materials 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_phases', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_phases 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_activities', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_activities 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_milestones', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_milestones 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'project_team_members', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM project_team_members 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'time_logs', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM time_logs 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'daily_logs', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM daily_logs 
    WHERE project_id = ANY(v_target_project_ids)
    
    UNION ALL
    
    SELECT 'seed_data_registry', 
           COUNT(*), 
           CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'RECORDS_REMAINING' END
    FROM seed_data_registry 
    WHERE entity_data::text LIKE '%Renovação de Hotel Boutique%'
       OR entity_data::text LIKE '%Torre Corporativa Sustentável%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for verification function
GRANT EXECUTE ON FUNCTION verify_architect_projects_deletion TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION delete_architect_projects_safely IS 'Safely deletes architect projects and all related data in proper dependency order. Use p_dry_run=true for testing first.';
COMMENT ON FUNCTION verify_architect_projects_deletion IS 'Verifies that all data related to target projects has been successfully deleted.';
