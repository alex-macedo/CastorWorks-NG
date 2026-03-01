-- Step-by-step script to create budget_templates tables
-- Run each section separately to identify where it fails

-- ============================================================================
-- STEP 1: Ensure dependencies exist
-- ============================================================================

-- 1.1: company_profiles
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- 1.2: cost_codes
CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  level INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;

-- Verify dependencies
SELECT 'company_profiles' as table_name, 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_profiles') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'cost_codes',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cost_codes') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'project_phases',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_phases') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ============================================================================
-- STEP 2: Create budget_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  budget_type VARCHAR(50) DEFAULT 'simple' CHECK (budget_type IN ('simple', 'cost_control')),
  total_budget_amount DECIMAL(12,2),
  has_phases BOOLEAN DEFAULT FALSE,
  has_cost_codes BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify creation
SELECT 'budget_templates' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_templates') 
    THEN '✅ CREATED' ELSE '❌ FAILED' END as status;

-- ============================================================================
-- STEP 3: Create budget_template_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  description TEXT,
  budgeted_amount DECIMAL(12,2) NOT NULL,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify creation
SELECT 'budget_template_items' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_items') 
    THEN '✅ CREATED' ELSE '❌ FAILED' END as status;

-- ============================================================================
-- STEP 4: Create budget_template_phases table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  phase_name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify creation
SELECT 'budget_template_phases' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_phases') 
    THEN '✅ CREATED' ELSE '❌ FAILED' END as status;

-- ============================================================================
-- STEP 5: Create budget_template_cost_codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_template_cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_templates(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify creation
SELECT 'budget_template_cost_codes' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_cost_codes') 
    THEN '✅ CREATED' ELSE '❌ FAILED' END as status;

-- ============================================================================
-- FINAL VERIFICATION: Check all tables
-- ============================================================================

SELECT 
  'budget_templates' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_templates') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'budget_template_items',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_items') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'budget_template_phases',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_phases') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'budget_template_cost_codes',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_template_cost_codes') 
    THEN '✅ EXISTS' ELSE '❌ MISSING' END;

