CREATE EXTENSION IF NOT EXISTS pgcrypto; 

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'config_entity_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.config_entity_type AS ENUM (
      'category',
      'value'
    );
  END IF;
END;
$$;

-- Table 1: Config Categories
CREATE TABLE IF NOT EXISTS public.config_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_key TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Config Values
CREATE TABLE IF NOT EXISTS public.config_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.config_categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_key TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, key)
);

-- Table 3: Config Translations
CREATE TABLE IF NOT EXISTS public.config_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.config_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  language_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, language_code)
);

-- Enable RLS
ALTER TABLE public.config_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read configuration data (reference data)

-- Config values: authenticated users can read active config values
DROP POLICY IF EXISTS "Anyone can read active config values"
  ON public.config_values;

DROP POLICY IF EXISTS "authenticated_select_active_config_values"
  ON public.config_values;

CREATE POLICY "authenticated_select_active_config_values"
  ON public.config_values
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (auth.jwt() ->> 'role') = 'service_role');

-- Config translations: authenticated users can read config translations
DROP POLICY IF EXISTS "Anyone can read config translations"
  ON public.config_translations;

DROP POLICY IF EXISTS "authenticated_select_config_translations"
  ON public.config_translations;

CREATE POLICY "authenticated_select_config_translations"
  ON public.config_translations
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Config categories: authenticated users can read categories
DROP POLICY IF EXISTS "Anyone can read config categories"
  ON public.config_categories;

DROP POLICY IF EXISTS "authenticated_select_config_categories"
  ON public.config_categories;

CREATE POLICY "authenticated_select_config_categories"
  ON public.config_categories
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers (idempotent)

-- Categories trigger
DROP TRIGGER IF EXISTS update_config_categories_updated_at
  ON public.config_categories;

CREATE TRIGGER update_config_categories_updated_at
BEFORE UPDATE ON public.config_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Values trigger
DROP TRIGGER IF EXISTS update_config_values_updated_at
  ON public.config_values;

CREATE TRIGGER update_config_values_updated_at
BEFORE UPDATE ON public.config_values
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED DATA: Insert all categories
INSERT INTO config_categories (key, name_key, is_system, sort_order) VALUES
  ('project_types', 'config.categories.projectTypes', true, 1),
  ('project_status', 'config.categories.projectStatus', true, 2),
  ('task_status', 'config.categories.taskStatus', true, 3),
  ('transaction_type', 'config.categories.transactionType', true, 4),
  ('transaction_category', 'config.categories.transactionCategory', true, 5),
  ('payment_methods', 'config.categories.paymentMethods', true, 6),
  ('priority', 'config.categories.priority', true, 7),
  ('client_type', 'config.categories.clientType', true, 8),
  ('weather', 'config.categories.weather', true, 9),
  ('language', 'config.categories.language', true, 10),
  ('currency', 'config.categories.currency', true, 11),
  ('date_format', 'config.categories.dateFormat', true, 12),
  ('time_zone', 'config.categories.timeZone', true, 13)
ON CONFLICT (key) DO NOTHING;
-- fixed: config_categories has UNIQUE(key)

-- SEED DATA: Insert all values

-- Project Types
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'project_types'), 'residential', 'config.values.residential', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'project_types'), 'commercial', 'config.values.commercial', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'project_types'), 'renovation', 'config.values.renovation', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'project_types'), 'infrastructure', 'config.values.infrastructure', true, 4)
ON CONFLICT (category_id, key) DO NOTHING;

-- Project Status
INSERT INTO config_values (category_id, key, value_key, color, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'planning', 'config.values.planning', 'blue', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'in_progress', 'config.values.inProgress', 'yellow', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'paused', 'config.values.paused', 'orange', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'completed', 'config.values.completed', 'green', true, 4),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'active', 'config.values.active', 'green', true, 5),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'delayed', 'config.values.delayed', 'red', true, 6),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'on_track', 'config.values.onTrack', 'green', true, 7),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'at_risk', 'config.values.atRisk', 'orange', true, 8),
  ((SELECT id FROM config_categories WHERE key = 'project_status'), 'on_hold', 'config.values.onHold', 'gray', true, 9)
ON CONFLICT (category_id, key) DO NOTHING;

-- Task Status
INSERT INTO config_values (category_id, key, value_key, color, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'task_status'), 'pending', 'config.values.pending', 'gray', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'task_status'), 'in_progress', 'config.values.inProgress', 'yellow', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'task_status'), 'completed', 'config.values.completed', 'green', true, 3)
ON CONFLICT (category_id, key) DO NOTHING;

