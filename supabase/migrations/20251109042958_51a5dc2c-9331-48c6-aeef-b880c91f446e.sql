-- ============================================================================
-- FINAL RLS POLICY REMEDIATION
-- Fixes remaining permissive policies with proper access controls
-- ============================================================================

-- ============================================================================
-- ACTIVITY RESOURCE ASSIGNMENTS (Project-Scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view resource assignments" ON public.activity_resource_assignments;

-- Users can view resource assignments for accessible projects
DROP POLICY IF EXISTS "Users can view resource assignments for accessible projects" ON public.activity_resource_assignments;
CREATE POLICY "Users can view resource assignments for accessible projects"
  ON public.activity_resource_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_activities pa
      WHERE pa.id = activity_resource_assignments.activity_id
      AND has_project_access(auth.uid(), pa.project_id)
    )
  );

-- ============================================================================
-- COST PREDICTIONS (Project-Scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view cost predictions" ON public.cost_predictions;

-- Users can view cost predictions for accessible projects
DROP POLICY IF EXISTS "Users can view cost predictions for accessible projects" ON public.cost_predictions;
CREATE POLICY "Users can view cost predictions for accessible projects"
  ON public.cost_predictions
  FOR SELECT
  USING (
    project_id IS NULL OR has_project_access(auth.uid(), project_id)
  );

-- Update existing insert policy to ensure project access
DROP POLICY IF EXISTS "Authenticated users can insert predictions" ON public.cost_predictions;
DROP POLICY IF EXISTS "Users can insert predictions for accessible projects" ON public.cost_predictions;

CREATE POLICY "Users can insert predictions for accessible projects"
  ON public.cost_predictions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (project_id IS NULL OR has_project_access(auth.uid(), project_id))
  );

-- Admins and PMs can update/delete predictions
DROP POLICY IF EXISTS "Admins can manage cost predictions" ON public.cost_predictions;
CREATE POLICY "Admins can manage cost predictions"
  ON public.cost_predictions
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'project_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'project_manager')
  );

-- ============================================================================
-- EXCHANGE RATES (Public Reference Data - Authenticated Read, Admin Write)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;

-- All authenticated users can view exchange rates (reference data)
CREATE POLICY "Authenticated users can view exchange rates"
  ON public.exchange_rates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE public.activity_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view resource assignments for accessible projects" ON public.activity_resource_assignments IS 
  'Users can only view resource assignments for project activities they have access to';

COMMENT ON POLICY "Users can view cost predictions for accessible projects" ON public.cost_predictions IS 
  'Users can only view cost predictions for projects they have access to';

COMMENT ON POLICY "Authenticated users can view exchange rates" ON public.exchange_rates IS 
  'Exchange rates are reference data - all authenticated users can view';
