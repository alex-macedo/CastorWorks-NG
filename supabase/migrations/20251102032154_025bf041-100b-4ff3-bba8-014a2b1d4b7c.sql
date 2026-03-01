-- Create app_settings table for application-wide settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Default Labor Rates (per m²)
  labor_rate_mason NUMERIC DEFAULT 0,
  labor_rate_plumber NUMERIC DEFAULT 0,
  labor_rate_electrician NUMERIC DEFAULT 0,
  labor_rate_painter NUMERIC DEFAULT 0,
  labor_rate_manager NUMERIC DEFAULT 0,

  -- Default Project Settings
  default_state TEXT DEFAULT 'SP',
  default_profit_margin NUMERIC DEFAULT 10,
  default_freight_percentage NUMERIC DEFAULT 5,
  default_payment_terms TEXT DEFAULT 'standard',

  -- SINAPI Configuration
  sinapi_last_update DATE,
  sinapi_auto_update BOOLEAN DEFAULT false,
  sinapi_freight_markup NUMERIC DEFAULT 5,
  sinapi_material_markup NUMERIC DEFAULT 10,

  -- BDI Parameters (%)
  bdi_central_admin NUMERIC DEFAULT 3.5,
  bdi_site_overhead NUMERIC DEFAULT 4.0,
  bdi_financial_costs NUMERIC DEFAULT 2.0,
  bdi_risks_insurance NUMERIC DEFAULT 2.5,
  bdi_taxes NUMERIC DEFAULT 15.0,
  bdi_profit_margin NUMERIC DEFAULT 10.0,

  -- User Preferences
  theme TEXT DEFAULT 'light',
  default_report_template TEXT DEFAULT 'standard',
  notifications_project_updates BOOLEAN DEFAULT true,
  notifications_financial_alerts BOOLEAN DEFAULT true,
  notifications_schedule_changes BOOLEAN DEFAULT true,
  notifications_material_delivery BOOLEAN DEFAULT false,

  -- Data Management
  last_backup_date TIMESTAMPTZ,
  auto_archive_months INTEGER DEFAULT 12,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default row (do nothing if one already exists)
INSERT INTO public.app_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT (id) DO NOTHING;

-- RLS policies for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_app_settings"
  ON public.app_settings;

DROP POLICY IF EXISTS "admin_update_app_settings"
  ON public.app_settings;

CREATE POLICY "authenticated_select_app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_update_app_settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default',

  -- Localization
  language TEXT DEFAULT 'pt-BR',
  currency TEXT DEFAULT 'BRL',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_zone TEXT DEFAULT 'America/Sao_Paulo',

  -- UI Preferences
  theme TEXT DEFAULT 'light',
  sidebar_collapsed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id)
);

-- Insert default row while the column is still TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    INSERT INTO public.user_preferences (user_id)
    VALUES ('default')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

-- RLS policies for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_user_preferences"
  ON public.user_preferences;

DROP POLICY IF EXISTS "authenticated_update_user_preferences"
  ON public.user_preferences;

DROP POLICY IF EXISTS "authenticated_insert_user_preferences"
  ON public.user_preferences;

DO $$
DECLARE
  v_user_id_type TEXT;
BEGIN
  SELECT data_type
  INTO v_user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_preferences'
    AND column_name = 'user_id'
  LIMIT 1;

  IF v_user_id_type = 'uuid' THEN
    CREATE POLICY "authenticated_select_user_preferences"
      ON public.user_preferences
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "authenticated_update_user_preferences"
      ON public.user_preferences
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "authenticated_insert_user_preferences"
      ON public.user_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  ELSE
    CREATE POLICY "authenticated_select_user_preferences"
      ON public.user_preferences
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);

    CREATE POLICY "authenticated_update_user_preferences"
      ON public.user_preferences
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);

    CREATE POLICY "authenticated_insert_user_preferences"
      ON public.user_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
END;
$$;

-- Create activity_templates table
CREATE TABLE IF NOT EXISTS public.activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for activity_templates
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_activity_templates"
  ON public.activity_templates;

DROP POLICY IF EXISTS "authenticated_insert_activity_templates"
  ON public.activity_templates;

DROP POLICY IF EXISTS "authenticated_update_non_system_templates"
  ON public.activity_templates;

DROP POLICY IF EXISTS "authenticated_delete_non_system_templates"
  ON public.activity_templates;

-- For now: any authenticated user can read templates
CREATE POLICY "authenticated_select_activity_templates"
  ON public.activity_templates
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only authenticated users, non-system templates for writes
CREATE POLICY "authenticated_insert_activity_templates"
  ON public.activity_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated_update_non_system_templates"
  ON public.activity_templates
  FOR UPDATE
  TO authenticated
  USING (is_system = false AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_system = false AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated_delete_non_system_templates"
  ON public.activity_templates
  FOR DELETE
  TO authenticated
  USING (is_system = false AND has_role(auth.uid(), 'admin'::app_role));

-- Create document_templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_document_templates"
  ON public.document_templates;

DROP POLICY IF EXISTS "authenticated_manage_custom_templates"
  ON public.document_templates;

-- Any authenticated user can read templates
CREATE POLICY "authenticated_select_document_templates"
  ON public.document_templates
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only allow managing non-system templates
CREATE POLICY "authenticated_manage_custom_templates"
  ON public.document_templates
  FOR ALL
  TO authenticated
  USING (is_system = false AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_system = false AND has_role(auth.uid(), 'admin'::app_role));

-- Add company_bio to company_settings if it exists
ALTER TABLE IF EXISTS public.company_settings
  ADD COLUMN IF NOT EXISTS company_bio TEXT;
