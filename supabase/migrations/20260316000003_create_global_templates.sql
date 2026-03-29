-- Create global_templates table for platform-managed reusable templates
BEGIN;

CREATE TABLE public.global_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family       TEXT NOT NULL
                 CHECK (family IN ('phase','wbs','activity','budget','whatsapp')),
  name         TEXT NOT NULL,
  description  TEXT,
  content      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','published','archived')),
  version      INTEGER NOT NULL DEFAULT 1,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_templates_family ON public.global_templates(family);
CREATE INDEX idx_global_templates_status ON public.global_templates(status);

ALTER TABLE public.global_templates ENABLE ROW LEVEL SECURITY;

-- platform_owner / super_admin can see all statuses
CREATE POLICY "global_templates_select_owners"
  ON public.global_templates FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- platform_support / platform_sales can only see published templates
CREATE POLICY "global_templates_select_support_sales"
  ON public.global_templates FOR SELECT
  USING (
    status = 'published'
    AND (
      has_role(auth.uid(), 'platform_support'::app_role)
      OR has_role(auth.uid(), 'platform_sales'::app_role)
    )
  );

-- Only platform_owner / super_admin can create, edit, delete templates
CREATE POLICY "global_templates_insert"
  ON public.global_templates FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "global_templates_update"
  ON public.global_templates FOR UPDATE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "global_templates_delete"
  ON public.global_templates FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_global_templates_updated_at
  BEFORE UPDATE ON public.global_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
