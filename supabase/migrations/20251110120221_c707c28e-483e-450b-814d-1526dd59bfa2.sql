-- Add SELECT policy for roadmap_items table so users can view roadmap data
DO $$
DECLARE
  has_project_column BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'roadmap_items'
  ) THEN
    has_project_column := EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'roadmap_items'
        AND column_name = 'project_id'
    );

    IF EXISTS (
      SELECT 1
      FROM pg_policy
      WHERE polname = 'Authenticated users can view roadmap items'
        AND polrelid = 'public.roadmap_items'::regclass
    ) THEN
      EXECUTE 'DROP POLICY "Authenticated users can view roadmap items" ON public.roadmap_items';
    END IF;

    IF has_project_column THEN
      EXECUTE '
        CREATE POLICY "Authenticated users can view roadmap items"
        ON public.roadmap_items
        FOR SELECT
        TO authenticated
        USING (has_project_access(auth.uid(), project_id))
      ';
    ELSE
      EXECUTE '
        CREATE POLICY "Authenticated users can view roadmap items"
        ON public.roadmap_items
        FOR SELECT
        TO authenticated
        USING (
          created_by = auth.uid()
          OR has_role(auth.uid(), ''admin''::app_role)
        )
      ';
    END IF;
  END IF;
END;
$$;
