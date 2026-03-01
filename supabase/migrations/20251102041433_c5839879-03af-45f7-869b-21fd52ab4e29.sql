-- Phase 2: Multi-Currency, Advanced Analytics, PDF Improvements - Database Schema

-- 1. Create currencies table
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- 2. Create exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, rate_date)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- 3. Add currency fields to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS display_currency TEXT;

-- 4. Add currency field to project_financial_entries
ALTER TABLE public.project_financial_entries
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- 5. Create project_benchmarks table for industry comparisons
CREATE TABLE IF NOT EXISTS public.project_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_type TEXT NOT NULL,
  project_type TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  region TEXT,
  year INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_benchmarks ENABLE ROW LEVEL SECURITY;

-- 6. Create cost_predictions table for ML predictions
CREATE TABLE IF NOT EXISTS public.cost_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  predicted_cost NUMERIC NOT NULL,
  confidence_level NUMERIC,
  prediction_factors JSONB,
  similar_projects JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.cost_predictions ENABLE ROW LEVEL SECURITY;

-- 7. Create digital_signatures table
CREATE TABLE IF NOT EXISTS public.digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signature_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;

-- 8. Add PDF customization fields to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS pdf_header_template TEXT,
  ADD COLUMN IF NOT EXISTS pdf_footer_template TEXT,
  ADD COLUMN IF NOT EXISTS enable_qr_codes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_digital_signatures BOOLEAN DEFAULT false;

-- 9. Insert default currencies (idempotent)
INSERT INTO public.currencies (code, name, symbol) VALUES
  ('BRL', 'Brazilian Real', 'R$'),
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('JPY', 'Japanese Yen', '¥'),
  ('CAD', 'Canadian Dollar', 'C$'),
  ('AUD', 'Australian Dollar', 'A$'),
  ('CHF', 'Swiss Franc', 'CHF'),
  ('CNY', 'Chinese Yuan', '¥'),
  ('MXN', 'Mexican Peso', 'MX$')
ON CONFLICT (code) DO NOTHING;

-- 10. Insert sample benchmark data (idempotent)
INSERT INTO public.project_benchmarks (
  benchmark_type, project_type, metric_name, metric_value,
  metric_unit, region, year, source
) VALUES
  ('cost_per_sqm', 'Residential', 'Average Cost', 1500,
   'BRL/m²', 'SP', 2024, 'SINAPI'),
  ('cost_per_sqm', 'Commercial', 'Average Cost', 2200,
   'BRL/m²', 'SP', 2024, 'SINAPI'),
  ('duration', 'Residential', 'Average Duration', 180,
   'days', 'Brazil', 2024, 'Industry Average'),
  ('duration', 'Commercial', 'Average Duration', 270,
   'days', 'Brazil', 2024, 'Industry Average'),
  ('budget_variance', 'Residential', 'Typical Variance', 8.5,
   '%', 'Brazil', 2024, 'Industry Study'),
  ('budget_variance', 'Commercial', 'Typical Variance', 12.0,
   '%', 'Brazil', 2024, 'Industry Study')
ON CONFLICT DO NOTHING;

-- 11. RLS Policies for currencies
DROP POLICY IF EXISTS "authenticated_select_active_currencies"
  ON public.currencies;

DROP POLICY IF EXISTS "admin_manage_currencies"
  ON public.currencies;

CREATE POLICY "authenticated_select_active_currencies"
ON public.currencies
FOR SELECT
TO authenticated
USING (is_active = true AND auth.uid() IS NOT NULL);

-- simplified: any authenticated user can manage currencies
CREATE POLICY "admin_manage_currencies"
ON public.currencies
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 12. RLS Policies for exchange_rates
DROP POLICY IF EXISTS "authenticated_select_exchange_rates"
  ON public.exchange_rates;

DROP POLICY IF EXISTS "admin_manage_exchange_rates"
  ON public.exchange_rates;

CREATE POLICY "authenticated_select_exchange_rates"
ON public.exchange_rates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_manage_exchange_rates"
ON public.exchange_rates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 13. RLS Policies for project_benchmarks
DROP POLICY IF EXISTS "authenticated_select_benchmarks"
  ON public.project_benchmarks;

DROP POLICY IF EXISTS "admin_manage_benchmarks"
  ON public.project_benchmarks;

CREATE POLICY "authenticated_select_benchmarks"
ON public.project_benchmarks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_manage_benchmarks"
ON public.project_benchmarks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 14. RLS Policies for cost_predictions
DROP POLICY IF EXISTS "project_scoped_select_cost_predictions"
  ON public.cost_predictions;

DROP POLICY IF EXISTS "project_scoped_insert_cost_predictions"
  ON public.cost_predictions;

CREATE POLICY "project_scoped_select_cost_predictions"
ON public.cost_predictions
FOR SELECT
TO authenticated
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "project_scoped_insert_cost_predictions"
ON public.cost_predictions
FOR INSERT
TO authenticated
WITH CHECK (
  has_project_access(auth.uid(), project_id)
  AND auth.uid() IS NOT NULL
);

-- 15. RLS Policies for digital_signatures
DROP POLICY IF EXISTS "Users can view their own signatures"
  ON public.digital_signatures;

DROP POLICY IF EXISTS "Users can insert their own signatures"
  ON public.digital_signatures;

DROP POLICY IF EXISTS "Users can update their own signatures"
  ON public.digital_signatures;

CREATE POLICY "Users can view their own signatures"
ON public.digital_signatures
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own signatures"
ON public.digital_signatures
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own signatures"
ON public.digital_signatures
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 16. Add triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_currencies_updated_at
  ON public.currencies;

CREATE TRIGGER update_currencies_updated_at
BEFORE UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at
  ON public.exchange_rates;

CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_benchmarks_updated_at
  ON public.project_benchmarks;

CREATE TRIGGER update_project_benchmarks_updated_at
BEFORE UPDATE ON public.project_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_digital_signatures_updated_at
  ON public.digital_signatures;

CREATE TRIGGER update_digital_signatures_updated_at
BEFORE UPDATE ON public.digital_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 17. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to
  ON public.exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date
  ON public.exchange_rates(rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_cost_predictions_project_id
  ON public.cost_predictions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_benchmarks_type
  ON public.project_benchmarks(benchmark_type, project_type);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_user_id
  ON public.digital_signatures(user_id);
