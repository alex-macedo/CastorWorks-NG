-- Migration: Create invoices table (minimal schema required by client portal)
-- Adds: public.invoices
-- NOTE: Review constraints, RLS helper functions and adjust ordering if your environment
-- already depends on other migrations (projects, auth, chat_conversations etc.)

BEGIN;

-- invoices: basic invoice records used by the client portal
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_name TEXT,
  issue_date DATE,
  due_date DATE,
  amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow project members to select invoices for projects they can access
DROP POLICY IF EXISTS "Project members can view invoices" ON public.invoices;
CREATE POLICY "Project members can view invoices"
  ON public.invoices FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

-- Allow project admins to manage invoices
DROP POLICY IF EXISTS "Project admins can manage invoices" ON public.invoices;
CREATE POLICY "Project admins can manage invoices"
  ON public.invoices FOR ALL
  USING (public.has_project_admin_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_admin_access(auth.uid(), project_id));

GRANT SELECT ON public.invoices TO authenticated;
GRANT INSERT, UPDATE ON public.invoices TO authenticated;
GRANT DELETE ON public.invoices TO service_role;

COMMIT;
