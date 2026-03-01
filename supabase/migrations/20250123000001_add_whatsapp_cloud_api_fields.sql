-- ============================================================================
-- Add WhatsApp Cloud API Fields to Campaign Tables
-- Created: 2025-01-23
-- Description: Add WhatsApp-specific fields for tracking and template management
-- ============================================================================

-- Add WhatsApp fields to outbound_campaigns table
ALTER TABLE outbound_campaigns
  ADD COLUMN IF NOT EXISTS whatsapp_template_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
  ADD COLUMN IF NOT EXISTS rate_limit_tier INTEGER DEFAULT 1 CHECK (rate_limit_tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT;

-- Add WhatsApp tracking fields to campaign_recipients table
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT CHECK (whatsapp_status IN ('sent', 'delivered', 'read', 'failed')),
  ADD COLUMN IF NOT EXISTS whatsapp_timestamp TIMESTAMP WITH TIME ZONE;

-- Create index for WhatsApp message ID lookups (used by webhook)
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_whatsapp_message_id 
  ON campaign_recipients(whatsapp_message_id) 
  WHERE whatsapp_message_id IS NOT NULL;

-- Create whatsapp_templates table for template management
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language_code TEXT NOT NULL DEFAULT 'en',
  content TEXT NOT NULL,
  parameters JSONB DEFAULT '[]'::jsonb, -- Array of parameter definitions
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  whatsapp_template_id TEXT, -- Template ID from Meta after approval
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name_status 
  ON whatsapp_templates(name, status);

-- Create whatsapp_rate_limits table for tracking rate limit usage
CREATE TABLE IF NOT EXISTS whatsapp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL, -- E.164 format
  contact_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(phone_number, window_start)
);

-- Create index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_rate_limits_phone_window 
  ON whatsapp_rate_limits(phone_number, window_start, window_end);

-- Create whatsapp_opt_ins table for opt-in/opt-out management
CREATE TABLE IF NOT EXISTS whatsapp_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE, -- E.164 format
  opted_in BOOLEAN DEFAULT false,
  opted_in_at TIMESTAMP WITH TIME ZONE,
  opted_out_at TIMESTAMP WITH TIME ZONE,
  source TEXT CHECK (source IN ('manual', 'webhook', 'api', 'form')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for opt-in lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_ins_phone_opted 
  ON whatsapp_opt_ins(phone_number, opted_in);

-- Function to update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_whatsapp_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_whatsapp_opt_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS trigger_whatsapp_templates_updated_at ON whatsapp_templates;
CREATE TRIGGER trigger_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_templates_updated_at();

DROP TRIGGER IF EXISTS trigger_whatsapp_rate_limits_updated_at ON whatsapp_rate_limits;
CREATE TRIGGER trigger_whatsapp_rate_limits_updated_at
  BEFORE UPDATE ON whatsapp_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_rate_limits_updated_at();

DROP TRIGGER IF EXISTS trigger_whatsapp_opt_ins_updated_at ON whatsapp_opt_ins;
CREATE TRIGGER trigger_whatsapp_opt_ins_updated_at
  BEFORE UPDATE ON whatsapp_opt_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_opt_ins_updated_at();

-- Enable RLS on new tables
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_templates
-- Admins can manage templates
DROP POLICY IF EXISTS "Admins can manage templates" ON whatsapp_templates;
CREATE POLICY "Admins can manage templates"
  ON whatsapp_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Service role can manage all templates
DROP POLICY IF EXISTS "Service role can manage all templates" ON whatsapp_templates;
CREATE POLICY "Service role can manage all templates"
  ON whatsapp_templates FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for whatsapp_rate_limits
-- Service role only (internal tracking)
DROP POLICY IF EXISTS "Service role can manage rate limits" ON whatsapp_rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON whatsapp_rate_limits FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for whatsapp_opt_ins
-- Admins can view and manage opt-ins
DROP POLICY IF EXISTS "Admins can manage opt-ins" ON whatsapp_opt_ins;
CREATE POLICY "Admins can manage opt-ins"
  ON whatsapp_opt_ins FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Service role can manage all opt-ins
DROP POLICY IF EXISTS "Service role can manage all opt-ins" ON whatsapp_opt_ins;
CREATE POLICY "Service role can manage all opt-ins"
  ON whatsapp_opt_ins FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_templates TO authenticated;
GRANT ALL ON whatsapp_templates TO service_role;

GRANT ALL ON whatsapp_rate_limits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_opt_ins TO authenticated;
GRANT ALL ON whatsapp_opt_ins TO service_role;

-- Comments
COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates for outbound campaigns';
COMMENT ON TABLE whatsapp_rate_limits IS 'Rate limit tracking for WhatsApp API (Tier 1: 1000 contacts/24hrs)';
COMMENT ON TABLE whatsapp_opt_ins IS 'Opt-in/opt-out management for WhatsApp messaging compliance';
