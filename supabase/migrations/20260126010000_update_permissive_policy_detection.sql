-- Refine permissive policy detection to avoid flagging role-scoped policies
CREATE OR REPLACE FUNCTION public.get_permissive_policies()
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.permissive::text,
    p.roles::text[],
    p.cmd::text,
    p.qual::text,
    p.with_check::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      (p.cmd IN ('SELECT', 'DELETE') AND (p.qual IS NULL OR p.qual = 'true'))
      OR (p.cmd IN ('INSERT', 'UPDATE') AND (p.with_check IS NULL OR p.with_check = 'true'))
      OR (
        p.cmd = 'ALL'
        AND (p.qual IS NULL OR p.qual = 'true')
        AND (p.with_check IS NULL OR p.with_check = 'true')
      )
    )
    AND p.tablename NOT LIKE '%_templates'
  ORDER BY p.tablename, p.policyname;
$$;
