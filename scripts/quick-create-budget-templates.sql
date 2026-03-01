-- Quick script to create budget_templates table
-- Run this directly in Supabase Studio SQL Editor

-- Step 1: Create budget_templates table (simplest version first)
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  budget_type VARCHAR(50) DEFAULT 'simple' CHECK (budget_type IN ('simple', 'cost_control')),
  total_budget_amount DECIMAL(12,2),
  has_phases BOOLEAN DEFAULT FALSE,
  has_cost_codes BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if it was created
SELECT 
  'budget_templates' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'budget_templates'
    ) THEN '✅ CREATED SUCCESSFULLY'
    ELSE '❌ FAILED TO CREATE'
  END as status;

-- If successful, add the foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'budget_templates'
  ) THEN
    -- Add foreign key if company_profiles exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'company_profiles'
    ) THEN
      ALTER TABLE budget_templates
      ADD CONSTRAINT budget_templates_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
      RAISE NOTICE 'company_profiles table does not exist - skipping foreign key';
    END IF;
  END IF;
END $$;

