-- ============================================================================
-- USER PREFERENCES RLS POLICIES (Fixed Type Casting)
-- Restore proper user-scoped policies for user_preferences table
-- ============================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;

 -- Users can only operate on their own preferences
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

   IF v_user_id_type = 'uuid' THEN
     CREATE POLICY "Users can view own preferences"
       ON public.user_preferences
       FOR SELECT
       USING (user_id = auth.uid());

     CREATE POLICY "Users can insert own preferences"
       ON public.user_preferences
       FOR INSERT
       WITH CHECK (user_id = auth.uid());

     CREATE POLICY "Users can update own preferences"
       ON public.user_preferences
       FOR UPDATE
       USING (user_id = auth.uid())
       WITH CHECK (user_id = auth.uid());

     CREATE POLICY "Users can delete own preferences"
       ON public.user_preferences
       FOR DELETE
       USING (user_id = auth.uid());
   ELSE
     CREATE POLICY "Users can view own preferences"
       ON public.user_preferences
       FOR SELECT
       USING (user_id = auth.uid()::text);

     CREATE POLICY "Users can insert own preferences"
       ON public.user_preferences
       FOR INSERT
       WITH CHECK (user_id = auth.uid()::text);

     CREATE POLICY "Users can update own preferences"
       ON public.user_preferences
       FOR UPDATE
       USING (user_id = auth.uid()::text)
       WITH CHECK (user_id = auth.uid()::text);

     CREATE POLICY "Users can delete own preferences"
       ON public.user_preferences
       FOR DELETE
       USING (user_id = auth.uid()::text);
   END IF;
 END;
 $$;

-- Ensure RLS is enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
