BEGIN;

-- Additional Roadmap legacy policies not covered in batch 1
DROP POLICY IF EXISTS "authenticated_select_comments" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "authenticated_select_comments_v2" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "authenticated_select_roadmap_item_comments" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.roadmap_item_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.roadmap_item_comments;

DROP POLICY IF EXISTS "authenticated_select_attachments" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "authenticated_select_attachments_v2" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.roadmap_item_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.roadmap_item_attachments;

DROP POLICY IF EXISTS "authenticated_select_upvotes" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "authenticated_select_upvotes_v2" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Authenticated users can upvote" ON public.roadmap_item_upvotes;
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON public.roadmap_item_upvotes;

DROP POLICY IF EXISTS "authenticated_select_roadmap_phases" ON public.roadmap_phases;
DROP POLICY IF EXISTS "authenticated_select_published_releases" ON public.roadmap_releases;

DROP POLICY IF EXISTS "admin_select_roadmap_suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can delete suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can update suggestions" ON public.roadmap_suggestions;

DROP POLICY IF EXISTS "authenticated_select_roadmap_tasks" ON public.roadmap_tasks;

DROP POLICY IF EXISTS "authenticated_insert_task_updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "authenticated_select_roadmap_task_updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "authenticated_select_task_updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS "Authenticated users can create updates" ON public.roadmap_task_updates;

-- Schedule Events remaining legacy policies
DROP POLICY IF EXISTS "Admins can insert records" ON public.schedule_events;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.schedule_events;
DROP POLICY IF EXISTS "Clients can view schedule events via token" ON public.schedule_events;
DROP POLICY IF EXISTS "Project managers can manage schedule" ON public.schedule_events;
DROP POLICY IF EXISTS "Team members can view schedule" ON public.schedule_events;

-- Sprints and Snapshots
DROP POLICY IF EXISTS "Admins and PMs can view sprint snapshots" ON public.sprint_items_snapshot;
DROP POLICY IF EXISTS "admin_select_sprint_snapshots" ON public.sprint_items_snapshot;
DROP POLICY IF EXISTS "Admins and PMs can view sprints" ON public.sprints;
DROP POLICY IF EXISTS "Admins can delete sprints" ON public.sprints;
DROP POLICY IF EXISTS "Admins can insert records" ON public.sprints;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "admin_select_sprints" ON public.sprints;

-- Site Activity/Issues
DROP POLICY IF EXISTS "Admins can delete activity logs" ON public.site_activity_logs;
DROP POLICY IF EXISTS "Supervisors and admins can insert activity logs" ON public.site_activity_logs;
DROP POLICY IF EXISTS "Supervisors can update their own activity logs" ON public.site_activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs for accessible projects" ON public.site_activity_logs;

DROP POLICY IF EXISTS "Admins can delete issues" ON public.site_issues;
DROP POLICY IF EXISTS "Admins can insert records" ON public.site_issues;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.site_issues;
DROP POLICY IF EXISTS "Reporters and assigned users can update issues" ON public.site_issues;
DROP POLICY IF EXISTS "Supervisors and team members can report issues" ON public.site_issues;
DROP POLICY IF EXISTS "Users can view issues for accessible projects" ON public.site_issues;

-- Suppliers remaining legacy names
DROP POLICY IF EXISTS "Admins and PMs can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and PMs can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert records" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_delete_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_insert_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "authenticated_select_suppliers" ON public.suppliers;

-- Users & Roles duplicates
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;

DROP POLICY IF EXISTS "Admins can delete any roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert any roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles or admins/pms can view all" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles_or_admin" ON public.user_roles;

-- Voice & Tickets & Troubleshooting
DROP POLICY IF EXISTS "Users can create recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can view own recordings" ON public.voice_recordings;

DROP POLICY IF EXISTS "Admins can view all transcriptions" ON public.voice_transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions" ON public.voice_transcriptions;
DROP POLICY IF EXISTS "Users can view own transcriptions" ON public.voice_transcriptions;

DROP POLICY IF EXISTS "Allow insert for authenticated users only" ON public.tickets;
DROP POLICY IF EXISTS "Allow user to select own ticket" ON public.tickets;

DROP POLICY IF EXISTS "authenticated_select_troubleshooting_entries" ON public.troubleshooting_entries;

COMMIT;
