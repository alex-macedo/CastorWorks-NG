-- Create table to store push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

 -- Users can only manage their own subscriptions
 DO $$
 BEGIN
   IF EXISTS (
     SELECT 1
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'push_subscriptions'
   ) THEN
     DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
     DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
     DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.push_subscriptions;
     DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;

     EXECUTE '
       CREATE POLICY "Users can view own subscriptions"
       ON public.push_subscriptions FOR SELECT
       USING (auth.uid() = user_id)
     ';

     EXECUTE '
       CREATE POLICY "Users can insert own subscriptions"
       ON public.push_subscriptions FOR INSERT
       WITH CHECK (auth.uid() = user_id)
     ';

     EXECUTE '
       CREATE POLICY "Users can update own subscriptions"
       ON public.push_subscriptions FOR UPDATE
       USING (auth.uid() = user_id)
     ';

     EXECUTE '
       CREATE POLICY "Users can delete own subscriptions"
       ON public.push_subscriptions FOR DELETE
       USING (auth.uid() = user_id)
     ';
   END IF;
 END;
 $$;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
