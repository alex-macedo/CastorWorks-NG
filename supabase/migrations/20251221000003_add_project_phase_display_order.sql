ALTER TABLE public.project_phases
ADD COLUMN IF NOT EXISTS display_order integer;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id
      ORDER BY start_date NULLS LAST, created_at NULLS LAST, id
    ) AS rn
  FROM public.project_phases
)
UPDATE public.project_phases
SET display_order = ordered.rn
FROM ordered
WHERE public.project_phases.id = ordered.id
  AND public.project_phases.display_order IS NULL;

CREATE OR REPLACE FUNCTION public.set_project_phase_display_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.display_order IS NULL THEN
    SELECT COALESCE(MAX(display_order), 0) + 1
    INTO NEW.display_order
    FROM public.project_phases
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_project_phase_display_order ON public.project_phases;
CREATE TRIGGER set_project_phase_display_order
BEFORE INSERT ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION public.set_project_phase_display_order();

CREATE INDEX IF NOT EXISTS idx_project_phases_project_display_order
ON public.project_phases (project_id, display_order);
