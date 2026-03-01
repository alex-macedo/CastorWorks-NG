-- Migration: Migrate contractors data to contacts table
-- Phase 4 of Contractor List merge into Contact List
-- This migration is idempotent and can be run multiple times safely

-- Insert contractors into contacts table
-- Map resource_type to the new contact type system
INSERT INTO public.contacts (
  full_name,
  email,
  phone_number,
  address,
  city,
  zip_code,
  company,
  notes,
  role,
  created_at,
  updated_at
)
SELECT
  -- Use contact_name if available, otherwise use company name
  COALESCE(NULLIF(contact_name, ''), name) as full_name,
  email,
  phone as phone_number,
  address,
  city,
  postal_code as zip_code,
  company,
  CASE
    WHEN notes IS NOT NULL AND license_number IS NOT NULL THEN
      notes || E'\n\n' || 'License: ' || license_number
    WHEN license_number IS NOT NULL THEN
      'License: ' || license_number
    ELSE notes
  END as notes,
  -- Map resource_type enum to contact type id
  CASE resource_type::text
    WHEN 'subcontractor' THEN 'subcontractor'
    WHEN 'supplier' THEN 'supplier'
    WHEN 'vendor' THEN 'supplier'
    ELSE 'contractor'
  END as role,
  created_at,
  updated_at
FROM public.contractors
WHERE is_active = true
  -- Avoid duplicates by checking email (if exists) or name+company combination
  AND NOT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE (
      -- Match by email if both have email
      (contractors.email IS NOT NULL AND c.email = contractors.email)
      OR
      -- Match by name+company if no email
      (contractors.email IS NULL AND c.full_name = COALESCE(NULLIF(contractors.contact_name, ''), contractors.name)
       AND COALESCE(c.company, '') = COALESCE(contractors.company, ''))
    )
  );

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % contractors to contacts table', migrated_count;
END $$;

-- Add comment to contractors table marking it as deprecated
COMMENT ON TABLE public.contractors IS 'DEPRECATED: Data migrated to contacts table. This table is kept for reference and will be removed in a future release.';
