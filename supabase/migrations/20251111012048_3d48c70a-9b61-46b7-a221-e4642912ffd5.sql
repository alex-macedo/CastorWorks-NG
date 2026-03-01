-- Update RLS policies for activity_templates and phase_templates to allow admins to edit system templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'activity_templates'
  ) THEN
    DROP POLICY IF EXISTS "Users can update non-system templates" ON public.activity_templates;
    DROP POLICY IF EXISTS "Users can delete non-system templates" ON public.activity_templates;
    DROP POLICY IF EXISTS "Users can update non-system templates or admins can update any" ON public.activity_templates;
    DROP POLICY IF EXISTS "Users can delete non-system templates or admins can delete any" ON public.activity_templates;
    CREATE POLICY "Users can update non-system templates or admins can update any"
      ON public.activity_templates
      FOR UPDATE
      USING (is_system = false OR has_role(auth.uid(), 'admin'::app_role));
    CREATE POLICY "Users can delete non-system templates or admins can delete any"
      ON public.activity_templates
      FOR DELETE
      USING (is_system = false OR has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'phase_templates'
  ) THEN
    DROP POLICY IF EXISTS "Users can update non-system templates" ON public.phase_templates;
    DROP POLICY IF EXISTS "Users can delete non-system templates" ON public.phase_templates;
    DROP POLICY IF EXISTS "Users can update non-system templates or admins can update any" ON public.phase_templates;
    DROP POLICY IF EXISTS "Users can delete non-system templates or admins can delete any" ON public.phase_templates;
    CREATE POLICY "Users can update non-system templates or admins can update any"
      ON public.phase_templates
      FOR UPDATE
      USING (is_system = false OR has_role(auth.uid(), 'admin'::app_role));
    CREATE POLICY "Users can delete non-system templates or admins can delete any"
      ON public.phase_templates
      FOR DELETE
      USING (is_system = false OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END;
$$;
