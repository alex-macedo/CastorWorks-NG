-- ============================================================================
-- CastorWorks Architect Projects Data Cleanup - Identification Phase (Corrected)
-- Created: 2025-01-30
-- Description: Identify all data related to target projects for deletion
-- Target Projects: All instances of "Renovação de Hotel Boutique" and "Torre Corporativa Sustentável"
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
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_meetings' as table_name, 
    id::text, 
    project_id::text as project_name, 
    COALESCE(client_id::text, project_id::text) as client_id,
    created_at
FROM architect_meetings 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_site_diary' as table_name, 
    id::text, 
    project_id::text as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_site_diary 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_tasks' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_tasks 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_task_comments' as table_name, 
    id::text, 
    task_id::text as project_name, 
    user_id::text as client_id,
    created_at
FROM architect_task_comments 
WHERE task_id IN (
    SELECT id FROM architect_tasks WHERE project_id IN (
        SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
    )
)

UNION ALL

SELECT 
    'architect_moodboard_sections' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_sections 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_moodboard_images' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_images 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_moodboard_colors' as table_name, 
    id::text, 
    color_name as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_moodboard_colors 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'architect_client_portal_tokens' as table_name, 
    id::text, 
    token as project_name, 
    project_id::text as client_id,
    created_at
FROM architect_client_portal_tokens 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'projects' as table_name, 
    id::text, 
    name as project_name, 
    COALESCE(client_id::text, 'no-client') as client_id,
    created_at
FROM projects 
WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')

UNION ALL

SELECT 
    'project_documents' as table_name, 
    id::text, 
    file_name as project_name, 
    project_id::text as client_id,
    uploaded_at as created_at
FROM project_documents 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_photos' as table_name, 
    id::text, 
    caption as project_name, 
    project_id::text as client_id,
    taken_at as created_at
FROM project_photos 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_budget_items' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM project_budget_items 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_resources' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_resources 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_materials' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_materials 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_phases' as table_name, 
    id::text, 
    name as project_name, 
    project_id::text as client_id,
    created_at
FROM project_phases 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_activities' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM project_activities 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_milestones' as table_name, 
    id::text, 
    title as project_name, 
    project_id::text as client_id,
    created_at
FROM project_milestones 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'project_team_members' as table_name, 
    id::text, 
    role as project_name, 
    project_id::text as client_id,
    created_at
FROM project_team_members 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'time_logs' as table_name, 
    id::text, 
    description as project_name, 
    project_id::text as client_id,
    created_at
FROM time_logs 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
)

UNION ALL

SELECT 
    'daily_logs' as table_name, 
    id::text, 
    tasks_completed as project_name, 
    project_id::text as client_id,
    log_date as created_at
FROM daily_logs 
WHERE project_id IN (
    SELECT id FROM projects WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
);

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
WHERE c.id IN (
    SELECT DISTINCT client_id FROM projects 
    WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
    AND client_id IS NOT NULL
);

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
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável')
ORDER BY p.created_at;

-- Check for any seed registry entries
SELECT 
    'seed_data_registry' as table_name,
    COUNT(*) as record_count
FROM seed_data_registry 
WHERE entity_data::text LIKE '%Renovação de Hotel Boutique%'
   OR entity_data::text LIKE '%Torre Corporativa Sustentável%';

-- Show the actual project IDs that will be used for deletion
SELECT 
    'TARGET PROJECT IDS' as info,
    id::text as project_id,
    name as project_name
FROM projects 
WHERE name IN ('Renovação de Hotel Boutique', 'Torre Corporativa Sustentável');
