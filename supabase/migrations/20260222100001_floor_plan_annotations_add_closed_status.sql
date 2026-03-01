-- Add 'closed' status to floor_plan_annotations for full status workflow
-- Matches site_issues and useAnnotations TypeScript interface

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'floor_plan_annotations') THEN
    ALTER TABLE public.floor_plan_annotations DROP CONSTRAINT IF EXISTS floor_plan_annotations_status_check;
    ALTER TABLE public.floor_plan_annotations ADD CONSTRAINT floor_plan_annotations_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));
  END IF;
END $$;
