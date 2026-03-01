-- ============================================================================
-- FORCE CLEANUP - Remove ALL Old Permissive Policies
-- This aggressively drops all old policies that have USING (true) or WITH CHECK (true)
-- ============================================================================

-- ============================================================================
-- INTEGRATION SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view integration settings" ON public.integration_settings CASCADE;

-- ============================================================================
-- PROJECT BENCHMARKS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view benchmarks" ON public.project_benchmarks CASCADE;

-- ============================================================================
-- PROJECT MATERIALS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON public.project_materials CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.project_materials CASCADE;

-- ============================================================================
-- PROJECT PHASES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage project phases" ON public.project_phases CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view project phases" ON public.project_phases CASCADE;

-- ============================================================================
-- PROJECT PHOTOS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view project photos" ON public.project_photos CASCADE;

-- ============================================================================
-- PROJECT PURCHASE REQUESTS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage purchase requests" ON public.project_purchase_requests CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view purchase requests" ON public.project_purchase_requests CASCADE;

-- ============================================================================
-- PROJECT RESOURCES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view project resources" ON public.project_resources CASCADE;

-- ============================================================================
-- PROJECT TEAM MEMBERS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.project_team_members CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.project_team_members CASCADE;

-- ============================================================================
-- PURCHASE REQUEST ITEMS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage purchase items" ON public.purchase_request_items CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view purchase items" ON public.purchase_request_items CASCADE;

-- ============================================================================
-- QUOTES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON public.quotes CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes CASCADE;

-- ============================================================================
-- ROADMAP ITEM ATTACHMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view attachments" ON public.roadmap_item_attachments CASCADE;

-- ============================================================================
-- ROADMAP ITEM COMMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view comments" ON public.roadmap_item_comments CASCADE;

-- ============================================================================
-- ROADMAP ITEM UPVOTES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view upvotes" ON public.roadmap_item_upvotes CASCADE;

-- ============================================================================
-- ROADMAP ITEMS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view roadmap items" ON public.roadmap_items CASCADE;

-- ============================================================================
-- ROADMAP PHASES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view roadmap phases" ON public.roadmap_phases CASCADE;

-- ============================================================================
-- ROADMAP SUGGESTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view suggestions" ON public.roadmap_suggestions CASCADE;

-- ============================================================================
-- ROADMAP TASK UPDATES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view task updates" ON public.roadmap_task_updates CASCADE;

-- ============================================================================
-- ROADMAP TASKS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view roadmap tasks" ON public.roadmap_tasks CASCADE;

-- ============================================================================
-- SCENARIO ACTIVITIES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view scenario activities" ON public.scenario_activities CASCADE;

-- ============================================================================
-- SCHEDULE SCENARIOS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view scenarios" ON public.schedule_scenarios CASCADE;

-- ============================================================================
-- SINAPI CATALOG
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can delete SINAPI items" ON public.sinapi_catalog CASCADE;
DROP POLICY IF EXISTS "Anyone can insert SINAPI items" ON public.sinapi_catalog CASCADE;
DROP POLICY IF EXISTS "Anyone can update SINAPI items" ON public.sinapi_catalog CASCADE;
DROP POLICY IF EXISTS "Anyone can view SINAPI catalog" ON public.sinapi_catalog CASCADE;

-- ============================================================================
-- SPRINT ITEMS SNAPSHOT
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view sprint snapshots" ON public.sprint_items_snapshot CASCADE;

-- ============================================================================
-- SPRINTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view sprints" ON public.sprints CASCADE;

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers CASCADE;

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can insert user preferences" ON public.user_preferences CASCADE;
DROP POLICY IF EXISTS "Anyone can update user preferences" ON public.user_preferences CASCADE;
DROP POLICY IF EXISTS "Anyone can view user preferences" ON public.user_preferences CASCADE;

-- ============================================================================
-- USER PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.user_profiles CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- This comment serves as a verification point
COMMENT ON SCHEMA public IS 'All old permissive RLS policies have been forcefully removed';