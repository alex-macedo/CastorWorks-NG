-- ============================================================================
-- Outbound Campaign Module - Database Schema
-- Created: 2025-11-21
-- Description: WhatsApp outbound campaign management for contractors, partners, and architects
-- ============================================================================

-- ============================================================================
-- 1. ADD VIP FLAG TO CONTACTS
-- ============================================================================

-- Add is_vip flag to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Add is_vip flag to suppliers table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_vip flag to contractors table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors') THEN
    ALTER TABLE contractors ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 2. OUTBOUND CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS outbound_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed')),

  -- Audience configuration
  audience_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (audience_type IN ('all', 'filtered', 'manual')),
  audience_filter JSONB DEFAULT '{}'::jsonb,  -- Filter criteria: {contactTypes: [], tags: [], vipOnly: boolean}

  -- Message configuration
  message_template TEXT,  -- Base template for personalization
  include_voice_for_vip BOOLEAN DEFAULT false,
  company_name TEXT,  -- For personalization "Thanks for working with <COMPANY>"

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Statistics
  total_recipients INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  voice_messages_sent INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_user_id ON outbound_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_status ON outbound_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_scheduled_at ON outbound_campaigns(scheduled_at);

-- ============================================================================
-- 3. CAMPAIGN RECIPIENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outbound_campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Contact information (denormalized for performance and audit trail)
  contact_type TEXT NOT NULL CHECK (contact_type IN ('client', 'supplier', 'contractor')),
  contact_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  is_vip BOOLEAN DEFAULT false,

  -- Message status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'personalizing', 'sending', 'sent', 'delivered', 'failed')),

  -- Personalized content
  personalized_message TEXT,
  personalization_context JSONB DEFAULT '{}'::jsonb,  -- Context used for personalization (past projects, etc.)
  voice_message_url TEXT,  -- URL to generated voice message (if VIP)
  voice_message_duration INTEGER,  -- Duration in seconds

  -- Delivery tracking
  twilio_message_sid TEXT,  -- Twilio message ID for tracking
  error_message TEXT,
  error_code TEXT,

  -- Timestamps
  personalized_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON campaign_recipients(contact_type, contact_id);

-- ============================================================================
-- 4. CAMPAIGN LOGS (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outbound_campaigns(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE SET NULL,

  -- Log details
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'success')),
  event_type TEXT NOT NULL,  -- e.g., 'campaign_created', 'message_sent', 'delivery_confirmed', 'error_occurred'
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,  -- Additional context data

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_recipient_id ON campaign_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_event_type ON campaign_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_created_at ON campaign_logs(created_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Campaigns: Users can only manage their own campaigns
DROP POLICY IF EXISTS "Users can view their own campaigns" ON outbound_campaigns;
CREATE POLICY "Users can view their own campaigns"
  ON outbound_campaigns FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own campaigns" ON outbound_campaigns;
CREATE POLICY "Users can create their own campaigns"
  ON outbound_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own campaigns" ON outbound_campaigns;
CREATE POLICY "Users can update their own campaigns"
  ON outbound_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own campaigns" ON outbound_campaigns;
CREATE POLICY "Users can delete their own campaigns"
  ON outbound_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Recipients: Users can view recipients of their campaigns
DROP POLICY IF EXISTS "Users can view recipients of their campaigns" ON campaign_recipients;
CREATE POLICY "Users can view recipients of their campaigns"
  ON campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outbound_campaigns
      WHERE outbound_campaigns.id = campaign_recipients.campaign_id
      AND outbound_campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create recipients for their campaigns" ON campaign_recipients;
CREATE POLICY "Users can create recipients for their campaigns"
  ON campaign_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outbound_campaigns
      WHERE outbound_campaigns.id = campaign_recipients.campaign_id
      AND outbound_campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update recipients of their campaigns" ON campaign_recipients;
CREATE POLICY "Users can update recipients of their campaigns"
  ON campaign_recipients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM outbound_campaigns
      WHERE outbound_campaigns.id = campaign_recipients.campaign_id
      AND outbound_campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete recipients of their campaigns" ON campaign_recipients;
CREATE POLICY "Users can delete recipients of their campaigns"
  ON campaign_recipients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM outbound_campaigns
      WHERE outbound_campaigns.id = campaign_recipients.campaign_id
      AND outbound_campaigns.user_id = auth.uid()
    )
  );

-- Logs: Users can view logs of their campaigns
DROP POLICY IF EXISTS "Users can view logs of their campaigns" ON campaign_logs;
CREATE POLICY "Users can view logs of their campaigns"
  ON campaign_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outbound_campaigns
      WHERE outbound_campaigns.id = campaign_logs.campaign_id
      AND outbound_campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all campaign logs" ON campaign_logs;
CREATE POLICY "Service role can manage all campaign logs"
  ON campaign_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics in the campaign
  UPDATE outbound_campaigns
  SET
    messages_sent = (
      SELECT COUNT(*) FROM campaign_recipients
      WHERE campaign_id = NEW.campaign_id
      AND status IN ('sent', 'delivered')
    ),
    messages_delivered = (
      SELECT COUNT(*) FROM campaign_recipients
      WHERE campaign_id = NEW.campaign_id
      AND status = 'delivered'
    ),
    messages_failed = (
      SELECT COUNT(*) FROM campaign_recipients
      WHERE campaign_id = NEW.campaign_id
      AND status = 'failed'
    ),
    voice_messages_sent = (
      SELECT COUNT(*) FROM campaign_recipients
      WHERE campaign_id = NEW.campaign_id
      AND voice_message_url IS NOT NULL
    ),
    updated_at = now()
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update campaign statistics when recipient status changes
DROP TRIGGER IF EXISTS trigger_update_campaign_statistics ON campaign_recipients;
CREATE TRIGGER trigger_update_campaign_statistics
  AFTER INSERT OR UPDATE OF status, voice_message_url
  ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_statistics();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS trigger_outbound_campaigns_updated_at ON outbound_campaigns;
CREATE TRIGGER trigger_outbound_campaigns_updated_at
  BEFORE UPDATE ON outbound_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_campaign_recipients_updated_at ON campaign_recipients;
CREATE TRIGGER trigger_campaign_recipients_updated_at
  BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON outbound_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_recipients TO authenticated;
GRANT SELECT ON campaign_logs TO authenticated;

-- Grant service role full access for edge functions
GRANT ALL ON outbound_campaigns TO service_role;
GRANT ALL ON campaign_recipients TO service_role;
GRANT ALL ON campaign_logs TO service_role;

-- Grant usage on sequences (for any auto-increment columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
