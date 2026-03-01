-- ============================================================================
-- FINAL CLEANUP - Remove Old Permissive Policies
-- This removes any old policies that weren't dropped properly
-- ============================================================================

-- Sprint tables
DROP POLICY IF EXISTS "Anyone can view sprint snapshots" ON public.sprint_items_snapshot;
DROP POLICY IF EXISTS "Admins and PMs can view sprint snapshots" ON public.sprint_items_snapshot;
DROP POLICY IF EXISTS "Anyone can view sprints" ON public.sprints;
DROP POLICY IF EXISTS "Admins and PMs can view sprints" ON public.sprints;

CREATE POLICY "Admins and PMs can view sprint snapshots"
  ON public.sprint_items_snapshot
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Admins and PMs can view sprints"
  ON public.sprints
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'project_manager')
  );

-- User preferences
DROP POLICY IF EXISTS "Anyone can insert user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can update user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can view user preferences" ON public.user_preferences;

-- Suppliers - keep existing secure policies
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

-- User profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.user_profiles;

-- Enable RLS
ALTER TABLE public.sprint_items_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
