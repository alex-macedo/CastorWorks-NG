DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'quote_request_send_method'
  ) THEN
    CREATE TYPE quote_request_send_method AS ENUM ('email', 'whatsapp', 'both');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'quote_request_status'
  ) THEN
    CREATE TYPE quote_request_status AS ENUM ('draft', 'sent', 'responded', 'expired', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'supplier_contact_method'
  ) THEN
    CREATE TYPE supplier_contact_method AS ENUM ('email', 'whatsapp', 'both');
  END IF;
END $$;

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL REFERENCES public.project_purchase_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  request_number TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_via quote_request_send_method,
  response_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status quote_request_status DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_requests_purchase_request ON public.quote_requests(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_supplier ON public.quote_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_request_number ON public.quote_requests(request_number);

-- Add columns to suppliers table
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS preferred_contact_method supplier_contact_method DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate existing contact_email to email if email doesn't exist
UPDATE public.suppliers
SET email = contact_email
WHERE email IS NULL AND contact_email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_requests
-- Users can view quote requests for their projects
DROP POLICY IF EXISTS "Users can view quote requests for their projects" ON public.quote_requests;
CREATE POLICY "Users can view quote requests for their projects"
ON public.quote_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_purchase_requests pr
    JOIN public.projects p ON pr.project_id = p.id
    WHERE pr.id = quote_requests.purchase_request_id
    AND public.has_project_access(auth.uid(), p.id)
  )
);

-- Only project managers and admins can insert quote requests
DROP POLICY IF EXISTS "Project managers can create quote requests" ON public.quote_requests;
CREATE POLICY "Project managers can create quote requests"
ON public.quote_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'project_manager')
  )
);

-- Only project managers and admins can update quote requests
DROP POLICY IF EXISTS "Project managers can update quote requests" ON public.quote_requests;
CREATE POLICY "Project managers can update quote requests"
ON public.quote_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'project_manager')
  )
);

-- Function to generate quote request number (QR-YYYY-MM-###)
CREATE OR REPLACE FUNCTION generate_quote_request_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO last_number
  FROM public.quote_requests
  WHERE request_number LIKE 'QR-' || year_month || '-%';
  
  new_number := 'QR-' || year_month || '-' || LPAD(last_number::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate request_number before insert
CREATE OR REPLACE FUNCTION set_quote_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_quote_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_quote_request_number_trigger ON public.quote_requests;
CREATE TRIGGER set_quote_request_number_trigger
BEFORE INSERT ON public.quote_requests
FOR EACH ROW
EXECUTE FUNCTION set_quote_request_number();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON public.quote_requests;
CREATE TRIGGER update_quote_requests_updated_at
BEFORE UPDATE ON public.quote_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
