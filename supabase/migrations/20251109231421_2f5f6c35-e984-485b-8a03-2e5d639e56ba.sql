-- Create maintenance_settings table
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  estimated_time TEXT,
  contact_email TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create scheduled_maintenance table
CREATE TABLE IF NOT EXISTS public.scheduled_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_maintenance ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_settings (admins only)
DROP POLICY IF EXISTS "Admins can view maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Admins can view maintenance settings"
  ON public.maintenance_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Admins can update maintenance settings"
  ON public.maintenance_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for scheduled_maintenance (admins only)
DROP POLICY IF EXISTS "Admins can view scheduled maintenance" ON public.scheduled_maintenance;
CREATE POLICY "Admins can view scheduled maintenance"
  ON public.scheduled_maintenance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage scheduled maintenance" ON public.scheduled_maintenance;
CREATE POLICY "Admins can manage scheduled maintenance"
  ON public.scheduled_maintenance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default maintenance settings if none exist
INSERT INTO public.maintenance_settings (enabled, estimated_time, contact_email)
SELECT false, 'a few hours', 'support@engproapp.com'
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_settings);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_maintenance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_settings_updated_at ON public.maintenance_settings;
CREATE TRIGGER maintenance_settings_updated_at
  BEFORE UPDATE ON public.maintenance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_settings_updated_at();

DROP TRIGGER IF EXISTS scheduled_maintenance_updated_at ON public.scheduled_maintenance;
CREATE TRIGGER scheduled_maintenance_updated_at
  BEFORE UPDATE ON public.scheduled_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_settings_updated_at();
