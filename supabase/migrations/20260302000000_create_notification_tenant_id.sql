-- Notifications.tenant_id is NOT NULL (set by 20260301000008). create_notification must set it.
-- Add p_tenant_id to create_notification; when NULL, resolve from user's tenant_users.

DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_action_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID := p_tenant_id;
    notification_id UUID;
BEGIN
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.tenant_users
        WHERE user_id = p_user_id
        ORDER BY is_owner DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, priority, action_url, data, tenant_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_action_url, p_data, v_tenant_id)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

COMMENT ON FUNCTION public.create_notification IS 'Creates a notification; tenant_id is required (column NOT NULL). When p_tenant_id is omitted, resolved from user''s tenant_users.';
