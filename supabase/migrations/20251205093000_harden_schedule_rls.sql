-- Harden RLS for schedule_scenarios and scenario_activities
BEGIN;

-- schedule_scenarios
ALTER TABLE IF EXISTS schedule_scenarios ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'schedule_scenarios'
  ) THEN
    DROP POLICY IF EXISTS "Project members can view scenarios" ON schedule_scenarios;
    DROP POLICY IF EXISTS "project_scoped_select_scenarios" ON schedule_scenarios;
  END IF;
END$$;

CREATE POLICY "Project-based select scenarios"
  ON schedule_scenarios FOR SELECT
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based insert scenarios"
  ON schedule_scenarios FOR INSERT
  WITH CHECK (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based update scenarios"
  ON schedule_scenarios FOR UPDATE
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Project-based delete scenarios"
  ON schedule_scenarios FOR DELETE
  USING (has_project_access(auth.uid(), project_id) OR has_role(auth.uid(), 'admin'));

-- scenario_activities
ALTER TABLE IF EXISTS scenario_activities ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scenario_activities'
  ) THEN
    DROP POLICY IF EXISTS "Project members can view scenario activities" ON scenario_activities;
    DROP POLICY IF EXISTS "authenticated_select_scenario_activities" ON scenario_activities;
  END IF;
END$$;

CREATE POLICY "Project-based select scenario activities"
  ON scenario_activities FOR SELECT
  USING (
    has_project_access(
      auth.uid(),
      (SELECT ss.project_id FROM schedule_scenarios ss WHERE ss.id = scenario_activities.scenario_id)
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Project-based insert scenario activities"
  ON scenario_activities FOR INSERT
  WITH CHECK (
    has_project_access(
      auth.uid(),
      (SELECT ss.project_id FROM schedule_scenarios ss WHERE ss.id = scenario_activities.scenario_id)
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Project-based update scenario activities"
  ON scenario_activities FOR UPDATE
  USING (
    has_project_access(
      auth.uid(),
      (SELECT ss.project_id FROM schedule_scenarios ss WHERE ss.id = scenario_activities.scenario_id)
    )
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    has_project_access(
      auth.uid(),
      (SELECT ss.project_id FROM schedule_scenarios ss WHERE ss.id = scenario_activities.scenario_id)
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Project-based delete scenario activities"
  ON scenario_activities FOR DELETE
  USING (
    has_project_access(
      auth.uid(),
      (SELECT ss.project_id FROM schedule_scenarios ss WHERE ss.id = scenario_activities.scenario_id)
    )
    OR has_role(auth.uid(), 'admin')
  );

COMMIT;
