-- Create platform_communication_log table (append-only interaction log)
BEGIN;

CREATE TABLE public.platform_communication_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  channel      TEXT NOT NULL
                 CHECK (channel IN ('email','whatsapp','phone','meeting')),
  direction    TEXT NOT NULL
                 CHECK (direction IN ('inbound','outbound')),
  subject      TEXT,
  body         TEXT,
  status       TEXT NOT NULL DEFAULT 'logged'
                 CHECK (status IN ('logged','follow_up','resolved')),
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — this table is intentionally append-only
);

CREATE INDEX idx_comm_log_tenant     ON public.platform_communication_log(tenant_id);
CREATE INDEX idx_comm_log_created_by ON public.platform_communication_log(created_by);
CREATE INDEX idx_comm_log_channel    ON public.platform_communication_log(channel);

ALTER TABLE public.platform_communication_log ENABLE ROW LEVEL SECURITY;

-- Any platform role can view log entries
CREATE POLICY "platform_comm_log_select"
  ON public.platform_communication_log FOR SELECT
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Any platform role can insert log entries
CREATE POLICY "platform_comm_log_insert"
  ON public.platform_communication_log FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'platform_support'::app_role)
    OR has_role(auth.uid(), 'platform_sales'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- No UPDATE policy — log is append-only

-- Only platform_owner / super_admin can delete log entries
CREATE POLICY "platform_comm_log_delete"
  ON public.platform_communication_log FOR DELETE
  USING (
    has_role(auth.uid(), 'platform_owner'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

COMMIT;
