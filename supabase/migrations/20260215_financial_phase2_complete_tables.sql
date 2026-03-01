-- ============================================================================
-- Financial Module Phase 2 - Complete Tables Migration
-- 
-- This migration creates all tables required for Phases 2c-2j:
-- - Phase 2c: Reconciliation Assistant
-- - Phase 2d: AI Autonomous Actions
-- - Phase 2e: Predictive Analytics
-- - Phase 2f: Multi-Currency Support
-- - Phase 2g: CastorWorks Pay
-- - Phase 2h: CastorMind Financial Agent
-- - Phase 2i: Open Finance & SEFAZ
--
-- Author: CastorWorks Development Team
-- Date: 2026-02-15
-- ============================================================================

BEGIN;

-- ============================================================================
-- Phase 2c: Reconciliation Assistant
-- ============================================================================

-- Reconciliation Rules (learned from user corrections)
CREATE TABLE IF NOT EXISTS public.financial_reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Rule Definition
  rule_type TEXT NOT NULL CHECK (rule_type IN ('exact_match', 'fuzzy_match', 'pattern_match', 'amount_only')),
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- Matching Criteria
  description_pattern TEXT,
  amount_tolerance NUMERIC(5,2) DEFAULT 0,
  date_tolerance INTEGER DEFAULT 0,
  min_similarity_score NUMERIC(4,3) DEFAULT 0.5,
  requires_document_number BOOLEAN DEFAULT false,
  
  -- Auto-Application
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  confidence_threshold NUMERIC(4,3) DEFAULT 0.9,
  
  -- Performance Tracking
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, rule_name)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_project ON public.financial_reconciliation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_active ON public.financial_reconciliation_rules(project_id, is_active, auto_apply) WHERE is_active = true;

-- RLS
ALTER TABLE public.financial_reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reconciliation rules for their company"
  ON public.financial_reconciliation_rules FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_office'));

-- ============================================================================
-- Phase 2d: AI Autonomous Actions
-- ============================================================================

