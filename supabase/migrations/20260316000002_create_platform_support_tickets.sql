-- Create platform_support_tickets and platform_support_messages tables
BEGIN;

-- Tickets table
CREATE TABLE public.platform_support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  subject    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','in_progress','resolved','closed')),
  priority   TEXT NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low','medium','high','urgent')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_status    ON public.platform_support_tickets(status);
CREATE INDEX idx_support_tickets_tenant    ON public.platform_support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_created   ON public.platform_support_tickets(created_by);

ALTER TABLE public.platform_support_tickets ENABLE ROW LEVEL SECURITY;

-- Any platform role can view tickets
CREATE POLICY "platform_tickets_select"
  ON public.platform_support_tickets FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Any platform role can create tickets
CREATE POLICY "platform_tickets_insert"
  ON public.platform_support_tickets FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only owner / support / super can update tickets
CREATE POLICY "platform_tickets_update"
  ON public.platform_support_tickets FOR UPDATE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only platform_owner / super_admin can delete tickets
CREATE POLICY "platform_tickets_delete"
  ON public.platform_support_tickets FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_platform_tickets_updated_at
  BEFORE UPDATE ON public.platform_support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Messages table (thread messages within a ticket)
CREATE TABLE public.platform_support_messages (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.platform_support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON public.platform_support_messages(ticket_id);

ALTER TABLE public.platform_support_messages ENABLE ROW LEVEL SECURITY;

-- Any platform role can read messages whose ticket they can access
CREATE POLICY "platform_messages_select"
  ON public.platform_support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_support_tickets t
      WHERE t.id = ticket_id
        AND (
          has_role(auth.uid(), 'platform_owner'::app_role)
          OR has_role(auth.uid(), 'platform_support'::app_role)
          OR has_role(auth.uid(), 'platform_sales'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- Any platform role can post messages
CREATE POLICY "platform_messages_insert"
  ON public.platform_support_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

COMMIT;
