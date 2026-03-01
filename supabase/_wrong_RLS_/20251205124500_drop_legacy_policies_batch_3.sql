-- Batch 3: Drop remaining legacy/permissive RLS policies detected by scanner
-- Note: Use IF EXISTS to avoid failures if already removed

BEGIN;

-- quotes
DROP POLICY IF EXISTS project_scoped_update_quotes ON quotes;
DROP POLICY IF EXISTS project_scoped_delete_quotes ON quotes;
DROP POLICY IF EXISTS project_scoped_insert_quotes ON quotes;
DROP POLICY IF EXISTS project_scoped_select_quotes ON quotes;

-- reminder_logs
DROP POLICY IF EXISTS "Project members can view reminder_logs" ON reminder_logs;

-- roadmap_item_attachments
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON roadmap_item_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON roadmap_item_attachments;
DROP POLICY IF EXISTS authenticated_select_attachments ON roadmap_item_attachments;
DROP POLICY IF EXISTS authenticated_select_attachments_v2 ON roadmap_item_attachments;

-- roadmap_item_comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON roadmap_item_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON roadmap_item_comments;
DROP POLICY IF EXISTS authenticated_select_comments ON roadmap_item_comments;
DROP POLICY IF EXISTS authenticated_select_comments_v2 ON roadmap_item_comments;
DROP POLICY IF EXISTS authenticated_select_roadmap_item_comments ON roadmap_item_comments;

-- roadmap_item_upvotes
DROP POLICY IF EXISTS "Authenticated users can upvote" ON roadmap_item_upvotes;
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON roadmap_item_upvotes;
DROP POLICY IF EXISTS authenticated_select_upvotes ON roadmap_item_upvotes;
DROP POLICY IF EXISTS authenticated_select_upvotes_v2 ON roadmap_item_upvotes;

-- roadmap_items
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Admins can insert records" ON roadmap_items;
DROP POLICY IF EXISTS "Admins can manage all records" ON roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can insert roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can view roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Roadmap items select - owner or admin" ON roadmap_items;
DROP POLICY IF EXISTS "Roadmap items update - owner or admin" ON roadmap_items;
DROP POLICY IF EXISTS "Users can delete their own roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Users can update their own roadmap items or admins can update a" ON roadmap_items;
DROP POLICY IF EXISTS authenticated_insert_roadmap_items ON roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items ON roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items_v2 ON roadmap_items;

-- roadmap_phases
DROP POLICY IF EXISTS authenticated_select_roadmap_phases ON roadmap_phases;

-- roadmap_releases
DROP POLICY IF EXISTS authenticated_select_published_releases ON roadmap_releases;

-- roadmap_suggestions
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can delete suggestions" ON roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can update suggestions" ON roadmap_suggestions;
DROP POLICY IF EXISTS admin_select_roadmap_suggestions ON roadmap_suggestions;

-- roadmap_task_updates
DROP POLICY IF EXISTS "Authenticated users can create updates" ON roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_insert_task_updates ON roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_roadmap_task_updates ON roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_task_updates ON roadmap_task_updates;

-- roadmap_tasks
DROP POLICY IF EXISTS authenticated_select_roadmap_tasks ON roadmap_tasks;

-- scenario_activities
DROP POLICY IF EXISTS "Project members can view scenario activities" ON scenario_activities;
DROP POLICY IF EXISTS authenticated_select_scenario_activities ON scenario_activities;

-- schedule_events
DROP POLICY IF EXISTS "Admins can insert records" ON schedule_events;
DROP POLICY IF EXISTS "Admins can manage all records" ON schedule_events;
DROP POLICY IF EXISTS "Clients can view schedule events via token" ON schedule_events;
DROP POLICY IF EXISTS "Project managers can manage schedule" ON schedule_events;
DROP POLICY IF EXISTS "Team members can view schedule" ON schedule_events;

-- schedule_scenarios
DROP POLICY IF EXISTS "Project members can view scenarios" ON schedule_scenarios;
DROP POLICY IF EXISTS project_scoped_select_scenarios ON schedule_scenarios;

-- scheduled_maintenance
DROP POLICY IF EXISTS "Admins can view scheduled maintenance" ON scheduled_maintenance;

-- security_events
DROP POLICY IF EXISTS "Admins can view all security events" ON security_events;
DROP POLICY IF EXISTS "System can insert security events" ON security_events;