-- AI Prediction Models Metadata
CREATE TABLE IF NOT EXISTS public.ai_prediction_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Model Identification
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('classification', 'regression', 'clustering', 'forecasting')),
  
  -- Model Details
  algorithm TEXT NOT NULL,
  model_file_path TEXT,
  model_size_bytes BIGINT,
  
  -- Features & Schema
  features JSONB NOT NULL,
  target_variable TEXT,
  feature_importance JSONB,
  
  -- Performance Metrics
  performance_metrics JSONB,
  validation_metrics JSONB,
  
  -- Training Details
  training_data_rows INTEGER,
  training_data_start_date DATE,
  training_data_end_date DATE,
  training_duration_seconds INTEGER,
  trained_at TIMESTAMPTZ NOT NULL,
  trained_by UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  
  UNIQUE(model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_models_active ON public.ai_prediction_models(model_name, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_models_production ON public.ai_prediction_models(model_name, is_production) WHERE is_production = true;

-- AI Prediction Results
CREATE TABLE IF NOT EXISTS public.ai_prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Model Reference
  model_id UUID NOT NULL REFERENCES public.ai_prediction_models(id),
  
  -- Entity Being Predicted
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'bill', 'payment', 'cashflow', 'customer', 'project')),
  entity_id UUID NOT NULL,
  
  -- Prediction Output
  prediction_value NUMERIC(12,4),
  prediction_class TEXT,
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  
  -- Features Used
  features_used JSONB,
  
  -- Prediction Details
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prediction_horizon_days INTEGER,
  
  -- Actual Outcome (filled in later for accuracy tracking)
  actual_value NUMERIC(12,4),
  actual_class TEXT,
  actual_recorded_at TIMESTAMPTZ,
  prediction_error NUMERIC(12,4),
  
  -- Metadata
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_predictions_entity ON public.ai_prediction_results(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON public.ai_prediction_results(model_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON public.ai_prediction_results(predicted_at DESC);

-- AI Learning Feedback
CREATE TABLE IF NOT EXISTS public.ai_learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prediction Reference
  prediction_id UUID NOT NULL REFERENCES public.ai_prediction_results(id) ON DELETE CASCADE,
  
  -- User Feedback
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correct', 'incorrect', 'adjusted', 'disputed')),
  
  -- Adjusted Values
  adjusted_value NUMERIC(12,4),
  adjusted_class TEXT,
  adjustment_reason TEXT,
  
  -- User Comments
  user_comment TEXT,
  
  -- Metadata
  feedback_source TEXT DEFAULT 'ui',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON public.ai_learning_feedback(prediction_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.ai_learning_feedback(user_id, created_at DESC);

-- AI Action Rules (for autonomous actions)
CREATE TABLE IF NOT EXISTS public.ai_action_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Scope
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  
  -- Rule Definition
  action_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- Auto-Approval Settings
  auto_approve_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_approve_threshold NUMERIC(15,2),
  
  -- Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Safety Limits
  daily_limit NUMERIC(15,2),
  monthly_limit NUMERIC(15,2),
  daily_action_count_limit INTEGER,
  
  -- Priority
  priority INTEGER NOT NULL DEFAULT 100,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  
  UNIQUE(company_id, action_type, rule_name)
);

CREATE INDEX IF NOT EXISTS idx_action_rules_company ON public.ai_action_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_action_rules_active ON public.ai_action_rules(company_id, action_type, is_active) WHERE is_active = true;

-- RLS for AI tables
ALTER TABLE public.ai_prediction_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view AI models"
  ON public.ai_prediction_models FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage AI models"
  ON public.ai_prediction_models FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view predictions for accessible entities"
  ON public.ai_prediction_results FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage predictions"
  ON public.ai_prediction_results FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view feedback"
  ON public.ai_learning_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit feedback"
  ON public.ai_learning_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can manage AI action rules"
  ON public.ai_action_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Phase 2f: Multi-Currency Support
-- ============================================================================

-- Exchange Rates Cache
CREATE TABLE IF NOT EXISTS public.financial_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rate Data
  base_currency TEXT NOT NULL DEFAULT 'BRL',
  target_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  rate_date DATE NOT NULL,
  
  -- Metadata
  source TEXT NOT NULL CHECK (source IN ('api', 'manual')),
  api_provider TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(base_currency, target_currency, rate_date),
  CONSTRAINT valid_currencies CHECK (base_currency ~ '^[A-Z]{3}$' AND target_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT positive_rate CHECK (rate > 0)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup ON public.financial_exchange_rates(target_currency, rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rates_date ON public.financial_exchange_rates(rate_date DESC);

-- FX Transactions (track currency conversions)
CREATE TABLE IF NOT EXISTS public.financial_fx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project Scope
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Reference to Original Transaction
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'bill', 'payment')),
  reference_id UUID NOT NULL,
  
  -- Currency Conversion Details
  from_currency TEXT NOT NULL,
  from_amount NUMERIC(15,2) NOT NULL,
  to_currency TEXT NOT NULL DEFAULT 'BRL',
  to_amount NUMERIC(15,2) NOT NULL,
  exchange_rate NUMERIC(12,6) NOT NULL,
  
  -- FX Gain/Loss
  fx_gain_loss NUMERIC(15,2),
  is_realized BOOLEAN NOT NULL DEFAULT false,
  
  -- Transaction Details
  transaction_date DATE NOT NULL,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_trans_project ON public.financial_fx_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_fx_trans_ref ON public.financial_fx_transactions(transaction_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_fx_trans_date ON public.financial_fx_transactions(transaction_date DESC);

-- RLS
ALTER TABLE public.financial_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_fx_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates are public for authenticated users"
  ON public.financial_exchange_rates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view FX transactions for accessible projects"
  ON public.financial_fx_transactions FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- ============================================================================
-- Phase 2g: CastorWorks Pay
-- ============================================================================

-- Payment Gateway Configurations
CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Scope
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  
  -- Gateway Details
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('pix', 'stripe', 'boleto', 'bank_transfer')),
  gateway_name TEXT NOT NULL,
  
  -- Encrypted Credentials
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  
  -- Configuration
  is_live_mode BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config_json JSONB,
  
  -- Fee Structure
  fee_percentage NUMERIC(5,2),
  fee_fixed NUMERIC(8,2),
  fee_currency TEXT DEFAULT 'BRL',
  pass_fees_to_customer BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_tested_at TIMESTAMPTZ,
  
  UNIQUE(company_id, gateway_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_configs_company ON public.payment_gateway_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_configs_active ON public.payment_gateway_configs(is_active, gateway_type) WHERE is_active;

-- Payment Gateway Webhooks Log
CREATE TABLE IF NOT EXISTS public.payment_gateway_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Gateway Details
  gateway_type TEXT NOT NULL,
  gateway_config_id UUID REFERENCES public.payment_gateway_configs(id),
  
  -- Event Data
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Security
  signature TEXT,
  signature_verified BOOLEAN,
  ip_address INET,
  
  -- Processing Status
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  
  -- Related Records Created
  payment_id UUID REFERENCES public.payment_transactions(id),
  invoice_id UUID REFERENCES public.financial_ar_invoices(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(gateway_type, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event ON public.payment_gateway_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed ON public.payment_gateway_webhooks(processed, created_at) WHERE NOT processed;

-- Financial Payment Methods (customer preferences)
CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer Reference
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Payment Method Details
  method_type TEXT NOT NULL CHECK (method_type IN ('pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Method-Specific Data
  pix_key TEXT,
  pix_key_type TEXT,
  stripe_payment_method_id TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Metadata
  nickname TEXT,
  metadata JSONB,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON public.financial_payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.financial_payment_methods(customer_id, is_default) WHERE is_default;

-- Financial Payment Links
CREATE TABLE IF NOT EXISTS public.financial_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.financial_ar_invoices(id) ON DELETE SET NULL,
  
  -- Link configuration
  link_code VARCHAR(32) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paid', 'cancelled')),
  
  -- Payment details
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  description TEXT,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_cpf_cnpj VARCHAR(18),
  
  -- Allowed payment methods
  allow_pix BOOLEAN NOT NULL DEFAULT true,
  allow_boleto BOOLEAN NOT NULL DEFAULT true,
  allow_credit_card BOOLEAN NOT NULL DEFAULT false,
  allow_bank_transfer BOOLEAN NOT NULL DEFAULT false,
  
  -- Discount & penalty configuration
  early_payment_discount_pct DECIMAL(5,2) DEFAULT 0,
  early_payment_discount_days INTEGER DEFAULT 0,
  late_payment_interest_pct DECIMAL(5,4) DEFAULT 0.0333,
  late_payment_fine_pct DECIMAL(5,2) DEFAULT 2.00,
  
  -- Tracking
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method_used VARCHAR(20),
  gateway_transaction_id VARCHAR(255),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_project ON public.financial_payment_links(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_invoice ON public.financial_payment_links(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_links_code ON public.financial_payment_links(link_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON public.financial_payment_links(status);

-- Financial Installment Plans
CREATE TABLE IF NOT EXISTS public.financial_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.financial_ar_invoices(id) ON DELETE SET NULL,
  payment_link_id UUID REFERENCES public.financial_payment_links(id) ON DELETE SET NULL,
  
  -- Plan configuration
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  num_installments INTEGER NOT NULL CHECK (num_installments BETWEEN 2 AND 48),
  installment_amount DECIMAL(15,2) NOT NULL,
  first_due_date DATE NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
  installments_paid INTEGER NOT NULL DEFAULT 0,
  total_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Customer info
  customer_name VARCHAR(255),
  customer_cpf_cnpj VARCHAR(18),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_installment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.financial_installment_plans(id) ON DELETE CASCADE,
  
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  
  -- Payment tracking
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(15,2),
  payment_method VARCHAR(20),
  gateway_transaction_id VARCHAR(255),
  boleto_barcode VARCHAR(60),
  boleto_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installment_plans_project ON public.financial_installment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_installment_items_plan ON public.financial_installment_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_items_due ON public.financial_installment_items(due_date) WHERE status = 'pending';

-- Financial Discount/Penalty Rules
CREATE TABLE IF NOT EXISTS public.financial_discount_penalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Rule type
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('early_discount', 'late_interest', 'late_fine')),
  
  -- Configuration
  percentage DECIMAL(8,4) NOT NULL,
  is_daily BOOLEAN NOT NULL DEFAULT false,
  grace_period_days INTEGER DEFAULT 0,
  applies_after_days INTEGER DEFAULT 0,
  max_percentage DECIMAL(8,4),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_discount_penalty_project ON public.financial_discount_penalty_rules(project_id);

-- RLS for Payment tables
ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_installment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_discount_penalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage payment gateway configs"
  ON public.payment_gateway_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view payment methods for accessible customers"
  ON public.financial_payment_methods FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_office'));

CREATE POLICY "Users can view payment links for their projects"
  ON public.financial_payment_links FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can manage payment links"
  ON public.financial_payment_links FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'project_manager'));

-- Public access for checkout (via link_code, no auth required)
CREATE POLICY "Public can view active payment links by code"
  ON public.financial_payment_links FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Users can view installment plans for their projects"
  ON public.financial_installment_plans FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can view discount/penalty rules for their projects"
  ON public.financial_discount_penalty_rules FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can manage discount/penalty rules"
  ON public.financial_discount_penalty_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Phase 2h: CastorMind Financial Agent
-- ============================================================================

-- CastorMind Messages (WhatsApp/email incoming)
CREATE TABLE IF NOT EXISTS public.castormind_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Source
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'email', 'web_upload')),
  sender_phone VARCHAR(20),
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  
  -- Message content
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('image', 'document', 'audio', 'text')),
  content_text TEXT,
  file_storage_path TEXT,
  file_mime_type VARCHAR(100),
  file_size_bytes INTEGER,
  
  -- Processing status
  processing_status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'completed', 'failed', 'ignored')),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  -- AI classification
  ai_document_type VARCHAR(30),
  ai_confidence DECIMAL(3,2),
  
  -- Linking
  ocr_result_id UUID,
  pre_launch_entry_id UUID,
  
  -- External metadata
  external_message_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_castormind_messages_project ON public.castormind_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_castormind_messages_channel ON public.castormind_messages(channel);
CREATE INDEX IF NOT EXISTS idx_castormind_messages_status ON public.castormind_messages(processing_status);
CREATE INDEX IF NOT EXISTS idx_castormind_messages_created ON public.castormind_messages(created_at DESC);

-- CastorMind OCR Results
CREATE TABLE IF NOT EXISTS public.castormind_ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.castormind_messages(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- OCR provider info
  ocr_provider VARCHAR(20) NOT NULL DEFAULT 'google_vision' CHECK (ocr_provider IN ('google_vision', 'aws_textract', 'manual')),
  raw_ocr_text TEXT,
  
  -- Extracted structured data
  document_type VARCHAR(30),
  vendor_name VARCHAR(255),
  vendor_cnpj VARCHAR(18),
  vendor_cpf VARCHAR(14),
  
  -- Financial data
  total_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'BRL',
  tax_amount DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  
  -- Date fields
  document_date DATE,
  due_date DATE,
  
  -- NF-e specific
  nfe_number VARCHAR(20),
  nfe_series VARCHAR(5),
  nfe_access_key VARCHAR(44),
  
  -- Line items
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- Confidence scores
  overall_confidence DECIMAL(3,2),
  field_confidences JSONB DEFAULT '{}'::jsonb,
  
  -- User corrections
  was_corrected BOOLEAN NOT NULL DEFAULT false,
  corrected_by UUID REFERENCES auth.users(id),
  corrected_at TIMESTAMPTZ,
  correction_fields JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_message ON public.castormind_ocr_results(message_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_project ON public.castormind_ocr_results(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_vendor_cnpj ON public.castormind_ocr_results(vendor_cnpj);

-- Financial Pre-Launch Entries
CREATE TABLE IF NOT EXISTS public.financial_pre_launch_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Source tracking
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('whatsapp_ocr', 'email_ocr', 'web_upload', 'sefaz_nfe', 'manual')),
  source_message_id UUID REFERENCES public.castormind_messages(id) ON DELETE SET NULL,
  source_ocr_id UUID REFERENCES public.castormind_ocr_results(id) ON DELETE SET NULL,
  
  -- Entry type
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('expense', 'income', 'transfer')),
  
  -- Financial data
  description TEXT NOT NULL,
  vendor_name VARCHAR(255),
  vendor_cnpj VARCHAR(18),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  document_date DATE,
  due_date DATE,
  category VARCHAR(100),
  
  -- AI confidence
  ai_confidence DECIMAL(3,2),
  ai_category_suggestions JSONB,
  
  -- Approval workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Linked financial entry
  linked_invoice_id UUID REFERENCES public.financial_ar_invoices(id) ON DELETE SET NULL,
  linked_bill_id UUID REFERENCES public.financial_ap_bills(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_launch_project ON public.financial_pre_launch_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_pre_launch_status ON public.financial_pre_launch_entries(status);
CREATE INDEX IF NOT EXISTS idx_pre_launch_pending ON public.financial_pre_launch_entries(project_id, created_at DESC) WHERE status = 'pending';

-- RLS for CastorMind tables
ALTER TABLE public.castormind_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.castormind_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_pre_launch_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their projects"
  ON public.castormind_messages FOR SELECT
  USING (
    project_id IS NULL AND has_role(auth.uid(), 'admin')
    OR has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Users can view OCR results for their projects"
  ON public.castormind_ocr_results FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can view pre-launch entries for their projects"
  ON public.financial_pre_launch_entries FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project managers can approve/reject entries"
  ON public.financial_pre_launch_entries FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'project_manager')
    OR has_role(auth.uid(), 'admin_office')
  );

-- ============================================================================
-- Phase 2i: Open Finance & SEFAZ
-- ============================================================================

-- Open Finance Connections
CREATE TABLE IF NOT EXISTS public.open_finance_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Provider info
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('pluggy', 'belvo')),
  provider_item_id VARCHAR(255) NOT NULL,
  
  -- Bank info
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(10),
  account_type VARCHAR(20) DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'payment')),
  account_number_masked VARCHAR(20),
  
  -- Connection status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20),
  next_sync_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Consent management
  consent_expires_at TIMESTAMPTZ,
  
  -- Linked CastorWorks account
  linked_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  
  -- Credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  
  -- Metadata
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_of_connections_project ON public.open_finance_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_of_connections_status ON public.open_finance_connections(status);
CREATE INDEX IF NOT EXISTS idx_of_connections_next_sync ON public.open_finance_connections(next_sync_at) WHERE status = 'active';

