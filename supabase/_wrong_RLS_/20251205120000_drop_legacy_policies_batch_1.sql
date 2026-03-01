BEGIN;

-- Schedule Events legacy policies
DROP POLICY IF EXISTS "Admins can insert records" ON public.schedule_events;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.schedule_events;
DROP POLICY IF EXISTS "Clients can view schedule events via token" ON public.schedule_events;
DROP POLICY IF EXISTS "Project managers can manage schedule" ON public.schedule_events;
DROP POLICY IF EXISTS "Team members can view schedule" ON public.schedule_events;

-- Roadmap Items legacy policies
DROP POLICY IF EXISTS "Admins can delete roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can insert records" ON public.roadmap_items;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can insert roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Authenticated users can view roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS "Roadmap items select - owner or admin" ON public.roadmap_items;
DROP POLICY IF EXISTS "Roadmap items update - owner or admin" ON public.roadmap_items;
DROP POLICY IF EXISTS "Users can delete their own roadmap items" ON public.roadmap_items;
DROP POLICY IF EXISTS authenticated_insert_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items ON public.roadmap_items;
DROP POLICY IF EXISTS authenticated_select_roadmap_items_v2 ON public.roadmap_items;

-- Roadmap Phases/Releases legacy policies
DROP POLICY IF EXISTS authenticated_select_roadmap_phases ON public.roadmap_phases;
DROP POLICY IF EXISTS authenticated_select_published_releases ON public.roadmap_releases;

-- Roadmap Suggestions legacy policies
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can delete suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS "Authenticated users can update suggestions" ON public.roadmap_suggestions;
DROP POLICY IF EXISTS admin_select_roadmap_suggestions ON public.roadmap_suggestions;

-- Roadmap Task Updates legacy policies
DROP POLICY IF EXISTS "Authenticated users can create updates" ON public.roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_insert_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_roadmap_task_updates ON public.roadmap_task_updates;
DROP POLICY IF EXISTS authenticated_select_task_updates ON public.roadmap_task_updates;

-- Roadmap Tasks legacy policies
DROP POLICY IF EXISTS authenticated_select_roadmap_tasks ON public.roadmap_tasks;

-- Suppliers legacy policies
DROP POLICY IF EXISTS "Admins and PMs can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and PMs can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert records" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS authenticated_delete_suppliers ON public.suppliers;
DROP POLICY IF EXISTS authenticated_insert_suppliers ON public.suppliers;
DROP POLICY IF EXISTS authenticated_select_suppliers ON public.suppliers;

-- SINAPI legacy policies
DROP POLICY IF EXISTS "Admins can delete catalog items" ON public.sinapi_catalog;
DROP POLICY IF EXISTS "Admins can insert catalog items" ON public.sinapi_catalog;
DROP POLICY IF EXISTS "Authenticated users can view catalog" ON public.sinapi_catalog;
DROP POLICY IF EXISTS authenticated_delete_sinapi_items ON public.sinapi_catalog;
DROP POLICY IF EXISTS authenticated_insert_sinapi_items ON public.sinapi_catalog;
DROP POLICY IF EXISTS authenticated_select_sinapi_catalog ON public.sinapi_catalog;

-- Reminder logs legacy policies
DROP POLICY IF EXISTS "Project members can view reminder_logs" ON public.reminder_logs;

-- Time logs legacy policies
DROP POLICY IF EXISTS "Admins can insert records" ON public.time_logs;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.time_logs;
DROP POLICY IF EXISTS "Users can create time logs for their projects" ON public.time_logs;
DROP POLICY IF EXISTS "Users can delete their own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can update their own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can view time logs for their projects" ON public.time_logs;

COMMIT;