-- seed_data_registry
DROP POLICY IF EXISTS "Admins can insert records" ON seed_data_registry;
DROP POLICY IF EXISTS "Admins can manage all records" ON seed_data_registry;

-- sinapi_catalog
DROP POLICY IF EXISTS "Admins can delete catalog items" ON sinapi_catalog;
DROP POLICY IF EXISTS "Admins can insert catalog items" ON sinapi_catalog;
DROP POLICY IF EXISTS "Authenticated users can view catalog" ON sinapi_catalog;
DROP POLICY IF EXISTS authenticated_delete_sinapi_items ON sinapi_catalog;
DROP POLICY IF EXISTS authenticated_insert_sinapi_items ON sinapi_catalog;
DROP POLICY IF EXISTS authenticated_select_sinapi_catalog ON sinapi_catalog;

-- site_activity_logs
DROP POLICY IF EXISTS "Admins can delete activity logs" ON site_activity_logs;
DROP POLICY IF EXISTS "Supervisors and admins can insert activity logs" ON site_activity_logs;
DROP POLICY IF EXISTS "Supervisors can update their own activity logs" ON site_activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs for accessible projects" ON site_activity_logs;

-- site_issues
DROP POLICY IF EXISTS "Admins can delete issues" ON site_issues;
DROP POLICY IF EXISTS "Admins can insert records" ON site_issues;
DROP POLICY IF EXISTS "Admins can manage all records" ON site_issues;
DROP POLICY IF EXISTS "Reporters and assigned users can update issues" ON site_issues;
DROP POLICY IF EXISTS "Supervisors and team members can report issues" ON site_issues;
DROP POLICY IF EXISTS "Users can view issues for accessible projects" ON site_issues;

-- sprint_items_snapshot
DROP POLICY IF EXISTS "Admins and PMs can view sprint snapshots" ON sprint_items_snapshot;
DROP POLICY IF EXISTS admin_select_sprint_snapshots ON sprint_items_snapshot;

-- sprints
DROP POLICY IF EXISTS "Admins and PMs can view sprints" ON sprints;
DROP POLICY IF EXISTS "Admins can delete sprints" ON sprints;
DROP POLICY IF EXISTS "Admins can insert records" ON sprints;
DROP POLICY IF EXISTS "Admins can manage all records" ON sprints;
DROP POLICY IF EXISTS "Authenticated users can create sprints" ON sprints;
DROP POLICY IF EXISTS "Authenticated users can update sprints" ON sprints;
DROP POLICY IF EXISTS admin_select_sprints ON sprints;

-- suppliers
DROP POLICY IF EXISTS "Admins and PMs can delete suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins and PMs can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can insert records" ON suppliers;
DROP POLICY IF EXISTS "Admins can manage all records" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS authenticated_delete_suppliers ON suppliers;
DROP POLICY IF EXISTS authenticated_insert_suppliers ON suppliers;
DROP POLICY IF EXISTS authenticated_select_suppliers ON suppliers;

-- tickets
DROP POLICY IF EXISTS "Allow insert for authenticated users only" ON tickets;
DROP POLICY IF EXISTS "Allow user to select own ticket" ON tickets;

-- time_logs
DROP POLICY IF EXISTS "Admins can insert records" ON time_logs;
DROP POLICY IF EXISTS "Admins can manage all records" ON time_logs;
DROP POLICY IF EXISTS "Users can create time logs for their projects" ON time_logs;
DROP POLICY IF EXISTS "Users can delete their own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update their own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can view time logs for their projects" ON time_logs;

-- troubleshooting_entries
DROP POLICY IF EXISTS authenticated_select_troubleshooting_entries ON troubleshooting_entries;

-- user_preferences
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;

-- user_profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS user_insert_own_profile ON user_profiles;
DROP POLICY IF EXISTS user_profiles_select_policy ON user_profiles;

-- user_roles
DROP POLICY IF EXISTS "Admins can delete any roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert any roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles or admins/pms can view all" ON user_roles;
DROP POLICY IF EXISTS users_view_own_roles_or_admin ON user_roles;

-- voice_recordings
DROP POLICY IF EXISTS "Users can create recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON voice_recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON voice_recordings;

-- voice_transcriptions
DROP POLICY IF EXISTS "Admins can view all transcriptions" ON voice_transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions" ON voice_transcriptions;
DROP POLICY IF EXISTS "Users can view own transcriptions" ON voice_transcriptions;

COMMIT;