-- Open Finance Sync Logs
CREATE TABLE IF NOT EXISTS public.open_finance_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.open_finance_connections(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (sync_type IN ('automatic', 'manual', 'retry')),
  status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'partial', 'failed')),
  
  -- Results
  transactions_fetched INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_updated INTEGER DEFAULT 0,
  transactions_reconciled INTEGER DEFAULT 0,
  
  -- Time range synced
  sync_from_date DATE,
  sync_to_date DATE,
  
  -- Balance snapshot
  balance_at_sync DECIMAL(15,2),
  balance_currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Performance
  duration_ms INTEGER,
  
  -- Metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_of_sync_connection ON public.open_finance_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_of_sync_project ON public.open_finance_sync_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_of_sync_started ON public.open_finance_sync_logs(started_at DESC);

-- SEFAZ NF-e Records
CREATE TABLE IF NOT EXISTS public.sefaz_nfe_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- NF-e identification
  nfe_access_key VARCHAR(44) NOT NULL UNIQUE,
  nfe_number VARCHAR(20) NOT NULL,
  nfe_series VARCHAR(5),
  nfe_protocol VARCHAR(20),
  
  -- Issuer (emitente)
  issuer_cnpj VARCHAR(18) NOT NULL,
  issuer_name VARCHAR(255),
  issuer_state VARCHAR(2),
  
  -- Recipient (destinatário)
  recipient_cnpj VARCHAR(18) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Financial data
  total_amount DECIMAL(15,2) NOT NULL,
  tax_icms DECIMAL(15,2) DEFAULT 0,
  tax_ipi DECIMAL(15,2) DEFAULT 0,
  tax_pis DECIMAL(15,2) DEFAULT 0,
  tax_cofins DECIMAL(15,2) DEFAULT 0,
  tax_iss DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  
  -- Dates
  issue_date TIMESTAMPTZ NOT NULL,
  authorization_date TIMESTAMPTZ,
  
  -- Status
  nfe_status VARCHAR(20) NOT NULL DEFAULT 'authorized' CHECK (nfe_status IN ('authorized', 'cancelled', 'denied', 'corrected')),
  
  -- XML storage
  xml_storage_path TEXT,
  
  -- Line items
  items JSONB DEFAULT '[]'::jsonb,
  
  -- Linking to financial entries
  linked_invoice_id UUID REFERENCES public.financial_ar_invoices(id) ON DELETE SET NULL,
  linked_bill_id UUID REFERENCES public.financial_ap_bills(id) ON DELETE SET NULL,
  linked_pre_launch_id UUID REFERENCES public.financial_pre_launch_entries(id) ON DELETE SET NULL,
  link_status VARCHAR(20) DEFAULT 'unlinked' CHECK (link_status IN ('unlinked', 'auto_linked', 'manual_linked', 'rejected')),
  
  -- Retrieval metadata
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retrieval_method VARCHAR(20) DEFAULT 'sefaz_api' CHECK (retrieval_method IN ('sefaz_api', 'manual_upload', 'email_forward', 'ocr')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sefaz_nfe_access_key ON public.sefaz_nfe_records(nfe_access_key);
CREATE INDEX IF NOT EXISTS idx_sefaz_nfe_project ON public.sefaz_nfe_records(project_id);
CREATE INDEX IF NOT EXISTS idx_sefaz_nfe_issuer_cnpj ON public.sefaz_nfe_records(issuer_cnpj);
CREATE INDEX IF NOT EXISTS idx_sefaz_nfe_recipient_cnpj ON public.sefaz_nfe_records(recipient_cnpj);
CREATE INDEX IF NOT EXISTS idx_sefaz_nfe_issue_date ON public.sefaz_nfe_records(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_sefaz_nfe_unlinked ON public.sefaz_nfe_records(project_id) WHERE link_status = 'unlinked';

-- RLS for Open Finance & SEFAZ tables
ALTER TABLE public.open_finance_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_finance_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sefaz_nfe_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bank connections for their projects"
  ON public.open_finance_connections FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_office'))
  );

CREATE POLICY "Admins can manage bank connections"
  ON public.open_finance_connections FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view sync logs for their projects"
  ON public.open_finance_sync_logs FOR SELECT
  USING (
    has_project_access(auth.uid(), project_id)
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_office'))
  );

CREATE POLICY "Users can view NF-e records for their projects"
  ON public.sefaz_nfe_records FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Admins can manage NF-e records"
  ON public.sefaz_nfe_records FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'admin_office')
  );

-- ============================================================================
-- Update Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_reconciliation_rules_updated_at
  BEFORE UPDATE ON public.financial_reconciliation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_rules_updated_at
  BEFORE UPDATE ON public.ai_action_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fx_transactions_updated_at
  BEFORE UPDATE ON public.financial_fx_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_gateway_configs_updated_at
  BEFORE UPDATE ON public.payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON public.financial_payment_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_plans_updated_at
  BEFORE UPDATE ON public.financial_installment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_items_updated_at
  BEFORE UPDATE ON public.financial_installment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_penalty_rules_updated_at
  BEFORE UPDATE ON public.financial_discount_penalty_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_castormind_messages_updated_at
  BEFORE UPDATE ON public.castormind_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_castormind_ocr_results_updated_at
  BEFORE UPDATE ON public.castormind_ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_launch_entries_updated_at
  BEFORE UPDATE ON public.financial_pre_launch_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_open_finance_connections_updated_at
  BEFORE UPDATE ON public.open_finance_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sefaz_nfe_records_updated_at
  BEFORE UPDATE ON public.sefaz_nfe_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
