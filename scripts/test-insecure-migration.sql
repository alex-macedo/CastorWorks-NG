-- ============================================================================
-- TEST MIGRATION - INTENTIONALLY INSECURE (FOR TESTING SECURITY SCANNER)
-- This file should be BLOCKED by the pre-commit hook and CI/CD pipeline
-- ============================================================================

-- Test 1: USING (true) - Should be caught as CRITICAL
CREATE TABLE IF NOT EXISTS public.test_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  material_name TEXT NOT NULL,
  quantity INTEGER NOT NULL
);

ALTER TABLE public.test_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view materials"
  ON public.test_materials
  FOR SELECT
  USING (true);  -- ❌ DANGEROUS: Any authenticated user can see ALL materials

-- Test 2: WITH CHECK (true) - Should be caught as CRITICAL
CREATE POLICY "Users can insert materials"
  ON public.test_materials
  FOR INSERT
  WITH CHECK (true);  -- ❌ DANGEROUS: Any authenticated user can insert anything

-- Test 3: Anyone can... policy name - Should be caught as CRITICAL
CREATE TABLE IF NOT EXISTS public.test_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  theme TEXT DEFAULT 'light'
);

ALTER TABLE public.test_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preferences"
  ON public.test_preferences
  FOR SELECT
  USING (true);  -- ❌ DANGEROUS: Unauthenticated access

CREATE POLICY "Anyone can update preferences"
  ON public.test_preferences
  FOR UPDATE
  USING (true)  -- ❌ DANGEROUS: Public can modify
  WITH CHECK (true);  -- ❌ DANGEROUS: No validation

-- Test 4: FOR ALL without WITH CHECK - Should be caught as WARNING
CREATE POLICY "Users can manage data"
  ON public.test_materials
  FOR ALL
  USING (auth.uid() IS NOT NULL);  -- ⚠️  Missing WITH CHECK clause
