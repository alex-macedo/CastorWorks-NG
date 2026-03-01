-- Harden RLS for architect_client_portal_tokens
BEGIN;

ALTER TABLE IF EXISTS architect_client_portal_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'architect_client_portal_tokens'
  ) THEN
    DROP POLICY IF EXISTS "Users can view architect portal tokens" ON architect_client_portal_tokens;
    DROP POLICY IF EXISTS "Users can create architect portal tokens" ON architect_client_portal_tokens;
    DROP POLICY IF EXISTS "Users can update architect portal tokens" ON architect_client_portal_tokens;
    DROP POLICY IF EXISTS "Users can delete architect portal tokens" ON architect_client_portal_tokens;
  END IF;
END$$;

CREATE POLICY "Only project managers can view architect portal tokens"
  ON architect_client_portal_tokens FOR SELECT
  USING (can_manage_architect_portal_token(project_id));

CREATE POLICY "Only project managers can create architect portal tokens"
  ON architect_client_portal_tokens FOR INSERT
  WITH CHECK (can_manage_architect_portal_token(project_id));

CREATE POLICY "Only project managers can update architect portal tokens"
  ON architect_client_portal_tokens FOR UPDATE
  USING (can_manage_architect_portal_token(project_id))
  WITH CHECK (can_manage_architect_portal_token(project_id));

CREATE POLICY "Only project managers can delete architect portal tokens"
  ON architect_client_portal_tokens FOR DELETE
  USING (can_manage_architect_portal_token(project_id));

COMMIT;
