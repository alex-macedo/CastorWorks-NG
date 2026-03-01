-- Classic WBS (Work Breakdown Structure)
-- Note: This migration is designed to be copy/paste runnable in Supabase SQL editor as well.

BEGIN;

-- 0) enum for WBS node types (extendable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'wbs_item_type'
  ) THEN
    CREATE TYPE public.wbs_item_type AS ENUM (
      'phase',
      'deliverable',
      'work_package',
      'control_account'
    );
  END IF;
END $$;

-- 1) Templates (header)
CREATE TABLE IF NOT EXISTS public.project_wbs_templates (
  id UUID PRIMARY KEY,
  template_name TEXT NOT NULL,
  description TEXT,
  project_type TEXT, -- expects: residential/commercial/renovation/infrastructure
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_type) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_wbs_templates_project_type
  ON public.project_wbs_templates(project_type);

-- updated_at trigger (reuse existing update_updated_at_column())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_wbs_templates_updated_at'
      AND tgrelid = 'public.project_wbs_templates'::regclass
  ) THEN
    CREATE TRIGGER update_wbs_templates_updated_at
    BEFORE UPDATE ON public.project_wbs_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.project_wbs_templates ENABLE ROW LEVEL SECURITY;

-- RLS: match phase_templates pattern (admin + project_manager)
DROP POLICY IF EXISTS "select_wbs_templates" ON public.project_wbs_templates;
CREATE POLICY "select_wbs_templates"
  ON public.project_wbs_templates
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
  );

-- writes: allow only non-system modifications by admin + project_manager
DROP POLICY IF EXISTS "insert_wbs_templates" ON public.project_wbs_templates;
CREATE POLICY "insert_wbs_templates"
  ON public.project_wbs_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = false
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "update_wbs_templates" ON public.project_wbs_templates;
CREATE POLICY "update_wbs_templates"
  ON public.project_wbs_templates
  FOR UPDATE
  TO authenticated
  USING (
    is_system = false
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  )
  WITH CHECK (
    is_system = false
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "delete_wbs_templates" ON public.project_wbs_templates;
CREATE POLICY "delete_wbs_templates"
  ON public.project_wbs_templates
  FOR DELETE
  TO authenticated
  USING (
    is_system = false
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
    )
  );

-- 2) Template items (tree)
CREATE TABLE IF NOT EXISTS public.project_wbs_template_items (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_wbs_templates(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.project_wbs_template_items(id) ON DELETE CASCADE,
  item_type public.wbs_item_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL,
  wbs_code TEXT NOT NULL,
  code_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, parent_id, sort_order),
  UNIQUE (template_id, wbs_code)
);

CREATE INDEX IF NOT EXISTS idx_wbs_template_items_template_parent
  ON public.project_wbs_template_items(template_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_template_items_template_codepath
  ON public.project_wbs_template_items(template_id, code_path);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_wbs_template_items_updated_at'
      AND tgrelid = 'public.project_wbs_template_items'::regclass
  ) THEN
    CREATE TRIGGER update_wbs_template_items_updated_at
    BEFORE UPDATE ON public.project_wbs_template_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.project_wbs_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_wbs_template_items" ON public.project_wbs_template_items;
CREATE POLICY "select_wbs_template_items"
  ON public.project_wbs_template_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_wbs_templates t
      WHERE t.id = project_wbs_template_items.template_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
        )
    )
  );

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
        AND t.is_system = false
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_wbs_templates t
      WHERE t.id = project_wbs_template_items.template_id
        AND t.is_system = false
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'project_manager'::public.app_role)
        )
    )
  );

-- 3) Project WBS items (tree)
CREATE TABLE IF NOT EXISTS public.project_wbs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.project_wbs_items(id) ON DELETE CASCADE,
  source_template_item_id UUID REFERENCES public.project_wbs_template_items(id) ON DELETE SET NULL,
  item_type public.wbs_item_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT,
  wbs_code TEXT,
  code_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_wbs_items_project_parent
  ON public.project_wbs_items(project_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_project_codepath
  ON public.project_wbs_items(project_id, code_path);
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_project_code
  ON public.project_wbs_items(project_id, wbs_code);

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_wbs_items_sibling_sort
  ON public.project_wbs_items(project_id, parent_id, sort_order)
  WHERE sort_order IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_wbs_items_project_wbs_code
  ON public.project_wbs_items(project_id, wbs_code)
  WHERE wbs_code IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_project_wbs_items_updated_at'
      AND tgrelid = 'public.project_wbs_items'::regclass
  ) THEN
    CREATE TRIGGER update_project_wbs_items_updated_at
    BEFORE UPDATE ON public.project_wbs_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpers to build code strings
