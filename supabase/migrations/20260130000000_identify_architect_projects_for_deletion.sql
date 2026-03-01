-- ============================================================================
-- CastorWorks Architect Projects Data Cleanup - Identification Phase
-- Created: 2025-01-30
-- Description: Identify all data related to target projects for deletion
-- Target Projects: project-01 (Renovação de Hotel Boutique), project-02 (Torre Corporativa Sustentável)
-- ============================================================================

-- Create a temporary table to store all records that will be deleted
CREATE TEMPORARY TABLE deletion_audit AS
SELECT 
    'architect_opportunities' as table_name, 
    id::text, 
    project_name, 
    client_id,
    created_at
FROM architect_opportunities 
WHERE project_name IN ('Renovação Lobby + Restaurante', 'Comissão Torre Sustentável')

UNION ALL

SELECT 
    'architect_briefings' as table_name, 
    id::text, 
    project_id::text as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_briefings 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_meetings' as table_name, 
    id::text, 
    project_id::text as project_name, 
    COALESCE(client_id::text, project_id::text) as client_id,
    created_at
FROM architect_meetings 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_site_diary' as table_name, 
    id::text, 
    project_id::text as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_site_diary 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_tasks' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_tasks 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_task_comments' as table_name, 
    id::text, 
    task_id::text as project_name, 
    user_id::text as client_id,
    created_at
FROM architect_task_comments 
WHERE task_id IN (
    SELECT id FROM architect_tasks WHERE project_id IN ('project-01', 'project-02')
)

UNION ALL

SELECT 
    'architect_moodboard_sections' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_sections 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_moodboard_images' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_images 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_moodboard_colors' as table_name, 
    id::text, 
    color_name as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_colors 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'architect_client_portal_tokens' as table_name, 
    id::text, 
    token as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_client_portal_tokens 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'projects' as table_name, 
    id::text, 
    name as project_name, 
    client_id::text,
    created_at
FROM projects 
WHERE id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_documents' as table_name, 
    id::text, 
    file_name as project_name, 
    project_id::text as client_id,
    uploaded_at as created_at
FROM project_documents 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_photos' as table_name, 
    id::text, 
    caption as project_name, 
    project_id::text as client_id,
    taken_at as created_at
FROM project_photos 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_budget_items' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM project_budget_items 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_resources' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_resources 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_materials' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_materials 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_phases' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_phases 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_activities' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM project_activities 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_milestones' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM project_milestones 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'project_team_members' as table_name, 
    id::text, 
    role as project_name, 
    project_id::text as client_id,
    created_at
FROM project_team_members 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'time_logs' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM time_logs 
WHERE project_id IN ('project-01', 'project-02')

UNION ALL

SELECT 
    'daily_logs' as table_name, 
    id::text, 
    tasks_completed as project_name, 
    project_id::text as client_id,
    log_date as created_at
FROM daily_logs 
WHERE project_id IN ('project-01', 'project-02');

-- Display summary of records to be deleted
SELECT 
    table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM deletion_audit
GROUP BY table_name
ORDER BY table_name;

-- Display total count
SELECT 
    'TOTAL RECORDS TO DELETE' as table_name,
    COUNT(*) as record_count,
    NULL as earliest_record,
    NULL as latest_record
FROM deletion_audit;

-- Create backup table with all data (for safety)
CREATE TABLE backup_architect_projects_deletion AS 
SELECT * FROM deletion_audit;

-- Show client information for reference
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.company_name,
    c.email,
    c.status
FROM clients c
WHERE c.id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002');

-- Show project information for reference
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status,
    p.client_id,
    c.name as client_name,
    p.created_at,
    p.start_date
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE p.id IN ('project-01', 'project-02');

-- Check for any seed registry entries
SELECT 
    'seed_data_registry' as table_name,
    COUNT(*) as record_count
FROM seed_data_registry 
WHERE entity_id IN ('project-01', 'project-02')
   OR entity_data::text LIKE '%project-01%'
   OR entity_data::text LIKE '%project-02%'
   OR entity_data::text LIKE '%Renovação de Hotel Boutique%'
   OR entity_data::text LIKE '%Torre Corporativa Sustentável%';

-- Create detailed report for each table
DO $$
DECLARE
    table_record RECORD;
    sql_query TEXT;
BEGIN
    RAISE NOTICE '=== DETAILED IDENTIFICATION REPORT ===';
    
    FOR table_record IN 
        SELECT DISTINCT table_name FROM deletion_audit ORDER BY table_name
    LOOP
        RAISE NOTICE '--- Table: % ---', table_record.table_name;
        
        CASE table_record.table_name
            WHEN 'architect_opportunities' THEN
                sql_query := 'SELECT id, project_name, client_id, stage, estimated_value, created_at FROM architect_opportunities WHERE project_name IN (''Renovação Lobby + Restaurante'', ''Comissão Torre Sustentável'') ORDER BY created_at;';
            WHEN 'architect_briefings' THEN
                sql_query := 'SELECT id, project_id, client_objectives, budget_range_min, budget_range_max, created_at FROM architect_briefings WHERE project_id IN (''project-01'', ''project-02'') ORDER BY created_at;';
            WHEN 'projects' THEN
                sql_query := 'SELECT id, name, status, client_id, budget_total, created_at FROM projects WHERE id IN (''project-01'', ''project-02'') ORDER BY created_at;';
            ELSE
                CONTINUE;
        END CASE;
        
        EXECUTE sql_query;
    END LOOP;
    
    RAISE NOTICE '=== END OF REPORT ===';
END $$;
