-- Migration: Add Admin Policies for Campaign Tables
-- Description: Allows admin users to insert/manage campaign data during seeding and management operations
-- Author: Claude Code
-- Date: 2025-11-28

-- =====================================================
-- OUTBOUND_CAMPAIGNS - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any campaign (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any campaign" ON outbound_campaigns;
CREATE POLICY "Admins can insert any campaign"
  ON outbound_campaigns FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- RLS Policy: Admins can manage all campaigns
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON outbound_campaigns;
CREATE POLICY "Admins can manage all campaigns"
  ON outbound_campaigns FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- CAMPAIGN_RECIPIENTS - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any recipient (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any recipient" ON campaign_recipients;
CREATE POLICY "Admins can insert any recipient"
  ON campaign_recipients FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- RLS Policy: Admins can manage all recipients
DROP POLICY IF EXISTS "Admins can manage all recipients" ON campaign_recipients;
CREATE POLICY "Admins can manage all recipients"
  ON campaign_recipients FOR ALL
  USING (
    has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- CAMPAIGN_LOGS - ADMIN POLICY
-- =====================================================

-- RLS Policy: Admins can insert any campaign log (for seeding and management)
DROP POLICY IF EXISTS "Admins can insert any campaign log" ON campaign_logs;
CREATE POLICY "Admins can insert any campaign log"
  ON campaign_logs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- Note: campaign_logs already has "Service role can manage all campaign logs" policy
-- which provides broader access. The admin policy complements this for user-level admin access.

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Admins can insert any campaign" ON outbound_campaigns
  IS 'Allows admin users to insert campaigns for any creator during seeding and management operations';

COMMENT ON POLICY "Admins can manage all campaigns" ON outbound_campaigns
  IS 'Allows admin users to manage all campaigns regardless of creator';

COMMENT ON POLICY "Admins can insert any recipient" ON campaign_recipients
  IS 'Allows admin users to add recipients to any campaign during seeding and management operations';

COMMENT ON POLICY "Admins can manage all recipients" ON campaign_recipients
  IS 'Allows admin users to manage all campaign recipients';

COMMENT ON POLICY "Admins can insert any campaign log" ON campaign_logs
  IS 'Allows admin users to insert campaign logs during seeding and management operations';
