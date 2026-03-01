-- Allow roadmap Kanban to use configurable columns (custom statuses).
-- 1) Store status as TEXT so any column id can be used.
-- 2) Add app_settings.roadmap_kanban_columns (JSONB) for column config.

-- roadmap_items.status: enum -> text (keep existing values as-is)
ALTER TABLE public.roadmap_items
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.roadmap_items
  ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE public.roadmap_items
  ALTER COLUMN status SET DEFAULT 'backlog';

-- Ensure no invalid statuses from enum cast
UPDATE public.roadmap_items
SET status = 'backlog'
WHERE status IS NULL OR status = '';

ALTER TABLE public.roadmap_items
  ALTER COLUMN status SET NOT NULL;

-- app_settings: add column for Kanban column config (array of { id, labelKey?, label?, sort_order })
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS roadmap_kanban_columns jsonb DEFAULT NULL;

COMMENT ON COLUMN public.app_settings.roadmap_kanban_columns IS
  'Roadmap Kanban columns: [{ "id": "backlog", "labelKey": "roadmap.status.backlog", "sort_order": 0 }, ...]. Custom columns use "label" instead of "labelKey".';
