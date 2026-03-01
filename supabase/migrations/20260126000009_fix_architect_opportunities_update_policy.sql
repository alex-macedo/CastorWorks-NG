BEGIN;

-- Fix architect_opportunities_update policy to allow updates for users with project access
-- The current policy only allows creators to update, but SELECT policy allows creators OR users with project access
-- This mismatch causes updates to be silently blocked by RLS even when the user has project access

DROP POLICY IF EXISTS architect_opportunities_update ON public.architect_opportunities;

CREATE POLICY architect_opportunities_update
  ON public.architect_opportunities
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE p.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM projects p
      JOIN client_project_access cpa ON cpa.project_id = p.id
      WHERE p.client_id = architect_opportunities.client_id
        AND has_project_access(auth.uid(), p.id)
    )
  );

COMMIT;