-- Transaction Type
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'transaction_type'), 'income', 'config.values.income', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'transaction_type'), 'expense', 'config.values.expense', true, 2)
ON CONFLICT (category_id, key) DO NOTHING;

-- Transaction Category
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'materials', 'config.values.materials', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'labor', 'config.values.labor', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'equipment', 'config.values.equipment', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'services', 'config.values.services', true, 4),
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'client_payment', 'config.values.clientPayment', true, 5),
  ((SELECT id FROM config_categories WHERE key = 'transaction_category'), 'other', 'config.values.other', true, 6)
ON CONFLICT (category_id, key) DO NOTHING;

-- Payment Methods
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'payment_methods'), 'cash', 'config.values.cash', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'payment_methods'), 'bank_transfer', 'config.values.bankTransfer', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'payment_methods'), 'credit_card', 'config.values.creditCard', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'payment_methods'), 'debit_card', 'config.values.debitCard', true, 4),
  ((SELECT id FROM config_categories WHERE key = 'payment_methods'), 'check', 'config.values.check', true, 5)
ON CONFLICT (category_id, key) DO NOTHING;

-- Priority
INSERT INTO config_values (category_id, key, value_key, color, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'priority'), 'low', 'config.values.low', 'green', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'priority'), 'medium', 'config.values.medium', 'yellow', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'priority'), 'high', 'config.values.high', 'orange', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'priority'), 'urgent', 'config.values.urgent', 'red', true, 4)
ON CONFLICT (category_id, key) DO NOTHING;

-- Client Type
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'client_type'), 'individual', 'config.values.individual', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'client_type'), 'company', 'config.values.company', true, 2)
ON CONFLICT (category_id, key) DO NOTHING;

-- Weather
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'weather'), 'sunny', 'config.values.sunny', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'weather'), 'cloudy', 'config.values.cloudy', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'weather'), 'rainy', 'config.values.rainy', true, 3)
ON CONFLICT (category_id, key) DO NOTHING;

-- Language
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'language'), 'en-US', 'config.values.enUS', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'language'), 'pt-BR', 'config.values.ptBR', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'language'), 'es-ES', 'config.values.esES', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'language'), 'fr-FR', 'config.values.frFR', true, 4)
ON CONFLICT (category_id, key) DO NOTHING;

-- Currency
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'currency'), 'BRL', 'config.values.BRL', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'currency'), 'USD', 'config.values.USD', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'currency'), 'EUR', 'config.values.EUR', true, 3)
ON CONFLICT (category_id, key) DO NOTHING;

-- Date Format
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'date_format'), 'DD/MM/YYYY', 'config.values.ddmmyyyy', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'date_format'), 'MM/DD/YYYY', 'config.values.mmddyyyy', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'date_format'), 'YYYY-MM-DD', 'config.values.yyyymmdd', true, 3)
ON CONFLICT (category_id, key) DO NOTHING;

-- Time Zone
INSERT INTO config_values (category_id, key, value_key, is_system, sort_order) VALUES
  ((SELECT id FROM config_categories WHERE key = 'time_zone'), 'America/Sao_Paulo', 'config.values.americaSaoPaulo', true, 1),
  ((SELECT id FROM config_categories WHERE key = 'time_zone'), 'America/New_York', 'config.values.americaNewYork', true, 2),
  ((SELECT id FROM config_categories WHERE key = 'time_zone'), 'Europe/London', 'config.values.europeLondon', true, 3),
  ((SELECT id FROM config_categories WHERE key = 'time_zone'), 'Asia/Tokyo', 'config.values.asiaTokyo', true, 4)
ON CONFLICT (category_id, key) DO NOTHING;

-- TRANSLATIONS: English (en-US)

