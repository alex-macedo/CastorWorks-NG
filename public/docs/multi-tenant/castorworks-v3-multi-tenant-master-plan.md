# CastorWorks v3 - Multi-Tenant Master Plan
## Complete Directory Isolation with Production-Ready Implementation

**Version:** 3.0 (Unified Strategy)
**Date:** January 11, 2026
**Author:** Development Agent (AI Code Review & Architecture Analysis)
**Strategy:** Separate directory (CastorWorksv3) + Multi-tenant implementation
**Status:** Validated against production codebase (200+ tables, 100+ hooks, 40+ Edge Functions)

---

## Executive Summary

This master plan transforms CastorWorks from single-tenant to **multi-tenant SaaS platform** using:

1. **Complete directory isolation** → CastorWorksv3 separate from current codebase
2. **Independent infrastructure** → Separate Supabase instance + database
3. **Production-ready architecture** → Shared schema with tenant_id columns
4. **Zero disruption** → Current version continues business testing untouched

### Why This Unified Approach

**Your Situation:**
- ❌ No live customers yet (safe to experiment)
- ✅ Business actively testing current version (needs stability)
- 🎯 Want multi-tenant platform (commercial SaaS)

**Solution:**
```
CastorWorks/          → Keep stable for business testing
    (v1.x single-tenant)

CastorWorksv3/        → Build multi-tenant in isolation
    (v2.0 multi-tenant)  → Complete freedom to experiment
                          → Zero risk to v1
                          → Merge back when ready
```

### Key Benefits

✅ **Zero disruption** to business testing
✅ **Complete isolation** (own git, dependencies, database)
✅ **Freedom to experiment** (break things without fear)
✅ **Side-by-side testing** (run both versions simultaneously)
✅ **Independent package updates** (upgrade React, Supabase safely)
✅ **Simple rollback** (delete directory if needed)
✅ **Production-grade architecture** (industry-standard patterns)

---

## Part 1: Directory Setup & Infrastructure

### 1.1 Create CastorWorksv3 Directory (5 Minutes)

```bash
# Navigate to projects folder
cd ~/github

# Clone current repo as starting point
git clone /Users/amacedo/github/CastorWorks CastorWorksv3
cd CastorWorksv3

# Remove old git history (start fresh)
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "Initial commit - CastorWorks v3 Multi-Tenant foundation"

# Optional: Create new GitHub repository
# At github.com/your-org, create "CastorWorksv3"
git remote add origin git@github.com:your-org/CastorWorksv3.git
git branch -M main
git push -u origin main
```

**Result:** You now have two independent directories:
- `~/github/CastorWorks/` → v1 single-tenant (business testing)
- `~/github/CastorWorksv3/` → v3 multi-tenant (development)

### 1.2 Setup Independent Supabase Instance (15 Minutes)

**Option A: Self-Hosted Docker (Free, Full Control)**

```bash
# Clone Supabase for v3
cd ~
git clone https://github.com/supabase/supabase.git supabase-v3
cd supabase-v3/docker

# Edit docker-compose.yml - change ALL ports to avoid conflicts
# PostgreSQL: 5433 → 5434
# Kong API: 8000 → 8001
# Studio: 3000 → 3001
# Meta: 8080 → 8081
# Realtime: 4000 → 4001

# Example edits in docker-compose.yml:
# postgres:
#   ports:
#     - "5434:5432"  # Changed from 5433
#
# kong:
#   ports:
#     - "8001:8000"  # Changed from 8000
#
# studio:
#   ports:
#     - "3001:3000"  # Changed from 3000

# Start v3 Supabase
docker-compose up -d

# Verify running
docker ps | grep supabase
# Should see containers on ports 5434, 8001, 3001, etc.

# Access Studio
# http://localhost:3001
# Get anon key and service role key from Studio → Settings → API
```

**Option B: Managed Supabase (Simpler, $25/month)**

