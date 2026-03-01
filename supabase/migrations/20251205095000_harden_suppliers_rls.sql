-- Harden RLS for suppliers
BEGIN;

ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers'
  ) THEN
    DROP POLICY IF EXISTS "authenticated_select_suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Admins can manage all records" ON suppliers;
    DROP POLICY IF EXISTS "Admins can insert records" ON suppliers;
    DROP POLICY IF EXISTS "Admins and PMs can insert suppliers" ON suppliers;
    DROP POLICY IF EXISTS "Admins and PMs can delete suppliers" ON suppliers;
    DROP POLICY IF EXISTS "authenticated_delete_suppliers" ON suppliers;
    DROP POLICY IF EXISTS "authenticated_insert_suppliers" ON suppliers;
  END IF;
END$$;

-- Read: allow admins or procurement; optionally project-link if exists
CREATE POLICY "Role-based select suppliers"
  ON suppliers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'procurement')
  );

-- Insert/Update/Delete: admin or procurement only
CREATE POLICY "Role-based insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement'));

CREATE POLICY "Role-based update suppliers"
  ON suppliers FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement'));

CREATE POLICY "Role-based delete suppliers"
  ON suppliers FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'procurement'));

COMMIT;