CREATE OR REPLACE FUNCTION public.wbs_pad3(n INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lpad(n::text, 3, '0');
$$;

-- Compute codes for manual inserts / reorders.
-- IMPORTANT: For bulk inserts (template application) we pass precomputed codes;
-- this trigger will NOT overwrite them on INSERT if both code fields are provided.
CREATE OR REPLACE FUNCTION public.project_wbs_compute_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next INT;
  v_parent_code TEXT;
  v_parent_path TEXT;
BEGIN
  -- On INSERT: if caller already provided codes, preserve them (template application).
  IF TG_OP = 'INSERT' AND NEW.wbs_code IS NOT NULL AND NEW.code_path IS NOT NULL AND NEW.sort_order IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If sort_order omitted, append as last sibling
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1
      INTO v_next
    FROM public.project_wbs_items
    WHERE project_id = NEW.project_id
      AND ((parent_id IS NULL AND NEW.parent_id IS NULL) OR parent_id = NEW.parent_id);

    NEW.sort_order := v_next;
  END IF;

  -- Parent codes (safe for normal inserts where parent exists)
  IF NEW.parent_id IS NULL THEN
    v_parent_code := NULL;
    v_parent_path := NULL;
  ELSE
    SELECT wbs_code, code_path
      INTO v_parent_code, v_parent_path
    FROM public.project_wbs_items
    WHERE id = NEW.parent_id;

    IF v_parent_code IS NULL THEN
      v_parent_code := '';
    END IF;
    IF v_parent_path IS NULL THEN
      v_parent_path := '';
    END IF;
  END IF;

  NEW.wbs_code := CASE
    WHEN NEW.parent_id IS NULL THEN NEW.sort_order::text
    WHEN v_parent_code = '' THEN NEW.sort_order::text
    ELSE v_parent_code || '.' || NEW.sort_order::text
  END;

  NEW.code_path := CASE
    WHEN NEW.parent_id IS NULL THEN public.wbs_pad3(NEW.sort_order)
    WHEN v_parent_path = '' THEN public.wbs_pad3(NEW.sort_order)
    ELSE v_parent_path || '.' || public.wbs_pad3(NEW.sort_order)
  END;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'project_wbs_compute_codes'
      AND tgrelid = 'public.project_wbs_items'::regclass
  ) THEN
    CREATE TRIGGER project_wbs_compute_codes
    BEFORE INSERT OR UPDATE OF parent_id, sort_order
    ON public.project_wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION public.project_wbs_compute_codes();
  END IF;
END $$;

ALTER TABLE public.project_wbs_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_scoped_select_project_wbs_items" ON public.project_wbs_items;
CREATE POLICY "project_scoped_select_project_wbs_items"
  ON public.project_wbs_items
  FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_insert_project_wbs_items" ON public.project_wbs_items;
CREATE POLICY "project_scoped_insert_project_wbs_items"
  ON public.project_wbs_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_update_project_wbs_items" ON public.project_wbs_items;
CREATE POLICY "project_scoped_update_project_wbs_items"
  ON public.project_wbs_items
  FOR UPDATE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_scoped_delete_project_wbs_items" ON public.project_wbs_items;
CREATE POLICY "project_scoped_delete_project_wbs_items"
  ON public.project_wbs_items
  FOR DELETE
  TO authenticated
  USING (public.has_project_admin_access(auth.uid(), project_id));

