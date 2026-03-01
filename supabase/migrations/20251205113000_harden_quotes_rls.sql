BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes'
  ) THEN
    DELETE FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Helper: project access via linked purchase_request_items → project_purchase_requests
-- SELECT: only members with project access can view quotes
CREATE POLICY project_scoped_select_quotes
  ON public.quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
    )
  );

-- INSERT: restricted to project managers/admin within project scope
CREATE POLICY project_scoped_insert_quotes
  ON public.quotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
    )
    AND (has_role(auth.uid(), 'project_manager') OR has_role(auth.uid(), 'admin'))
  );

-- UPDATE: owner (created_by) or PM/admin with project access
CREATE POLICY project_scoped_update_quotes
  ON public.quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
    )
    AND (
      quotes.created_by = auth.uid()
      OR has_role(auth.uid(), 'project_manager')
      OR has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
    )
  );

-- DELETE: PM/admin within project access, or owner
CREATE POLICY project_scoped_delete_quotes
  ON public.quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
    )
    AND (
      quotes.created_by = auth.uid()
      OR has_role(auth.uid(), 'project_manager')
      OR has_role(auth.uid(), 'admin')
    )
  );

COMMIT;
