-- Fix quotes RLS: remove invalid column refs and enforce project-scoped access via purchase_request_items → project_purchase_requests
BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Drop legacy/admin-wide policies if present
DROP POLICY IF EXISTS "Admins can insert records" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage all records" ON public.quotes;
DROP POLICY IF EXISTS "Project admins can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Project admins can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Project admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS authenticated_manage_quotes ON public.quotes;
DROP POLICY IF EXISTS authenticated_select_quotes ON public.quotes;

-- Project-scoped SELECT: users with access to the linked purchase request's project can read
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

-- Project admin/PM INSERT (no invalid columns referenced)
CREATE POLICY project_admin_insert_quotes
  ON public.quotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
        AND has_project_access(auth.uid(), ppr.project_id)
    )
  );

-- Project admin/PM UPDATE
CREATE POLICY project_admin_update_quotes
  ON public.quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  );

-- Project admin/PM DELETE
CREATE POLICY project_admin_delete_quotes
  ON public.quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_request_items pri
      JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
      WHERE pri.id = quotes.purchase_request_item_id
        AND has_project_access(auth.uid(), ppr.project_id)
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
    )
  );

COMMIT;
