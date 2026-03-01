-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('financial_alert', 'project_update', 'schedule_change', 'material_delivery', 'system', 'budget_overrun', 'milestone_delay')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    read BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    action_url TEXT,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_archived ON notifications(archived);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read_archived ON notifications(user_id, read, archived);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_action_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, priority, action_url, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_action_url, p_data)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

-- Function to create budget overrun notification
CREATE OR REPLACE FUNCTION notify_budget_overrun(
    p_project_id UUID,
    p_overrun_amount DECIMAL,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_name TEXT;
    v_target_user_id UUID;
BEGIN
    -- Get project name
    SELECT name INTO v_project_name
    FROM projects
    WHERE id = p_project_id;

    -- If no specific user provided, notify all project team members
    IF p_user_id IS NULL THEN
        FOR v_target_user_id IN
            SELECT user_id FROM project_team_members WHERE project_id = p_project_id
        LOOP
            PERFORM create_notification(
                v_target_user_id,
                'budget_overrun',
                'Budget Overrun Alert',
                format('Project "%s" has exceeded budget by $%s', v_project_name, p_overrun_amount),
                'high',
                format('/projects/%s/financial', p_project_id),
                jsonb_build_object('projectId', p_project_id, 'overrunAmount', p_overrun_amount)
            );
        END LOOP;
    ELSE
        PERFORM create_notification(
            p_user_id,
            'budget_overrun',
            'Budget Overrun Alert',
            format('Project "%s" has exceeded budget by $%s', v_project_name, p_overrun_amount),
            'high',
            format('/projects/%s/financial', p_project_id),
            jsonb_build_object('projectId', p_project_id, 'overrunAmount', p_overrun_amount)
        );
    END IF;
END;
$$;

-- Function to create milestone delay notification
CREATE OR REPLACE FUNCTION notify_milestone_delay(
    p_project_id UUID,
    p_milestone_name TEXT,
    p_delay_days INTEGER,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_name TEXT;
    v_target_user_id UUID;
BEGIN
    -- Get project name
    SELECT name INTO v_project_name
    FROM projects
    WHERE id = p_project_id;

    -- If no specific user provided, notify all project team members
    IF p_user_id IS NULL THEN
        FOR v_target_user_id IN
            SELECT user_id FROM project_team_members WHERE project_id = p_project_id
        LOOP
            PERFORM create_notification(
                v_target_user_id,
                'milestone_delay',
                'Milestone Delayed',
                format('Milestone "%s" in project "%s" delayed by %s days', p_milestone_name, v_project_name, p_delay_days),
                'medium',
                format('/projects/%s/schedule', p_project_id),
                jsonb_build_object('projectId', p_project_id, 'milestoneName', p_milestone_name, 'delayDays', p_delay_days)
            );
        END LOOP;
    ELSE
        PERFORM create_notification(
            p_user_id,
            'milestone_delay',
            'Milestone Delayed',
            format('Milestone "%s" in project "%s" delayed by %s days', p_milestone_name, v_project_name, p_delay_days),
            'medium',
            format('/projects/%s/schedule', p_project_id),
            jsonb_build_object('projectId', p_project_id, 'milestoneName', p_milestone_name, 'delayDays', p_delay_days)
        );
    END IF;
END;
$$;

-- Function to create financial alert notification
CREATE OR REPLACE FUNCTION notify_financial_alert(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_invoice_id TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_url TEXT := '/financial';
BEGIN
    IF p_invoice_id IS NOT NULL THEN
        v_action_url := format('/financial/invoices/%s', p_invoice_id);
    END IF;

    PERFORM create_notification(
        p_user_id,
        'financial_alert',
        p_title,
        p_message,
        'high',
        v_action_url,
        jsonb_build_object('invoiceId', p_invoice_id, 'amount', p_amount)
    );
END;
$$;

-- Function to create system notification (broadcast to all users)
CREATE OR REPLACE FUNCTION notify_system_alert(
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'medium'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT id FROM auth.users LOOP
        PERFORM create_notification(
            v_user_id,
            'system',
            p_title,
            p_message,
            p_priority,
            '/dashboard',
            jsonb_build_object('system', true)
        );
    END LOOP;
END;
$$;

-- Function to clean up old notifications (keep last 1000 per user, older than 90 days get archived)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Archive notifications older than 90 days
    UPDATE notifications
    SET archived = true, updated_at = NOW()
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND archived = false;

    -- Keep only last 1000 notifications per user
    UPDATE notifications
    SET archived = true, updated_at = NOW()
    WHERE id IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM notifications
            WHERE archived = false
        ) ranked
        WHERE rn > 1000
    );
END;
$$;