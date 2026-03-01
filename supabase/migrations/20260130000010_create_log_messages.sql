-- Create log_messages table
CREATE TABLE IF NOT EXISTS public.log_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    context JSONB,
    resolved BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.log_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow authenticated users to insert logs with their own user_id
CREATE POLICY "Authenticated users can insert logs"
ON public.log_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- Allow admins and system users to view logs
CREATE POLICY "Admins can view logs"
ON public.log_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'global_admin')
  )
);

-- Allow admins to update logs (e.g. mark as resolved)
CREATE POLICY "Admins can update logs"
ON public.log_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'global_admin')
  )
);

-- RPC function to log message
CREATE OR REPLACE FUNCTION public.log_message(
    p_level TEXT,
    p_message TEXT,
    p_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO public.log_messages (level, message, context, user_id)
    VALUES (p_level, p_message, p_context, v_user_id)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;