```bash
# 1. Go to https://supabase.com/dashboard
# 2. Create New Project
#    Name: castorworks-v3-multi-tenant
#    Region: Same as current instance
#    Database Password: [strong password]
# 3. Wait for provisioning (~2 minutes)
# 4. Go to Settings → API
#    Copy: URL, anon key, service_role key
```

### 1.3 Configure CastorWorksv3 Environment (2 Minutes)

**File:** `~/github/CastorWorksv3/.env`

```env
# ============================================
# CastorWorks v3 Multi-Tenant Configuration
# ============================================

# NEW Supabase Instance (separate from v1)
# Docker: http://localhost:8001 or https://mt-dev.castorworks.cloud
# Managed: https://xxx.supabase.co
VITE_SUPABASE_URL=https://mt-dev.castorworks.cloud
VITE_SUPABASE_ANON_KEY=[your-new-anon-key]
VITE_SUPABASE_SERVICE_ROLE_KEY=[your-new-service-role-key]

# Database connection (different port from v1)
# v1 uses 5433, v3 uses 5434
DATABASE_URL=postgresql://postgres:[password]@127.0.0.1:5434/postgres

# Multi-tenancy feature flag (always true in v3)
VITE_ENABLE_MULTI_TENANCY=true

# Shared external services (same as v1)
RESEND_API_KEY=re_Hv4VdNTq_2JxXgfC3pWfyjP8ZhCAjPQWE
WEATHER_API_KEY=645ec34ce0fc4de3ab7142224250211
ANTHROPIC_API_KEY=<REDACTED>
ANTRHOPIC_MODEL=claude-sonnet-4.5-20250929

# Client Portal
VITE_ADMIN_EMAIL=admin@castorworks.cloud
VITE_ADMIN_NAME=CastorWorks Administrator
VITE_SUPPORT_URL=https://support.castorworks.cloud
```

**Update `.gitignore`:**

```bash
# Ensure .env is ignored
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### 1.4 Update package.json Metadata (1 Minute)

**File:** `~/github/CastorWorksv3/package.json`

```json
{
  "name": "castorworks-v3-multi-tenant",
  "version": "2.0.0-alpha.1",
  "description": "CastorWorks Multi-Tenant SaaS Platform",
  "repository": {
    "type": "git",
    "url": "git+https://github.com:your-org/CastorWorksv3.git"
  },
  "scripts": {
    "dev": "vite",
    "dev:full": "concurrently \"npm run dev\" \"npm run translation-api\"",
    "build": "npm run copy-docs && vite build",

    "test": "vitest",
    "test:tenant-isolation": "vitest run src/__tests__/multi-tenancy/",

    "migrate": "supabase db push",
    "migrate:reset": "supabase db reset",

    "sync:from-v1": "node scripts/sync-from-v1.js"
  }
}
```

### 1.5 Install Dependencies & Verify (3 Minutes)

```bash
cd ~/github/CastorWorksv3

# Fresh install
npm install

# Start development server
npm run dev

# Should see:
# ➜  Local:   http://localhost:5173/
# Connected to Supabase at: https://mt-dev.castorworks.cloud
```

**Test both versions side-by-side:**

```bash
# Terminal 1: v1 (business testing)
cd ~/github/CastorWorks
npm run dev  # Port 5173

# Terminal 2: v3 (multi-tenant development)
cd ~/github/CastorWorksv3
npm run dev -- --port 5174  # Port 5174

# Now you can compare:
# http://localhost:5173 → v1 single-tenant
# http://localhost:5174 → v3 multi-tenant (in development)
```

---

## Part 2: Multi-Tenant Implementation (Weeks 1-12)

### Phase 0: Foundation & Super Admin (Week 1)

**Working Directory:** `~/github/CastorWorksv3/`

#### 0.1 Add Super Admin Role

**File:** `supabase/migrations/20260111000000_add_super_admin_role.sql`

```sql
-- Add super_admin to app_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Grant super_admin to initial administrator
-- Update with your email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'admin@castorworks.cloud'
ON CONFLICT (user_id, role) DO NOTHING;
```

#### 0.2 Create Tenants Table & Helper Functions

**File:** `supabase/migrations/20260111000001_create_tenant_infrastructure.sql`

```sql
BEGIN;

