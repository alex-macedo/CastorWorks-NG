-- Harmonize projects.type allowed values with current application usage

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_type_check'
  ) THEN
    ALTER TABLE public.projects DROP CONSTRAINT projects_type_check;
  END IF;

  ALTER TABLE public.projects
    ADD CONSTRAINT projects_type_check
    CHECK (
      type IS NULL
      OR type IN (
        'Own Build',
        'Final Contractor',
        'Project Owned',
        'Project Customer',
        'residential',
        'commercial',
        'renovation',
        'infrastructure'
      )
    );
END $$;
