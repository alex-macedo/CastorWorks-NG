-- ============================================================================
-- Insert Clients for Seeding
-- ============================================================================
-- Migration: 20260125170001
-- Description: RPC function to insert clients for seeding, bypassing RLS
-- Uses SECURITY DEFINER to bypass RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_clients_for_seeding(p_clients JSONB)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record JSONB;
BEGIN
  -- Loop through each client in the JSONB array and insert
  FOR client_record IN SELECT * FROM jsonb_array_elements(p_clients)
  LOOP
    -- Insert client (bypasses RLS due to SECURITY DEFINER)
    RETURN QUERY
    INSERT INTO clients (
      name,
      email,
      phone,
      location,
      company_name,
      status,
      client_type,
      sales_status
    )
    VALUES (
      client_record->>'name',
      client_record->>'email',
      client_record->>'phone',
      client_record->>'location',
      client_record->>'company_name',
      COALESCE(client_record->>'status', 'active'),
      client_record->>'client_type',
      client_record->>'sales_status'
    )
    RETURNING *;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_clients_for_seeding(JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.insert_clients_for_seeding(JSONB) IS 
  'Inserts clients for seeding purposes. Uses SECURITY DEFINER to bypass RLS policies.';