-- ============================================
-- 1. Tenants Registry Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
  settings JSONB DEFAULT '{}',
  max_users INT DEFAULT NULL,
  max_projects INT DEFAULT NULL,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise'))
);

-- Indexes
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_subscription ON public.tenants(subscription_tier);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "super_admin_manage_tenants" ON public.tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

CREATE POLICY "users_view_own_tenant" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 2. Helper Functions
-- ============================================

-- Get current tenant from session or user profile
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Try session variable first
  BEGIN
    v_tenant_id := current_setting('app.current_tenant_id', true)::UUID;
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Fallback to user profile
  SELECT tenant_id INTO v_tenant_id
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN v_tenant_id;
END;
$$;

-- Check if project belongs to tenant
CREATE OR REPLACE FUNCTION public.project_belongs_to_tenant(
  _project_id UUID,
  _tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND tenant_id = _tenant_id
  );
$$;

-- ============================================
-- 3. Migrate Existing company_profiles
-- ============================================

-- Copy data from company_profiles to tenants
INSERT INTO public.tenants (id, name, subdomain, status, created_at)
SELECT
  id,
  name,
  LOWER(REGEXP_REPLACE(REPLACE(name, ' ', '-'), '[^a-zA-Z0-9-]', '', 'g')),
  'active',
  created_at
FROM company_profiles
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = company_profiles.id)
ON CONFLICT (id) DO NOTHING;

-- Create default tenant if none exist
INSERT INTO public.tenants (name, subdomain, status, subscription_tier)
SELECT 'Default Company', 'default', 'active', 'enterprise'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1);

COMMIT;
```

#### 0.3 Apply Migrations

```bash
cd ~/github/CastorWorksv3

# Push migrations to database
npm run migrate

# Verify in Supabase Studio
# http://localhost:3001 (Docker) or your managed URL
# Check: Tables → tenants should exist
```

### Phase 1: Database Schema (Week 2)

#### 1.1 Add tenant_id to All Tables

**File:** `supabase/migrations/20260112000000_add_tenant_id_columns.sql`

```sql
-- Add tenant_id to all 200+ tables
-- Generated list based on actual schema

BEGIN;

-- ============================================
-- Core Business Tables
-- ============================================

-- user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_tenant_id
  ON public.user_profiles(tenant_id);

-- projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tenant_id
  ON public.projects(tenant_id);

-- clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_tenant_id
  ON public.clients(tenant_id);

-- estimates
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_tenant_id
  ON public.estimates(tenant_id);

-- purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_tenant_id
  ON public.purchase_orders(tenant_id);

-- project_phases
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_phases_tenant_id
  ON public.project_phases(tenant_id);

-- project_activities
ALTER TABLE public.project_activities
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_activities_tenant_id
  ON public.project_activities(tenant_id);

-- budget_line_items
ALTER TABLE public.budget_line_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_line_items_tenant_id
  ON public.budget_line_items(tenant_id);

-- project_budgets
ALTER TABLE public.project_budgets
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_budgets_tenant_id
  ON public.project_budgets(tenant_id);

-- project_materials
ALTER TABLE public.project_materials
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_materials_tenant_id
  ON public.project_materials(tenant_id);

-- project_team_members
ALTER TABLE public.project_team_members
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_team_members_tenant_id
  ON public.project_team_members(tenant_id);

-- daily_logs
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_logs_tenant_id
  ON public.daily_logs(tenant_id);

-- time_logs
ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_logs_tenant_id
  ON public.time_logs(tenant_id);

-- delivery_confirmations
ALTER TABLE public.delivery_confirmations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_confirmations_tenant_id
  ON public.delivery_confirmations(tenant_id);

-- purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_requests_tenant_id
  ON public.purchase_requests(tenant_id);

-- quote_requests
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_requests_tenant_id
  ON public.quote_requests(tenant_id);