-- 4) Link project_phases <-> WBS phase nodes (keeps existing features intact)
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS wbs_item_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'project_phases'
      AND constraint_name = 'project_phases_wbs_item_id_fkey'
  ) THEN
    ALTER TABLE public.project_phases
      ADD CONSTRAINT project_phases_wbs_item_id_fkey
      FOREIGN KEY (wbs_item_id)
      REFERENCES public.project_wbs_items(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_phases_project_wbs_item
  ON public.project_phases(project_id, wbs_item_id)
  WHERE wbs_item_id IS NOT NULL;

-- 5) Extend project_activities for classic WBS linking + per-phase ordering
ALTER TABLE public.project_activities
  ADD COLUMN IF NOT EXISTS wbs_item_id UUID,
  ADD COLUMN IF NOT EXISTS phase_order INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'project_activities'
      AND constraint_name = 'project_activities_wbs_item_id_fkey'
  ) THEN
    ALTER TABLE public.project_activities
      ADD CONSTRAINT project_activities_wbs_item_id_fkey
      FOREIGN KEY (wbs_item_id)
      REFERENCES public.project_wbs_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_activities_wbs_item_id
  ON public.project_activities(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_phase_order
  ON public.project_activities(project_id, phase_id, phase_order);

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_activities_phase_order
  ON public.project_activities(project_id, phase_id, phase_order)
  WHERE phase_id IS NOT NULL AND phase_order IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_project_activity_phase_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.phase_id IS NOT NULL AND NEW.phase_order IS NULL THEN
    SELECT COALESCE(MAX(phase_order), 0) + 1
      INTO NEW.phase_order
    FROM public.project_activities
    WHERE project_id = NEW.project_id
      AND phase_id = NEW.phase_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_project_activity_phase_order'
      AND tgrelid = 'public.project_activities'::regclass
  ) THEN
    CREATE TRIGGER set_project_activity_phase_order
      BEFORE INSERT ON public.project_activities
      FOR EACH ROW
      EXECUTE FUNCTION public.set_project_activity_phase_order();
  END IF;
END $$;

-- Backfill: phase_order for existing activities (safe/idempotent)
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, phase_id
      ORDER BY start_date NULLS LAST, created_at NULLS LAST, id
    ) AS rn
  FROM public.project_activities
  WHERE phase_id IS NOT NULL AND phase_order IS NULL
)
UPDATE public.project_activities a
SET phase_order = n.rn
FROM numbered n
WHERE a.id = n.id;

-- 6) Internal: apply WBS template to a project
CREATE OR REPLACE FUNCTION public.apply_wbs_template_to_project_internal(_project_id uuid, _template_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Avoid double-apply
  IF EXISTS (SELECT 1 FROM public.project_wbs_items WHERE project_id = _project_id) THEN
    RETURN;
  END IF;

  WITH RECURSIVE src AS (
    SELECT
      i.id AS template_item_id,
      i.parent_id,
      i.item_type,
      i.name,
      i.description,
      i.sort_order,
      i.wbs_code,
      i.code_path
    FROM public.project_wbs_template_items i
    WHERE i.template_id = _template_id
      AND i.parent_id IS NULL

    UNION ALL

    SELECT
      c.id,
      c.parent_id,
      c.item_type,
      c.name,
      c.description,
      c.sort_order,
      c.wbs_code,
      c.code_path
    FROM public.project_wbs_template_items c
    JOIN src p ON p.template_item_id = c.parent_id
    WHERE c.template_id = _template_id
  ), mapped AS (
    SELECT
      template_item_id,
      parent_id,
      gen_random_uuid() AS new_id
    FROM src
  )
  INSERT INTO public.project_wbs_items (
    id,
    project_id,
    parent_id,
    source_template_item_id,
    item_type,
    name,
    description,
    sort_order,
    wbs_code,
    code_path
  )
  SELECT
    m.new_id,
    _project_id,
    pm.new_id,
    s.template_item_id,
    s.item_type,
    s.name,
    s.description,
    s.sort_order,
    s.wbs_code,
    s.code_path
  FROM src s
  JOIN mapped m ON m.template_item_id = s.template_item_id
  LEFT JOIN mapped pm ON pm.template_item_id = s.parent_id
  ORDER BY s.code_path;

  -- Create project_phases for WBS phase nodes (keeps existing budget/milestone features working)
  INSERT INTO public.project_phases (
    project_id,
    phase_name,
    sort_order,
    status,
    progress_percentage,
    budget_allocated,
    budget_spent,
    wbs_item_id
  )
  SELECT
    _project_id,
    w.name,
    w.sort_order,
    'pending',
    0,
    0,
    0,
    w.id
  FROM public.project_wbs_items w
  WHERE w.project_id = _project_id
    AND w.item_type = 'phase'::public.wbs_item_type
  ON CONFLICT DO NOTHING;
END;
$$;

-- 7) Trigger: on project insert, pick template by projects.type and apply
CREATE OR REPLACE FUNCTION public.on_project_insert_apply_wbs_template()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  SELECT t.id
    INTO v_template_id
  FROM public.project_wbs_templates t
  WHERE (t.project_type IS NOT DISTINCT FROM NEW.type)
  ORDER BY t.is_default DESC, t.created_at ASC
  LIMIT 1;

  IF v_template_id IS NULL THEN
    SELECT t.id INTO v_template_id
    FROM public.project_wbs_templates t
    WHERE t.is_default = true
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  IF v_template_id IS NOT NULL THEN
    PERFORM public.apply_wbs_template_to_project_internal(NEW.id, v_template_id);
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'projects_apply_wbs_template'
      AND tgrelid = 'public.projects'::regclass
  ) THEN
    CREATE TRIGGER projects_apply_wbs_template
      AFTER INSERT ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.on_project_insert_apply_wbs_template();
  END IF;
