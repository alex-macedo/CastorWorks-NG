-- Fix function search path security issue
DROP FUNCTION IF EXISTS update_maintenance_settings_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_maintenance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER maintenance_settings_updated_at
  BEFORE UPDATE ON public.maintenance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_settings_updated_at();

CREATE TRIGGER scheduled_maintenance_updated_at
  BEFORE UPDATE ON public.scheduled_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_settings_updated_at();