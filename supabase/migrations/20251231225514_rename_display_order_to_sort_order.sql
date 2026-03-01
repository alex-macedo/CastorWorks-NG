-- Migration: Rename all display_order columns to sort_order
-- This migration systematically renames all ordering fields from display_order to sort_order

-- 1. Add sort_order columns to all tables with display_order
ALTER TABLE public.simplebudget_materials_template ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.simplebudget_labor_template ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.project_materials ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.project_labor ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.project_task_statuses ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.project_phases ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.budget_template_items ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.delivery_photos ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2. Copy data from display_order to sort_order
UPDATE public.simplebudget_materials_template SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.simplebudget_labor_template SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.project_materials SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.project_labor SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.project_task_statuses SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.project_phases SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.budget_template_items SET sort_order = display_order WHERE display_order IS NOT NULL;
UPDATE public.delivery_photos SET sort_order = display_order WHERE display_order IS NOT NULL;

-- 3. Drop existing constraints and indexes that reference display_order
DROP INDEX IF EXISTS public.idx_project_task_statuses_display_order;
DROP INDEX IF EXISTS public.idx_project_phases_project_display_order;
DROP INDEX IF EXISTS public.idx_budget_template_items_display_order;
DROP INDEX IF EXISTS public.idx_delivery_photos_display_order;
ALTER TABLE project_task_statuses DROP CONSTRAINT IF EXISTS unique_project_display_order;

-- 4. Drop triggers that reference display_order
DROP TRIGGER IF EXISTS set_order_simplebudget_materials ON public.simplebudget_materials_template;
DROP TRIGGER IF EXISTS set_order_simplebudget_labor ON public.simplebudget_labor_template;
DROP TRIGGER IF EXISTS set_order_project_materials ON public.project_materials;
DROP TRIGGER IF EXISTS set_order_project_labor ON public.project_labor;
DROP TRIGGER IF EXISTS set_project_phase_display_order ON public.project_phases;

-- 5. Drop functions that reference display_order (using DO blocks for safety)
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.set_simplebudget_materials_display_order();
    DROP FUNCTION IF EXISTS public.set_simplebudget_labor_display_order();
    DROP FUNCTION IF EXISTS public.set_project_materials_display_order();
    DROP FUNCTION IF EXISTS public.set_project_labor_display_order();
    DROP FUNCTION IF EXISTS public.set_project_phase_display_order();
    DROP FUNCTION IF EXISTS public.reorder_simplebudget_materials_groups(text[]);
    DROP FUNCTION IF EXISTS public.reorder_simplebudget_labor_groups(text[]);
    DROP FUNCTION IF EXISTS public.reorder_project_materials_groups(uuid, text[]);
    DROP FUNCTION IF EXISTS public.reorder_project_labor_groups(uuid, text[]);
EXCEPTION
    WHEN undefined_function THEN
        -- Functions don't exist, continue
        NULL;
END $$;

-- 6. Recreate functions with sort_order
CREATE OR REPLACE FUNCTION public.set_simplebudget_materials_sort_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order FROM public.simplebudget_materials_template;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_simplebudget_labor_sort_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order FROM public.simplebudget_labor_template;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_materials_sort_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order
    FROM public.project_materials
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_labor_sort_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order
    FROM public.project_labor
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_phase_sort_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO NEW.sort_order
    FROM public.project_phases
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Recreate reordering functions with sort_order
CREATE OR REPLACE FUNCTION public.reorder_simplebudget_materials_groups(p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.simplebudget_materials_template AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, group_name) as new_sort_order
    FROM public.simplebudget_materials_template
    WHERE group_name = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_simplebudget_materials_groups(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_simplebudget_labor_groups(p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.simplebudget_labor_template AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position as the sort order (preserves user's intended order)
           array_position(p_group_names, "group") as new_sort_order
    FROM public.simplebudget_labor_template
    WHERE "group" = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_simplebudget_labor_groups(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_project_materials_groups(p_project_id uuid, p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  UPDATE public.project_materials AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position + 1 as the sort order (preserves user's intended order)
           array_position(p_group_names, group_name) as new_sort_order
    FROM public.project_materials
    WHERE project_id = p_project_id
      AND group_name = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_project_materials_groups(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_project_labor_groups(p_project_id uuid, p_group_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  UPDATE public.project_labor AS t
  SET sort_order = sub.new_sort_order
  FROM (
    SELECT id,
           -- Use array position + 1 as the sort order (preserves user's intended order)
           array_position(p_group_names, "group") as new_sort_order
    FROM public.project_labor
    WHERE project_id = p_project_id
      AND "group" = ANY(p_group_names)
  ) sub
  WHERE t.id = sub.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reorder_project_labor_groups(uuid, text[]) TO authenticated;

-- 8. Recreate triggers with sort_order
CREATE TRIGGER set_order_simplebudget_materials
BEFORE INSERT ON public.simplebudget_materials_template
FOR EACH ROW EXECUTE FUNCTION public.set_simplebudget_materials_sort_order();

CREATE TRIGGER set_order_simplebudget_labor
BEFORE INSERT ON public.simplebudget_labor_template
FOR EACH ROW EXECUTE FUNCTION public.set_simplebudget_labor_sort_order();

CREATE TRIGGER set_order_project_materials
BEFORE INSERT ON public.project_materials
FOR EACH ROW EXECUTE FUNCTION public.set_project_materials_sort_order();

CREATE TRIGGER set_order_project_labor
BEFORE INSERT ON public.project_labor
FOR EACH ROW EXECUTE FUNCTION public.set_project_labor_sort_order();

CREATE TRIGGER set_project_phase_sort_order
BEFORE INSERT ON public.project_phases
FOR EACH ROW EXECUTE FUNCTION public.set_project_phase_sort_order();

-- 9. Recreate indexes with sort_order
CREATE INDEX IF NOT EXISTS idx_project_task_statuses_sort_order
ON project_task_statuses(project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_sort_order
ON public.project_phases (project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_budget_template_items_sort_order ON budget_template_items(template_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_delivery_photos_sort_order ON public.delivery_photos(delivery_confirmation_id, sort_order);

-- 10. Recreate constraints with sort_order
ALTER TABLE project_task_statuses ADD CONSTRAINT unique_project_sort_order UNIQUE(project_id, sort_order) DEFERRABLE INITIALLY DEFERRED;

-- 11. Drop old display_order columns
ALTER TABLE public.simplebudget_materials_template DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.simplebudget_labor_template DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.project_materials DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.project_labor DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.project_task_statuses DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.project_phases DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.budget_template_items DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.delivery_photos DROP COLUMN IF EXISTS display_order;