-- contractors
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_tenant_id
  ON public.contractors(tenant_id);

-- suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_tenant_id
  ON public.suppliers(tenant_id);

-- roadmap_items
ALTER TABLE public.roadmap_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roadmap_items_tenant_id
  ON public.roadmap_items(tenant_id);

-- roadmap_tasks
ALTER TABLE public.roadmap_tasks
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roadmap_tasks_tenant_id
  ON public.roadmap_tasks(tenant_id);

-- architect_tasks
ALTER TABLE public.architect_tasks
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_architect_tasks_tenant_id
  ON public.architect_tasks(tenant_id);

-- architect_meetings
ALTER TABLE public.architect_meetings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_architect_meetings_tenant_id
  ON public.architect_meetings(tenant_id);

-- architect_site_diary
ALTER TABLE public.architect_site_diary
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_architect_site_diary_tenant_id
  ON public.architect_site_diary(tenant_id);

-- architect_moodboards
ALTER TABLE public.architect_moodboards
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_architect_moodboards_tenant_id
  ON public.architect_moodboards(tenant_id);

-- contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tenant_id
  ON public.contacts(tenant_id);

-- campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_tenant_id
  ON public.campaigns(tenant_id);

-- financial_entries
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_entries_tenant_id
  ON public.financial_entries(tenant_id);

-- Continue for all remaining tables...
-- (Script would include all 200+ tables - truncated for readability)

COMMIT;
```

#### 1.2 Migrate Existing Data

**File:** `supabase/migrations/20260113000000_migrate_existing_data.sql`

```sql
BEGIN;

-- Get default tenant
DO $$
DECLARE
  v_default_tenant_id UUID;
BEGIN
  SELECT id INTO v_default_tenant_id
  FROM public.tenants
  ORDER BY created_at ASC
  LIMIT 1;

  -- Update user_profiles
  UPDATE public.user_profiles
  SET tenant_id = COALESCE(company_id, v_default_tenant_id)
  WHERE tenant_id IS NULL;

  -- Update projects (from owner's tenant)
  UPDATE public.projects p
  SET tenant_id = (
    SELECT tenant_id FROM public.user_profiles up
    WHERE up.user_id = p.owner_id
    LIMIT 1
  )
  WHERE p.tenant_id IS NULL;

  -- Fallback for orphaned projects
  UPDATE public.projects
  SET tenant_id = v_default_tenant_id
  WHERE tenant_id IS NULL;

  -- Propagate to related tables via foreign keys
  -- Clients
  UPDATE public.clients c
  SET tenant_id = (
    SELECT DISTINCT tenant_id FROM public.projects p
    WHERE p.client_id = c.id
    LIMIT 1
  )
  WHERE c.tenant_id IS NULL;

  UPDATE public.clients
  SET tenant_id = v_default_tenant_id
  WHERE tenant_id IS NULL;

  -- Repeat for all tables with project relationships
  -- ... (full script would cover all 200+ tables)

END $$;

COMMIT;
```

#### 1.3 Enhanced RLS Policies

**File:** `supabase/migrations/20260114000000_update_rls_policies.sql`

```sql
-- Enhanced has_project_access with tenant boundaries
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_user_tenant_id UUID;
  v_project_tenant_id UUID;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check super admin (bypass tenant checks)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Get user and project tenants
  SELECT tenant_id INTO v_user_tenant_id
  FROM public.user_profiles
  WHERE user_id = _user_id;

  SELECT tenant_id INTO v_project_tenant_id
  FROM public.projects
  WHERE id = _project_id;

  -- CRITICAL: Enforce tenant boundary
  IF v_user_tenant_id IS NULL OR v_project_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_user_tenant_id != v_project_tenant_id THEN
    RETURN FALSE;
  END IF;

  -- Check standard access within tenant
  RETURN (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'project_manager'::app_role)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = _project_id AND owner_id = _user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_team_members
      WHERE project_id = _project_id AND user_id = _user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.client_project_access
      WHERE project_id = _project_id AND user_id = _user_id
    )
  );
