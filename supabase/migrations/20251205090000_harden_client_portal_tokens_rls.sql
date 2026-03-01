-- Harden RLS for client_portal_tokens
BEGIN;

-- Ensure RLS enabled
ALTER TABLE IF EXISTS client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_portal_tokens'
  ) THEN
    DROP POLICY IF EXISTS "Users can view tokens for their projects" ON client_portal_tokens;
    DROP POLICY IF EXISTS "Users can create tokens" ON client_portal_tokens;
    DROP POLICY IF EXISTS "Users can update tokens" ON client_portal_tokens;
    DROP POLICY IF EXISTS "Users can delete tokens" ON client_portal_tokens;
  END IF;
END$$;

-- Secure policies using helper function
CREATE POLICY "Only project managers can view portal tokens"
  ON client_portal_tokens FOR SELECT
  USING (can_manage_client_portal_token(project_id));

CREATE POLICY "Only project managers can create portal tokens"
  ON client_portal_tokens FOR INSERT
  WITH CHECK (can_manage_client_portal_token(project_id));

CREATE POLICY "Only project managers can update portal tokens"
  ON client_portal_tokens FOR UPDATE
  USING (can_manage_client_portal_token(project_id))
  WITH CHECK (can_manage_client_portal_token(project_id));

CREATE POLICY "Only project managers can delete portal tokens"
  ON client_portal_tokens FOR DELETE
  USING (can_manage_client_portal_token(project_id));

COMMIT;
