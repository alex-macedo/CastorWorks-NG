-- Fix function search path security warning (drop cascade)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Recreate triggers
CREATE TRIGGER update_config_categories_updated_at
BEFORE UPDATE ON config_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_values_updated_at
BEFORE UPDATE ON config_values
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();