END $$;

COMMIT;

-- 8) Seed deterministic system templates + nodes (fixed zero UUIDs)
-- Note: These are safe to run multiple times; they will not overwrite existing rows.

BEGIN;

INSERT INTO public.project_wbs_templates (id, template_name, description, project_type, is_default, is_system)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Brazilian Residential WBS',
  'Default classic WBS template for residential projects',
  'residential',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_wbs_templates
  WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO public.project_wbs_templates (id, template_name, description, project_type, is_default, is_system)
SELECT
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Brazilian Commercial WBS',
  'Default classic WBS template for commercial projects',
  'commercial',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_wbs_templates
  WHERE id = '00000000-0000-0000-0000-000000000002'::uuid
);

-- Residential top-level phases (codes 1..8) + a small example subtree under phase 1.
INSERT INTO public.project_wbs_template_items (
  id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path
)
SELECT *
FROM (
  VALUES
    -- (id, template_id, parent_id, type, name, desc, sort, wbs_code, code_path)
    ('00000000-0000-0000-0000-000000001001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Site Preparation', NULL, 1, '1', '001'),
    ('00000000-0000-0000-0000-000000001002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Foundation', NULL, 2, '2', '002'),
    ('00000000-0000-0000-0000-000000001003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Framing', NULL, 3, '3', '003'),
    ('00000000-0000-0000-0000-000000001004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Rough-In (Electrical, Plumbing, HVAC)', NULL, 4, '4', '004'),
    ('00000000-0000-0000-0000-000000001005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Insulation & Drywall', NULL, 5, '5', '005'),
    ('00000000-0000-0000-0000-000000001006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Interior Finishing', NULL, 6, '6', '006'),
    ('00000000-0000-0000-0000-000000001007'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Exterior Finishing', NULL, 7, '7', '007'),
    ('00000000-0000-0000-0000-000000001008'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'phase'::public.wbs_item_type, 'Final Inspection & Cleanup', NULL, 8, '8', '008'),

    -- Example child structure under Site Preparation
    ('00000000-0000-0000-0000-000000001101'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000001001'::uuid, 'deliverable'::public.wbs_item_type, 'Mobilization', NULL, 1, '1.1', '001.001'),
    ('00000000-0000-0000-0000-000000001102'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000001001'::uuid, 'deliverable'::public.wbs_item_type, 'Temporary Facilities', NULL, 2, '1.2', '001.002'),
    ('00000000-0000-0000-0000-000000001103'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000001001'::uuid, 'deliverable'::public.wbs_item_type, 'Site Clearing', NULL, 3, '1.3', '001.003'),

    -- Example work packages under Site Clearing
    ('00000000-0000-0000-0000-000000001201'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000001103'::uuid, 'work_package'::public.wbs_item_type, 'Debris Removal', NULL, 1, '1.3.1', '001.003.001'),
    ('00000000-0000-0000-0000-000000001202'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000001103'::uuid, 'work_package'::public.wbs_item_type, 'Grading', NULL, 2, '1.3.2', '001.003.002')
) AS v(id, template_id, parent_id, item_type, name, description, sort_order, wbs_code, code_path)
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_wbs_template_items i WHERE i.id = v.id
);

COMMIT;


