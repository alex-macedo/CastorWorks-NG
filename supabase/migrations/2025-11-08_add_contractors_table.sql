-- Migration: add contractors table

CREATE TABLE IF NOT EXISTS public.contractors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company text,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  tax_id text,
  license_number text,
  resource_type public.resource_type DEFAULT 'subcontractor',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_contractors_name ON public.contractors (lower(name));
CREATE INDEX IF NOT EXISTS idx_contractors_company ON public.contractors (lower(company));

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contractors_set_timestamp ON public.contractors;
CREATE TRIGGER trg_contractors_set_timestamp
BEFORE UPDATE ON public.contractors
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