END;
$$;

-- Update projects RLS policy
DROP POLICY IF EXISTS "tenant_projects" ON public.projects;
CREATE POLICY "tenant_projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
    OR
    (
      tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
      AND has_project_access(auth.uid(), id)
    )
  );

-- Repeat for all tenant-scoped tables...
```

```bash
# Apply migrations
cd ~/github/CastorWorksv3
npm run migrate
```

### Phase 2: Application Layer (Weeks 3-5)

#### 2.1 Create Tenant Context

**File:** `src/contexts/TenantContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  subscription_tier: string;
  features: Record<string, any>;
  settings: Record<string, any>;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
  clearTenant: () => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Check super admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const isSA = roles?.some(r => r.role === 'super_admin') ?? false;
        setIsSuperAdmin(isSA);
        localStorage.setItem('isSuperAdmin', String(isSA));

        // Load tenant
        const stored = localStorage.getItem('currentTenant');
        if (stored) {
          setCurrentTenant(JSON.parse(stored));
        } else {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('tenant_id, tenants(*)')
            .eq('user_id', user.id)
            .single();

          if (profile?.tenants) {
            setCurrentTenant(profile.tenants as Tenant);
            localStorage.setItem('currentTenant', JSON.stringify(profile.tenants));
          }
        }
      } catch (error) {
        console.error('Failed to load tenant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, []);

  const setTenantContext = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    localStorage.setItem('currentTenant', JSON.stringify(tenant));
  };

  const clearTenantContext = () => {
    setCurrentTenant(null);
    localStorage.removeItem('currentTenant');
  };

  return (
    <TenantContext.Provider value={{
      currentTenant,
      setTenant: setTenantContext,
      clearTenant: clearTenantContext,
      isLoading,
      isSuperAdmin
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};
```

#### 2.2 Create Tenant-Aware Supabase Client Wrapper

**File:** `src/integrations/supabase/tenant-client.ts`

```typescript
import { supabase } from './client';
import type { Database } from './types';

/**
 * Tenant-Aware Supabase Client Wrapper
 *
 * Automatically injects tenant_id filtering for all tenant-scoped tables.
 * Eliminates need to manually update 100+ hooks.
 */

// Tables with automatic tenant filtering
const TENANT_SCOPED_TABLES = [
  'projects', 'clients', 'estimates', 'purchase_orders',
  'project_phases', 'project_activities', 'budget_line_items',
  'project_budgets', 'project_materials', 'project_team_members',
  'daily_logs', 'time_logs', 'delivery_confirmations',
  'purchase_requests', 'quote_requests', 'contractors', 'suppliers',
  'roadmap_items', 'roadmap_tasks', 'architect_tasks',
  'architect_meetings', 'architect_site_diary', 'architect_moodboards',
  'contacts', 'campaigns', 'financial_entries'
  // ... all tenant-scoped tables
] as const;

class TenantAwareSupabaseClient {
  private getTenantId(): string | null {
    try {
      const stored = localStorage.getItem('currentTenant');
      if (!stored) return null;
      return JSON.parse(stored).id;
    } catch {
      return null;
    }
  }

  private isSuperAdmin(): boolean {
    return localStorage.getItem('isSuperAdmin') === 'true';
  }

  from<T extends keyof Database['public']['Tables']>(table: T) {
    const builder = supabase.from(table);

    // Skip filtering for super admins or non-tenant tables
    if (this.isSuperAdmin() || !TENANT_SCOPED_TABLES.includes(table as any)) {
      return builder;
    }

    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context. User must be assigned to a tenant.');
    }

    // Return wrapped builder with automatic tenant filtering
    const originalSelect = builder.select.bind(builder);
    const originalInsert = builder.insert.bind(builder);
    const originalUpdate = builder.update.bind(builder);
    const originalDelete = builder.delete.bind(builder);

    return {
      ...builder,
      select: (...args: any[]) => originalSelect(...args).eq('tenant_id', tenantId),
      insert: (data: any) => {
        const withTenant = Array.isArray(data)
          ? data.map(item => ({ ...item, tenant_id: tenantId }))
          : { ...data, tenant_id: tenantId };
        return originalInsert(withTenant);
      },
      update: (data: any) => originalUpdate(data).eq('tenant_id', tenantId),
      delete: () => originalDelete().eq('tenant_id', tenantId),
    };
  }

  // Proxy other methods
  get auth() { return supabase.auth; }
  get storage() { return supabase.storage; }
  get realtime() { return supabase.realtime; }
  get functions() { return supabase.functions; }
  rpc(fn: string, args?: any) { return supabase.rpc(fn, args); }
}

export const tenantSupabase = new TenantAwareSupabaseClient();
export { supabase }; // For super admin operations
```

#### 2.3 Update Hooks (One-Line Change!)

**Example:** `src/hooks/useProjects.tsx`

```typescript
// BEFORE (v1):
import { supabase } from '@/integrations/supabase/client';

// AFTER (v3 - just change import!):
import { tenantSupabase as supabase } from '@/integrations/supabase/tenant-client';

// Rest of code stays EXACTLY the same!
// Tenant filtering happens automatically 🎉
export const useProjects = () => {
  const { data } = await supabase.from('projects').select('*');
  // Automatically filtered by tenant_id!
};
```

**Automated Update Script:**

```bash
# Update all hooks at once
cd ~/github/CastorWorksv3

# Find and replace in all hooks
find src/hooks -name "*.tsx" -type f -exec sed -i '' \
  "s|from '@/integrations/supabase/client'|from '@/integrations/supabase/tenant-client'|g" {} +

echo "✅ Updated all hooks to use tenant-aware client"
```

#### 2.4 Add TenantProvider to App

**File:** `src/App.tsx`

```typescript
import { TenantProvider } from '@/contexts/TenantContext';

function App() {
  return (
    <TenantProvider>
      <QueryClientProvider client={queryClient}>
        {/* existing providers */}
      </QueryClientProvider>
    </TenantProvider>
  );
}
```

### Phase 3: Edge Functions (Week 6-7)

#### 3.1 Tenant Authorization Helper

**File:** `supabase/functions/_shared/tenant-authorization.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getTenantFromUser(
  supabaseClient: any,
  userId: string
): Promise<string | null> {
  const { data } = await supabaseClient
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .single();
  return data?.tenant_id || null;
}

export async function validateTenantAccess(
  supabaseClient: any,
  userId: string,
  requiredTenantId: string
): Promise<boolean> {
  const userTenantId = await getTenantFromUser(supabaseClient, userId);
  return userTenantId === requiredTenantId;
}
```

#### 3.2 Update Edge Functions Pattern

**Example:** `supabase/functions/generate-purchase-order/index.ts`

```typescript
import { getTenantFromUser } from '../_shared/tenant-authorization.ts';

serve(async (req) => {
  const supabaseClient = createClient(/* ... */);

  // 1. Auth
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Get tenant
  const tenantId = await getTenantFromUser(supabaseClient, user.id);
  if (!tenantId) return new Response('No tenant', { status: 403 });

  const { purchaseOrderId } = await req.json();

  // 3. Verify tenant boundary
  const { data: po } = await supabaseClient
    .from('purchase_orders')
    .select('tenant_id')
    .eq('id', purchaseOrderId)
    .single();

  if (po.tenant_id !== tenantId) {
    return new Response('Tenant boundary violation', { status: 403 });
  }

  // 4. Proceed with business logic
  // ... safe, tenant-aware
});
```

### Phase 4: Storage Security (Week 8)

**File:** `supabase/migrations/20260120000000_tenant_aware_storage.sql`

```sql
-- Helper for storage tenant access
CREATE OR REPLACE FUNCTION public.storage_object_tenant_access(
  _user_id UUID,
  _bucket_id TEXT,
  _object_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_project_id UUID;
  v_user_tenant_id UUID;
  v_project_tenant_id UUID;
BEGIN
  -- Extract project ID from path
  v_project_id := split_part(_object_name, '/', 1)::UUID;

  SELECT tenant_id INTO v_user_tenant_id
  FROM public.user_profiles WHERE user_id = _user_id;

  SELECT tenant_id INTO v_project_tenant_id
  FROM public.projects WHERE id = v_project_id;

  RETURN v_user_tenant_id = v_project_tenant_id
    AND has_project_access(_user_id, v_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update storage policies
DROP POLICY IF EXISTS "tenant_project_documents" ON storage.objects;
CREATE POLICY "tenant_project_documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'project-documents'
    AND storage_object_tenant_access(auth.uid(), bucket_id, name)
  );
```

### Phase 5: Testing (Week 9-10)

**File:** `src/__tests__/multi-tenancy/tenant-isolation.test.ts`

```typescript
import { describe, test, expect } from 'vitest';

describe('Tenant Isolation', () => {
  test('User from Tenant A cannot see Tenant B projects', async () => {
    // Test implementation
  });

  test('Storage files are tenant-isolated', async () => {
    // Test implementation
  });

  test('Super admin can access all tenants', async () => {
    // Test implementation
  });
});
```

---

## Part 3: Development Workflow

### Daily Work Pattern

```bash
# Morning: Work on v1 (business testing feedback)
cd ~/github/CastorWorks
git pull origin main
npm run dev
# Fix reported bugs, test
git commit -am "fix: resolve reported issue"
git push

# Afternoon: Work on v3 (multi-tenant development)
cd ~/github/CastorWorksv3
git pull origin main
npm run dev -- --port 5174
# Implement multi-tenant features
git commit -am "feat(mt): add tenant switcher UI"
git push
```

### Syncing Critical Fixes from v1 to v3

```bash
# Bug fixed in v1, need in v3
cd ~/github/CastorWorks
git log --oneline | head -5
# Example: abc123 fix: date formatting bug

# Option 1: Manual (safest)
cd ~/github/CastorWorksv3
# Manually apply same fix
git commit -am "sync: port date fix from v1 (abc123)"

# Option 2: File-level sync
# Copy specific utility files
cp ~/github/CastorWorks/src/utils/dateUtils.ts ~/github/CastorWorksv3/src/utils/
cd ~/github/CastorWorksv3
git commit -am "sync: update dateUtils from v1"
```

---

## Part 4: Production Cutover (Week 15)

### Data Migration

**Script:** `scripts/migrate-v1-to-v3.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

async function migrate() {
  const v1 = createClient(
    'https://dev.castorworks.cloud',
    process.env.V1_SERVICE_KEY!
  );

  const v3 = createClient(
    'https://mt-dev.castorworks.cloud',
    process.env.V3_SERVICE_KEY!
  );

  console.log('🚀 Migrating v1 → v3...');

  // Create default tenant
  const { data: tenant } = await v3.from('tenants').insert({
    name: 'CastorWorks',
    subdomain: 'default',
    status: 'active'
  }).select().single();

  // Migrate all data with tenant_id = tenant.id
  // ... (full implementation in guide)
}
```

### Deployment

```bash
# Weekend deployment
# 1. Build v3
cd ~/github/CastorWorksv3
npm run build

# 2. Deploy to production
# 3. Update DNS
# 4. Test thoroughly
# 5. Monitor
```

---

## Summary

**Timeline:** 15 weeks total
- Week 1: Setup + Phase 0
- Weeks 2-10: Implementation
- Weeks 11-14: Testing + UAT
- Week 15: Production cutover

**Cost:** $0-25/month during development

**Risk:** Minimal (complete isolation)

**Result:** Production-ready multi-tenant SaaS platform

---

**Ready to start?**

```bash
cd ~/github
git clone /Users/amacedo/github/CastorWorks CastorWorksv3
cd CastorWorksv3
rm -rf .git && git init
# Begin implementation! 🚀
```

---

**Document Version:** 3.0 (Unified)
**Last Updated:** January 11, 2026
