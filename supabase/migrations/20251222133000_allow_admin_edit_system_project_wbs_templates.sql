-- Allow admins to edit system Project WBS templates (header + items)
-- Keeps deletes of system templates blocked by default.

BEGIN;

-- Templates: allow admin updates regardless of is_system; keep inserts non-system only; keep deletes non-system only.
DROP POLICY IF EXISTS "update_wbs_templates" ON public.project_wbs_templates;
CREATE POLICY "update_wbs_templates"
  ON public.project_wbs_templates
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      is_system = false
      AND public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      is_system = false
      AND public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  );

-- Template items: allow admin manage items even when template is_system=true; PM can manage only non-system templates.
DROP POLICY IF EXISTS "manage_wbs_template_items" ON public.project_wbs_template_items;
CREATE POLICY "manage_wbs_template_items"
  ON public.project_wbs_template_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_wbs_templates t
      WHERE t.id = project_wbs_template_items.template_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            t.is_system = false
            AND public.has_role(auth.uid(), 'project_manager'::public.app_role)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_wbs_templates t
      WHERE t.id = project_wbs_template_items.template_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            t.is_system = false
            AND public.has_role(auth.uid(), 'project_manager'::public.app_role)
          )
        )
    )
  );

COMMIT;


