-- Add INSERT policy for anon and authenticated users on the waiting_list table.
-- The Edge Function uses the service role key (bypasses RLS), so this is a
-- correctness safeguard in case the calling credential changes in the future.

DROP POLICY IF EXISTS "waiting_list_anon_insert" ON public.waiting_list;

CREATE POLICY "waiting_list_anon_insert"
  ON public.waiting_list
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