-- Category translations
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('category', (SELECT id FROM config_categories WHERE key = 'project_types'), 'en-US', 'Project Types'),
  ('category', (SELECT id FROM config_categories WHERE key = 'project_status'), 'en-US', 'Project Status'),
  ('category', (SELECT id FROM config_categories WHERE key = 'task_status'), 'en-US', 'Task Status'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_type'), 'en-US', 'Transaction Type'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_category'), 'en-US', 'Transaction Category'),
  ('category', (SELECT id FROM config_categories WHERE key = 'payment_methods'), 'en-US', 'Payment Methods'),
  ('category', (SELECT id FROM config_categories WHERE key = 'priority'), 'en-US', 'Priority'),
  ('category', (SELECT id FROM config_categories WHERE key = 'client_type'), 'en-US', 'Client Type'),
  ('category', (SELECT id FROM config_categories WHERE key = 'weather'), 'en-US', 'Weather'),
  ('category', (SELECT id FROM config_categories WHERE key = 'language'), 'en-US', 'Language'),
  ('category', (SELECT id FROM config_categories WHERE key = 'currency'), 'en-US', 'Currency'),
  ('category', (SELECT id FROM config_categories WHERE key = 'date_format'), 'en-US', 'Date Format'),
  ('category', (SELECT id FROM config_categories WHERE key = 'time_zone'), 'en-US', 'Time Zone')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- Value translations (en-US)
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('value', (SELECT id FROM config_values WHERE key = 'residential' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'en-US', 'Residential'),
  ('value', (SELECT id FROM config_values WHERE key = 'commercial' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'en-US', 'Commercial'),
  ('value', (SELECT id FROM config_values WHERE key = 'renovation' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'en-US', 'Renovation'),
  ('value', (SELECT id FROM config_values WHERE key = 'infrastructure' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'en-US', 'Infrastructure'),
  ('value', (SELECT id FROM config_values WHERE key = 'planning' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'Planning'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'In Progress'),
  ('value', (SELECT id FROM config_values WHERE key = 'paused' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'Paused'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'Completed'),
  ('value', (SELECT id FROM config_values WHERE key = 'active' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'Active'),
  ('value', (SELECT id FROM config_values WHERE key = 'delayed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'Delayed'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_track' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'On Track'),
  ('value', (SELECT id FROM config_values WHERE key = 'at_risk' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'At Risk'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_hold' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'en-US', 'On Hold'),
  ('value', (SELECT id FROM config_values WHERE key = 'pending' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'en-US', 'Pending'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'en-US', 'In Progress'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'en-US', 'Completed'),
  ('value', (SELECT id FROM config_values WHERE key = 'income' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'en-US', 'Income'),
  ('value', (SELECT id FROM config_values WHERE key = 'expense' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'en-US', 'Expense'),
  ('value', (SELECT id FROM config_values WHERE key = 'materials' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Materials'),
  ('value', (SELECT id FROM config_values WHERE key = 'labor' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Labor'),
  ('value', (SELECT id FROM config_values WHERE key = 'equipment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Equipment'),
  ('value', (SELECT id FROM config_values WHERE key = 'services' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Services'),
  ('value', (SELECT id FROM config_values WHERE key = 'client_payment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Client Payment'),
  ('value', (SELECT id FROM config_values WHERE key = 'other' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'en-US', 'Other'),
  ('value', (SELECT id FROM config_values WHERE key = 'cash' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'en-US', 'Cash'),
  ('value', (SELECT id FROM config_values WHERE key = 'bank_transfer' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'en-US', 'Bank Transfer'),
  ('value', (SELECT id FROM config_values WHERE key = 'credit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'en-US', 'Credit Card'),
  ('value', (SELECT id FROM config_values WHERE key = 'debit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'en-US', 'Debit Card'),
  ('value', (SELECT id FROM config_values WHERE key = 'check' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'en-US', 'Check'),
  ('value', (SELECT id FROM config_values WHERE key = 'low' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'en-US', 'Low'),
  ('value', (SELECT id FROM config_values WHERE key = 'medium' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'en-US', 'Medium'),
  ('value', (SELECT id FROM config_values WHERE key = 'high' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'en-US', 'High'),
  ('value', (SELECT id FROM config_values WHERE key = 'urgent' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'en-US', 'Urgent'),
  ('value', (SELECT id FROM config_values WHERE key = 'individual' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'en-US', 'Individual'),
  ('value', (SELECT id FROM config_values WHERE key = 'company' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'en-US', 'Company'),
  ('value', (SELECT id FROM config_values WHERE key = 'sunny' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'en-US', 'Sunny'),
  ('value', (SELECT id FROM config_values WHERE key = 'cloudy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'en-US', 'Cloudy'),
  ('value', (SELECT id FROM config_values WHERE key = 'rainy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'en-US', 'Rainy'),
  ('value', (SELECT id FROM config_values WHERE key = 'en-US' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'en-US', 'English (US)'),
  ('value', (SELECT id FROM config_values WHERE key = 'pt-BR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'en-US', 'Portuguese (Brazil)'),
  ('value', (SELECT id FROM config_values WHERE key = 'es-ES' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'en-US', 'Spanish (Spain)'),
  ('value', (SELECT id FROM config_values WHERE key = 'fr-FR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'en-US', 'French (France)'),
  ('value', (SELECT id FROM config_values WHERE key = 'BRL' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'en-US', 'Brazilian Real (R$)'),
  ('value', (SELECT id FROM config_values WHERE key = 'USD' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'en-US', 'US Dollar ($)'),
  ('value', (SELECT id FROM config_values WHERE key = 'EUR' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'en-US', 'Euro (€)'),
  ('value', (SELECT id FROM config_values WHERE key = 'DD/MM/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'en-US', 'DD/MM/YYYY'),
  ('value', (SELECT id FROM config_values WHERE key = 'MM/DD/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'en-US', 'MM/DD/YYYY'),
  ('value', (SELECT id FROM config_values WHERE key = 'YYYY-MM-DD' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'en-US', 'YYYY-MM-DD'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/Sao_Paulo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'en-US', 'São Paulo (GMT-3)'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/New_York' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'en-US', 'New York (GMT-5)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Europe/London' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'en-US', 'London (GMT+0)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Asia/Tokyo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'en-US', 'Tokyo (GMT+9)')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- TRANSLATIONS: Portuguese (pt-BR)

-- Category translations
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('category', (SELECT id FROM config_categories WHERE key = 'project_types'), 'pt-BR', 'Tipos de Obra'),
  ('category', (SELECT id FROM config_categories WHERE key = 'project_status'), 'pt-BR', 'Status da Obra'),
  ('category', (SELECT id FROM config_categories WHERE key = 'task_status'), 'pt-BR', 'Status da Tarefa'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_type'), 'pt-BR', 'Tipo de Transação'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_category'), 'pt-BR', 'Categoria de Transação'),
  ('category', (SELECT id FROM config_categories WHERE key = 'payment_methods'), 'pt-BR', 'Métodos de Pagamento'),
  ('category', (SELECT id FROM config_categories WHERE key = 'priority'), 'pt-BR', 'Prioridade'),
  ('category', (SELECT id FROM config_categories WHERE key = 'client_type'), 'pt-BR', 'Tipo de Cliente'),
  ('category', (SELECT id FROM config_categories WHERE key = 'weather'), 'pt-BR', 'Clima'),
  ('category', (SELECT id FROM config_categories WHERE key = 'language'), 'pt-BR', 'Idioma'),
  ('category', (SELECT id FROM config_categories WHERE key = 'currency'), 'pt-BR', 'Moeda'),
  ('category', (SELECT id FROM config_categories WHERE key = 'date_format'), 'pt-BR', 'Formato de Data'),
  ('category', (SELECT id FROM config_categories WHERE key = 'time_zone'), 'pt-BR', 'Fuso Horário')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- Value translations (pt-BR)
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('value', (SELECT id FROM config_values WHERE key = 'residential' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'pt-BR', 'Residencial'),
  ('value', (SELECT id FROM config_values WHERE key = 'commercial' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'pt-BR', 'Comercial'),
  ('value', (SELECT id FROM config_values WHERE key = 'renovation' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'pt-BR', 'Reforma'),
  ('value', (SELECT id FROM config_values WHERE key = 'infrastructure' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'pt-BR', 'Infraestrutura'),
  ('value', (SELECT id FROM config_values WHERE key = 'planning' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Planejamento'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Em Andamento'),
  ('value', (SELECT id FROM config_values WHERE key = 'paused' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Pausado'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Concluído'),
  ('value', (SELECT id FROM config_values WHERE key = 'active' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Ativo'),
  ('value', (SELECT id FROM config_values WHERE key = 'delayed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Atrasado'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_track' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'No Prazo'),
  ('value', (SELECT id FROM config_values WHERE key = 'at_risk' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Em Risco'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_hold' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'pt-BR', 'Em Espera'),
  ('value', (SELECT id FROM config_values WHERE key = 'pending' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'pt-BR', 'Pendente'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'pt-BR', 'Em Andamento'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'pt-BR', 'Concluído'),
  ('value', (SELECT id FROM config_values WHERE key = 'income' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'pt-BR', 'Receita'),
  ('value', (SELECT id FROM config_values WHERE key = 'expense' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'pt-BR', 'Despesa'),
  ('value', (SELECT id FROM config_values WHERE key = 'materials' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Materiais'),
  ('value', (SELECT id FROM config_values WHERE key = 'labor' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Mão de Obra'),
  ('value', (SELECT id FROM config_values WHERE key = 'equipment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Equipamento'),
  ('value', (SELECT id FROM config_values WHERE key = 'services' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Serviços'),
  ('value', (SELECT id FROM config_values WHERE key = 'client_payment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Pagamento de Cliente'),
  ('value', (SELECT id FROM config_values WHERE key = 'other' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'pt-BR', 'Outro'),
  ('value', (SELECT id FROM config_values WHERE key = 'cash' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'pt-BR', 'Dinheiro'),
  ('value', (SELECT id FROM config_values WHERE key = 'bank_transfer' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'pt-BR', 'Transferência Bancária'),
  ('value', (SELECT id FROM config_values WHERE key = 'credit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'pt-BR', 'Cartão de Crédito'),
  ('value', (SELECT id FROM config_values WHERE key = 'debit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'pt-BR', 'Cartão de Débito'),
  ('value', (SELECT id FROM config_values WHERE key = 'check' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'pt-BR', 'Cheque'),
  ('value', (SELECT id FROM config_values WHERE key = 'low' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'pt-BR', 'Baixa'),
  ('value', (SELECT id FROM config_values WHERE key = 'medium' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'pt-BR', 'Média'),
  ('value', (SELECT id FROM config_values WHERE key = 'high' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'pt-BR', 'Alta'),
  ('value', (SELECT id FROM config_values WHERE key = 'urgent' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'pt-BR', 'Urgente'),
  ('value', (SELECT id FROM config_values WHERE key = 'individual' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'pt-BR', 'Pessoa Física'),
  ('value', (SELECT id FROM config_values WHERE key = 'company' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'pt-BR', 'Empresa'),
  ('value', (SELECT id FROM config_values WHERE key = 'sunny' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'pt-BR', 'Ensolarado'),
  ('value', (SELECT id FROM config_values WHERE key = 'cloudy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'pt-BR', 'Nublado'),
  ('value', (SELECT id FROM config_values WHERE key = 'rainy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'pt-BR', 'Chuvoso'),
  ('value', (SELECT id FROM config_values WHERE key = 'en-US' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'pt-BR', 'Inglês (EUA)'),
  ('value', (SELECT id FROM config_values WHERE key = 'pt-BR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'pt-BR', 'Português (Brasil)'),
  ('value', (SELECT id FROM config_values WHERE key = 'es-ES' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'pt-BR', 'Espanhol (Espanha)'),
  ('value', (SELECT id FROM config_values WHERE key = 'fr-FR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'pt-BR', 'Francês (França)'),
  ('value', (SELECT id FROM config_values WHERE key = 'BRL' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'pt-BR', 'Real Brasileiro (R$)'),
  ('value', (SELECT id FROM config_values WHERE key = 'USD' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'pt-BR', 'Dólar Americano ($)'),
  ('value', (SELECT id FROM config_values WHERE key = 'EUR' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'pt-BR', 'Euro (€)'),
  ('value', (SELECT id FROM config_values WHERE key = 'DD/MM/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'pt-BR', 'DD/MM/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'MM/DD/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'pt-BR', 'MM/DD/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'YYYY-MM-DD' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'pt-BR', 'AAAA-MM-DD'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/Sao_Paulo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'pt-BR', 'São Paulo (GMT-3)'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/New_York' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'pt-BR', 'Nova York (GMT-5)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Europe/London' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'pt-BR', 'Londres (GMT+0)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Asia/Tokyo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'pt-BR', 'Tóquio (GMT+9)')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- TRANSLATIONS: Spanish (es-ES)

-- Category translations
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('category', (SELECT id FROM config_categories WHERE key = 'project_types'), 'es-ES', 'Tipos de Proyecto'),
  ('category', (SELECT id FROM config_categories WHERE key = 'project_status'), 'es-ES', 'Estado del Proyecto'),
  ('category', (SELECT id FROM config_categories WHERE key = 'task_status'), 'es-ES', 'Estado de la Tarea'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_type'), 'es-ES', 'Tipo de Transacción'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_category'), 'es-ES', 'Categoría de Transacción'),
  ('category', (SELECT id FROM config_categories WHERE key = 'payment_methods'), 'es-ES', 'Métodos de Pago'),
  ('category', (SELECT id FROM config_categories WHERE key = 'priority'), 'es-ES', 'Prioridad'),
  ('category', (SELECT id FROM config_categories WHERE key = 'client_type'), 'es-ES', 'Tipo de Cliente'),
  ('category', (SELECT id FROM config_categories WHERE key = 'weather'), 'es-ES', 'Clima'),
  ('category', (SELECT id FROM config_categories WHERE key = 'language'), 'es-ES', 'Idioma'),
  ('category', (SELECT id FROM config_categories WHERE key = 'currency'), 'es-ES', 'Moneda'),
  ('category', (SELECT id FROM config_categories WHERE key = 'date_format'), 'es-ES', 'Formato de Fecha'),
  ('category', (SELECT id FROM config_categories WHERE key = 'time_zone'), 'es-ES', 'Zona Horaria')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- Value translations (es-ES)
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('value', (SELECT id FROM config_values WHERE key = 'residential' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'es-ES', 'Residencial'),
  ('value', (SELECT id FROM config_values WHERE key = 'commercial' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'es-ES', 'Comercial'),
  ('value', (SELECT id FROM config_values WHERE key = 'renovation' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'es-ES', 'Renovación'),
  ('value', (SELECT id FROM config_values WHERE key = 'infrastructure' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'es-ES', 'Infraestructura'),
  ('value', (SELECT id FROM config_values WHERE key = 'planning' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'Planificación'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'En Progreso'),
  ('value', (SELECT id FROM config_values WHERE key = 'paused' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'Pausado'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'Completado'),
  ('value', (SELECT id FROM config_values WHERE key = 'active' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'Activo'),
  ('value', (SELECT id FROM config_values WHERE key = 'delayed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'Retrasado'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_track' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'En Marcha'),
  ('value', (SELECT id FROM config_values WHERE key = 'at_risk' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'En Riesgo'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_hold' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'es-ES', 'En Espera'),
  ('value', (SELECT id FROM config_values WHERE key = 'pending' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'es-ES', 'Pendiente'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'es-ES', 'En Progreso'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'es-ES', 'Completado'),
  ('value', (SELECT id FROM config_values WHERE key = 'income' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'es-ES', 'Ingreso'),
  ('value', (SELECT id FROM config_values WHERE key = 'expense' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'es-ES', 'Gasto'),
  ('value', (SELECT id FROM config_values WHERE key = 'materials' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Materiales'),
  ('value', (SELECT id FROM config_values WHERE key = 'labor' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Mano de Obra'),
  ('value', (SELECT id FROM config_values WHERE key = 'equipment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Equipo'),
  ('value', (SELECT id FROM config_values WHERE key = 'services' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Servicios'),
  ('value', (SELECT id FROM config_values WHERE key = 'client_payment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Pago de Cliente'),
  ('value', (SELECT id FROM config_values WHERE key = 'other' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'es-ES', 'Otro'),
  ('value', (SELECT id FROM config_values WHERE key = 'cash' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'es-ES', 'Efectivo'),
  ('value', (SELECT id FROM config_values WHERE key = 'bank_transfer' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'es-ES', 'Transferencia Bancaria'),
  ('value', (SELECT id FROM config_values WHERE key = 'credit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'es-ES', 'Tarjeta de Crédito'),
  ('value', (SELECT id FROM config_values WHERE key = 'debit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'es-ES', 'Tarjeta de Débito'),
  ('value', (SELECT id FROM config_values WHERE key = 'check' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'es-ES', 'Cheque'),
  ('value', (SELECT id FROM config_values WHERE key = 'low' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'es-ES', 'Baja'),
  ('value', (SELECT id FROM config_values WHERE key = 'medium' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'es-ES', 'Media'),
  ('value', (SELECT id FROM config_values WHERE key = 'high' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'es-ES', 'Alta'),
  ('value', (SELECT id FROM config_values WHERE key = 'urgent' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'es-ES', 'Urgente'),
  ('value', (SELECT id FROM config_values WHERE key = 'individual' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'es-ES', 'Individual'),
  ('value', (SELECT id FROM config_values WHERE key = 'company' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'es-ES', 'Empresa'),
  ('value', (SELECT id FROM config_values WHERE key = 'sunny' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'es-ES', 'Soleado'),
  ('value', (SELECT id FROM config_values WHERE key = 'cloudy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'es-ES', 'Nublado'),
  ('value', (SELECT id FROM config_values WHERE key = 'rainy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'es-ES', 'Lluvioso'),
  ('value', (SELECT id FROM config_values WHERE key = 'en-US' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'es-ES', 'Inglés (EE.UU.)'),
  ('value', (SELECT id FROM config_values WHERE key = 'pt-BR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'es-ES', 'Portugués (Brasil)'),
  ('value', (SELECT id FROM config_values WHERE key = 'es-ES' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'es-ES', 'Español (España)'),
  ('value', (SELECT id FROM config_values WHERE key = 'fr-FR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'es-ES', 'Francés (Francia)'),
  ('value', (SELECT id FROM config_values WHERE key = 'BRL' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'es-ES', 'Real Brasileño (R$)'),
  ('value', (SELECT id FROM config_values WHERE key = 'USD' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'es-ES', 'Dólar Estadounidense ($)'),
  ('value', (SELECT id FROM config_values WHERE key = 'EUR' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'es-ES', 'Euro (€)'),
  ('value', (SELECT id FROM config_values WHERE key = 'DD/MM/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'es-ES', 'DD/MM/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'MM/DD/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'es-ES', 'MM/DD/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'YYYY-MM-DD' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'es-ES', 'AAAA-MM-DD'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/Sao_Paulo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'es-ES', 'São Paulo (GMT-3)'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/New_York' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'es-ES', 'Nueva York (GMT-5)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Europe/London' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'es-ES', 'Londres (GMT+0)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Asia/Tokyo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'es-ES', 'Tokio (GMT+9)')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- TRANSLATIONS: French (fr-FR)

-- Category translations
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('category', (SELECT id FROM config_categories WHERE key = 'project_types'), 'fr-FR', 'Types de Projet'),
  ('category', (SELECT id FROM config_categories WHERE key = 'project_status'), 'fr-FR', 'Statut du Projet'),
  ('category', (SELECT id FROM config_categories WHERE key = 'task_status'), 'fr-FR', 'Statut de la Tâche'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_type'), 'fr-FR', 'Type de Transaction'),
  ('category', (SELECT id FROM config_categories WHERE key = 'transaction_category'), 'fr-FR', 'Catégorie de Transaction'),
  ('category', (SELECT id FROM config_categories WHERE key = 'payment_methods'), 'fr-FR', 'Méthodes de Paiement'),
  ('category', (SELECT id FROM config_categories WHERE key = 'priority'), 'fr-FR', 'Priorité'),
  ('category', (SELECT id FROM config_categories WHERE key = 'client_type'), 'fr-FR', 'Type de Client'),
  ('category', (SELECT id FROM config_categories WHERE key = 'weather'), 'fr-FR', 'Météo'),
  ('category', (SELECT id FROM config_categories WHERE key = 'language'), 'fr-FR', 'Langue'),
  ('category', (SELECT id FROM config_categories WHERE key = 'currency'), 'fr-FR', 'Devise'),
  ('category', (SELECT id FROM config_categories WHERE key = 'date_format'), 'fr-FR', 'Format de Date'),
  ('category', (SELECT id FROM config_categories WHERE key = 'time_zone'), 'fr-FR', 'Fuseau Horaire')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;

-- Value translations (fr-FR)
INSERT INTO config_translations (entity_type, entity_id, language_code, label) VALUES
  ('value', (SELECT id FROM config_values WHERE key = 'residential' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'fr-FR', 'Résidentiel'),
  ('value', (SELECT id FROM config_values WHERE key = 'commercial' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'fr-FR', 'Commercial'),
  ('value', (SELECT id FROM config_values WHERE key = 'renovation' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'fr-FR', 'Rénovation'),
  ('value', (SELECT id FROM config_values WHERE key = 'infrastructure' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_types')), 'fr-FR', 'Infrastructure'),
  ('value', (SELECT id FROM config_values WHERE key = 'planning' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'Planification'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'En Cours'),
  ('value', (SELECT id FROM config_values WHERE key = 'paused' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'En Pause'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'Terminé'),
  ('value', (SELECT id FROM config_values WHERE key = 'active' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'Actif'),
  ('value', (SELECT id FROM config_values WHERE key = 'delayed' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'En Retard'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_track' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'Dans les Temps'),
  ('value', (SELECT id FROM config_values WHERE key = 'at_risk' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'À Risque'),
  ('value', (SELECT id FROM config_values WHERE key = 'on_hold' AND category_id = (SELECT id FROM config_categories WHERE key = 'project_status')), 'fr-FR', 'En Attente'),
  ('value', (SELECT id FROM config_values WHERE key = 'pending' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'fr-FR', 'En Attente'),
  ('value', (SELECT id FROM config_values WHERE key = 'in_progress' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'fr-FR', 'En Cours'),
  ('value', (SELECT id FROM config_values WHERE key = 'completed' AND category_id = (SELECT id FROM config_categories WHERE key = 'task_status')), 'fr-FR', 'Terminé'),
  ('value', (SELECT id FROM config_values WHERE key = 'income' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'fr-FR', 'Revenu'),
  ('value', (SELECT id FROM config_values WHERE key = 'expense' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_type')), 'fr-FR', 'Dépense'),
  ('value', (SELECT id FROM config_values WHERE key = 'materials' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Matériaux'),
  ('value', (SELECT id FROM config_values WHERE key = 'labor' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Main-d''œuvre'),
  ('value', (SELECT id FROM config_values WHERE key = 'equipment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Équipement'),
  ('value', (SELECT id FROM config_values WHERE key = 'services' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Services'),
  ('value', (SELECT id FROM config_values WHERE key = 'client_payment' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Paiement Client'),
  ('value', (SELECT id FROM config_values WHERE key = 'other' AND category_id = (SELECT id FROM config_categories WHERE key = 'transaction_category')), 'fr-FR', 'Autre'),
  ('value', (SELECT id FROM config_values WHERE key = 'cash' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'fr-FR', 'Espèces'),
  ('value', (SELECT id FROM config_values WHERE key = 'bank_transfer' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'fr-FR', 'Virement Bancaire'),
  ('value', (SELECT id FROM config_values WHERE key = 'credit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'fr-FR', 'Carte de Crédit'),
  ('value', (SELECT id FROM config_values WHERE key = 'debit_card' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'fr-FR', 'Carte de Débit'),
  ('value', (SELECT id FROM config_values WHERE key = 'check' AND category_id = (SELECT id FROM config_categories WHERE key = 'payment_methods')), 'fr-FR', 'Chèque'),
  ('value', (SELECT id FROM config_values WHERE key = 'low' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'fr-FR', 'Basse'),
  ('value', (SELECT id FROM config_values WHERE key = 'medium' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'fr-FR', 'Moyenne'),
  ('value', (SELECT id FROM config_values WHERE key = 'high' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'fr-FR', 'Haute'),
  ('value', (SELECT id FROM config_values WHERE key = 'urgent' AND category_id = (SELECT id FROM config_categories WHERE key = 'priority')), 'fr-FR', 'Urgent'),
  ('value', (SELECT id FROM config_values WHERE key = 'individual' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'fr-FR', 'Particulier'),
  ('value', (SELECT id FROM config_values WHERE key = 'company' AND category_id = (SELECT id FROM config_categories WHERE key = 'client_type')), 'fr-FR', 'Entreprise'),
  ('value', (SELECT id FROM config_values WHERE key = 'sunny' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'fr-FR', 'Ensoleillé'),
  ('value', (SELECT id FROM config_values WHERE key = 'cloudy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'fr-FR', 'Nuageux'),
  ('value', (SELECT id FROM config_values WHERE key = 'rainy' AND category_id = (SELECT id FROM config_categories WHERE key = 'weather')), 'fr-FR', 'Pluvieux'),
  ('value', (SELECT id FROM config_values WHERE key = 'en-US' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'fr-FR', 'Anglais (États-Unis)'),
  ('value', (SELECT id FROM config_values WHERE key = 'pt-BR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'fr-FR', 'Portugais (Brésil)'),
  ('value', (SELECT id FROM config_values WHERE key = 'es-ES' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'fr-FR', 'Espagnol (Espagne)'),
  ('value', (SELECT id FROM config_values WHERE key = 'fr-FR' AND category_id = (SELECT id FROM config_categories WHERE key = 'language')), 'fr-FR', 'Français (France)'),
  ('value', (SELECT id FROM config_values WHERE key = 'BRL' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'fr-FR', 'Réal Brésilien (R$)'),
  ('value', (SELECT id FROM config_values WHERE key = 'USD' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'fr-FR', 'Dollar Américain ($)'),
  ('value', (SELECT id FROM config_values WHERE key = 'EUR' AND category_id = (SELECT id FROM config_categories WHERE key = 'currency')), 'fr-FR', 'Euro (€)'),
  ('value', (SELECT id FROM config_values WHERE key = 'DD/MM/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'fr-FR', 'JJ/MM/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'MM/DD/YYYY' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'fr-FR', 'MM/JJ/AAAA'),
  ('value', (SELECT id FROM config_values WHERE key = 'YYYY-MM-DD' AND category_id = (SELECT id FROM config_categories WHERE key = 'date_format')), 'fr-FR', 'AAAA-MM-JJ'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/Sao_Paulo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'fr-FR', 'São Paulo (GMT-3)'),
  ('value', (SELECT id FROM config_values WHERE key = 'America/New_York' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'fr-FR', 'New York (GMT-5)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Europe/London' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'fr-FR', 'Londres (GMT+0)'),
  ('value', (SELECT id FROM config_values WHERE key = 'Asia/Tokyo' AND category_id = (SELECT id FROM config_categories WHERE key = 'time_zone')), 'fr-FR', 'Tokyo (GMT+9)')
ON CONFLICT (entity_type, entity_id, language_code) DO NOTHING;
