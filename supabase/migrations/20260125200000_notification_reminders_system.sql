-- Migration: Notification Reminders System
-- Description: Add reminder settings, overrides, and tracking for task/payment notifications
-- Author: AI Agent
-- Date: 2026-01-25

BEGIN;

-- =====================================================
-- 1. EXTEND NOTIFICATION TYPES
-- =====================================================

-- Drop existing constraint and recreate with new types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'financial_alert', 
    'project_update', 
    'schedule_change', 
    'material_delivery', 
    'system', 
    'budget_overrun', 
    'milestone_delay',
    'task_due',
    'task_due_soon',
    'payment_due',
    'payment_due_soon',
    'chat_message'
  ));

-- =====================================================
-- 2. NOTIFICATION REMINDER SETTINGS (Company-wide)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'payment')),
  reminder_days INTEGER[] DEFAULT '{7,3,1}',  -- Days before due date
  channels TEXT[] DEFAULT '{bell,whatsapp}',  -- Notification channels
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_reminder_settings_entity_type 
  ON public.notification_reminder_settings(entity_type);

-- Enable RLS
ALTER TABLE public.notification_reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can view settings
DROP POLICY IF EXISTS "Authenticated users can view reminder settings" ON public.notification_reminder_settings;
CREATE POLICY "Authenticated users can view reminder settings"
  ON public.notification_reminder_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: Admins can manage settings
DROP POLICY IF EXISTS "Admins can manage reminder settings" ON public.notification_reminder_settings;
CREATE POLICY "Admins can manage reminder settings"
  ON public.notification_reminder_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.notification_reminder_settings (entity_type, reminder_days, channels, enabled)
VALUES 
  ('task', '{7,3,1}', '{bell,whatsapp}', true),
  ('payment', '{7,3,1}', '{bell,whatsapp}', true)
ON CONFLICT (entity_type) DO NOTHING;

-- =====================================================
-- 3. ENTITY REMINDER OVERRIDES (Per-task/payment)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.entity_reminder_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'payment')),
  entity_id UUID NOT NULL,
  reminder_days INTEGER[],  -- Override default days
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entity_reminder_overrides_entity 
  ON public.entity_reminder_overrides(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.entity_reminder_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view overrides for entities they have access to
DROP POLICY IF EXISTS "Users can view reminder overrides" ON public.entity_reminder_overrides;
CREATE POLICY "Users can view reminder overrides"
  ON public.entity_reminder_overrides FOR SELECT
  USING (
    CASE 
      WHEN entity_type = 'task' THEN
        entity_id IN (
          SELECT id FROM architect_tasks 
          WHERE project_id IN (
            SELECT project_id FROM project_team_members WHERE user_id = auth.uid()
          )
        )
      WHEN entity_type = 'payment' THEN
        entity_id IN (
          SELECT id FROM invoices 
          WHERE project_id IN (
            SELECT project_id FROM project_team_members WHERE user_id = auth.uid()
          )
        )
      ELSE false
    END
  );

-- RLS: Users can manage overrides for entities they have access to
DROP POLICY IF EXISTS "Users can manage reminder overrides" ON public.entity_reminder_overrides;
CREATE POLICY "Users can manage reminder overrides"
  ON public.entity_reminder_overrides FOR ALL
  USING (
    CASE 
      WHEN entity_type = 'task' THEN
        entity_id IN (
          SELECT id FROM architect_tasks 
          WHERE project_id IN (
            SELECT project_id FROM project_team_members WHERE user_id = auth.uid()
          )
        )
      WHEN entity_type = 'payment' THEN
        entity_id IN (
          SELECT id FROM invoices 
          WHERE project_id IN (
            SELECT project_id FROM project_team_members WHERE user_id = auth.uid()
          )
        )
      ELSE false
    END
  );

-- =====================================================
-- 4. NOTIFICATION SENT LOG (Prevent duplicates)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  reminder_day INTEGER,  -- Which reminder (7, 3, 1, 0 for due day)
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  UNIQUE(entity_type, entity_id, reminder_day, channel, recipient_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_sent_log_entity 
  ON public.notification_sent_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_sent_log_sent_at 
  ON public.notification_sent_log(sent_at DESC);

-- Enable RLS
ALTER TABLE public.notification_sent_log ENABLE ROW LEVEL SECURITY;

-- RLS: Service role can manage logs
DROP POLICY IF EXISTS "Service role can manage notification logs" ON public.notification_sent_log;
CREATE POLICY "Service role can manage notification logs"
  ON public.notification_sent_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS: Users can view their own notification logs
DROP POLICY IF EXISTS "Users can view their notification logs" ON public.notification_sent_log;
CREATE POLICY "Users can view their notification logs"
  ON public.notification_sent_log FOR SELECT
  USING (recipient_id = auth.uid());

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get effective reminder settings for an entity
CREATE OR REPLACE FUNCTION get_effective_reminder_settings(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE(
  reminder_days INTEGER[],
  channels TEXT[],
  enabled BOOLEAN
) AS $$
BEGIN
  -- Check for override first
  RETURN QUERY
  SELECT 
    COALESCE(o.reminder_days, s.reminder_days) as reminder_days,
    s.channels,
    COALESCE(o.enabled, s.enabled) as enabled
  FROM notification_reminder_settings s
  LEFT JOIN entity_reminder_overrides o 
    ON o.entity_type = s.entity_type 
    AND o.entity_id = p_entity_id
  WHERE s.entity_type = p_entity_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if notification was already sent
CREATE OR REPLACE FUNCTION notification_already_sent(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_reminder_day INTEGER,
  p_channel TEXT,
  p_recipient_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM notification_sent_log
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND reminder_day = p_reminder_day
      AND channel = p_channel
      AND recipient_id = p_recipient_id
      AND status = 'sent'
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_notification_reminder_settings_updated_at ON public.notification_reminder_settings;
CREATE TRIGGER update_notification_reminder_settings_updated_at
  BEFORE UPDATE ON public.notification_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_entity_reminder_overrides_updated_at ON public.entity_reminder_overrides;
CREATE TRIGGER update_entity_reminder_overrides_updated_at
  BEFORE UPDATE ON public.entity_reminder_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT SELECT ON public.notification_reminder_settings TO authenticated;
GRANT INSERT, UPDATE ON public.notification_reminder_settings TO authenticated;
GRANT DELETE ON public.notification_reminder_settings TO service_role;

GRANT SELECT ON public.entity_reminder_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.entity_reminder_overrides TO authenticated;

GRANT SELECT ON public.notification_sent_log TO authenticated;
GRANT INSERT, UPDATE ON public.notification_sent_log TO service_role;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.notification_reminder_settings IS 'Company-wide default reminder settings for tasks and payments';
COMMENT ON TABLE public.entity_reminder_overrides IS 'Per-entity reminder overrides for specific tasks or payments';
COMMENT ON TABLE public.notification_sent_log IS 'Log of sent notifications to prevent duplicates';
COMMENT ON FUNCTION get_effective_reminder_settings IS 'Get effective reminder settings considering overrides';
COMMENT ON FUNCTION notification_already_sent IS 'Check if a notification was already sent to prevent duplicates';

COMMIT;
