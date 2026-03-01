-- Fix user_preferences table: convert user_id from text to uuid and add RLS policies

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_select_user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_insert_user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_update_user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_delete_user_preferences" ON public.user_preferences;

 -- Update any rows that might have invalid user_id values and normalize the column
 DO $$
 DECLARE
   v_user_id_type TEXT;
 BEGIN
   SELECT data_type
   INTO v_user_id_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_preferences'
     AND column_name = 'user_id'
   LIMIT 1;

   IF v_user_id_type IS NULL THEN
     RETURN;
   END IF;

   IF v_user_id_type IN ('character varying', 'text') THEN
     DELETE FROM public.user_preferences
     WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

     ALTER TABLE public.user_preferences 
     ALTER COLUMN user_id DROP DEFAULT;

     ALTER TABLE public.user_preferences 
     ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
   ELSE
     ALTER TABLE public.user_preferences 
     ALTER COLUMN user_id DROP DEFAULT;
   END IF;

   ALTER TABLE public.user_preferences
   ALTER COLUMN user_id SET NOT NULL;

   ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
 END;
 $$;

-- Create RLS policies with proper UUID comparison
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own preferences"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
