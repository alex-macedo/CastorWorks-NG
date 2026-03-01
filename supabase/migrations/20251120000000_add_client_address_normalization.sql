-- Add raw input and normalized address fields for clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS raw_input_country text,
  ADD COLUMN IF NOT EXISTS raw_input_postal_code text,
  ADD COLUMN IF NOT EXISTS raw_input_line1 text,
  ADD COLUMN IF NOT EXISTS raw_input_line2 text,
  ADD COLUMN IF NOT EXISTS raw_input_city text,
  ADD COLUMN IF NOT EXISTS raw_input_region text,
  ADD COLUMN IF NOT EXISTS raw_input_district text,
  ADD COLUMN IF NOT EXISTS normalized_country text,
  ADD COLUMN IF NOT EXISTS normalized_postal_code text,
  ADD COLUMN IF NOT EXISTS normalized_line1 text,
  ADD COLUMN IF NOT EXISTS normalized_line2 text,
  ADD COLUMN IF NOT EXISTS normalized_city text,
  ADD COLUMN IF NOT EXISTS normalized_region text,
  ADD COLUMN IF NOT EXISTS normalized_district text,
  ADD COLUMN IF NOT EXISTS normalized_zip5 text,
  ADD COLUMN IF NOT EXISTS normalized_zip4 text,
  ADD COLUMN IF NOT EXISTS normalized_ibge text,
  ADD COLUMN IF NOT EXISTS normalized_source text,
  ADD COLUMN IF NOT EXISTS normalized_is_valid boolean,
  ADD COLUMN IF NOT EXISTS normalized_is_deliverable boolean,
  ADD COLUMN IF NOT EXISTS normalized_messages text[],
  ADD COLUMN IF NOT EXISTS normalized_warnings text[],
  ADD COLUMN IF NOT EXISTS standardized_source text,
  ADD COLUMN IF NOT EXISTS standardized_at timestamptz;

COMMENT ON COLUMN public.clients.raw_input_country IS
  'Country code as entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_postal_code IS
  'Postal code or ZIP entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_line1 IS
  'Line1 as entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_line2 IS
  'Line2 as entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_city IS
  'City as entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_region IS
  'Region/state as entered by the user.';
COMMENT ON COLUMN public.clients.raw_input_district IS
  'District/bairro as entered by the user.';
COMMENT ON COLUMN public.clients.normalized_source IS
  'Provider used for normalization.';
COMMENT ON COLUMN public.clients.standardized_at IS
  'Timestamp for standardized address data.';
