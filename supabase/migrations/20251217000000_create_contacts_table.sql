-- Create contacts table for non-authenticated team members and general contact directory
-- This table stores contact information for people who are not yet Supabase users
-- but may need to be assigned as team members or referenced in the system

BEGIN;

-- Create the contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  role TEXT,
  company TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_created_by ON public.contacts(created_by);
CREATE INDEX idx_contacts_full_name ON public.contacts(full_name);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts table
-- Admin and project managers can view all contacts
CREATE POLICY "admin_pm_can_view_contacts"
  ON public.contacts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- Admin and project managers can insert contacts
CREATE POLICY "admin_pm_can_insert_contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- Admin and project managers can update contacts
CREATE POLICY "admin_pm_can_update_contacts"
  ON public.contacts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- Only admins can delete contacts
CREATE POLICY "admin_can_delete_contacts"
  ON public.contacts
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
