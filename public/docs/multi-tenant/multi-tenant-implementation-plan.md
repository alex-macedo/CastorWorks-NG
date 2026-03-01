# Multi-Tenant SaaS Implementation Plan for CastorWorks

## Executive Summary

This document outlines a comprehensive plan to transform CastorWorks from a single-tenant SaaS application into a fully multi-tenant platform. The current implementation has partial multi-tenancy support (company_id column exists but is not consistently used), and this plan addresses the complete transformation including database isolation, tenant provisioning, application-level tenant switching, and secure client portal isolation.

## Current State Analysis

### Application Overview
- **Technology Stack**: React + TypeScript + Vite + Supabase + PostgreSQL
- **Architecture**: Single-page application with extensive RLS policies
- **Authentication**: Supabase Auth with role-based access control
- **Client Portal**: Token-based access for external clients

### Existing Multi-Tenancy Implementation
- ✅ **Partial Support**: `company_id` column exists in `user_profiles` table
- ✅ **Company Profiles**: `company_profiles` table for tenant metadata
- ✅ **RLS Framework**: Extensive use of Row Level Security policies
- ❌ **Incomplete**: company_id not consistently used across all tables
- ❌ **Single Database**: All tenants share the same database instance
- ❌ **No Tenant Isolation**: Data isolation relies solely on RLS policies

### Key Findings
1. **Database Schema**: 90+ tables with complex relationships
2. **User Management**: Role-based system with `app_role` enum (admin, project_manager, supervisor, client, etc.)
3. **Client Portal**: Separate authentication flow using tokens
4. **RLS Policies**: Already extensively implemented, just need tenant scoping

## Multi-Tenancy Architecture Design

### Database Isolation Strategy

#### Option A: Shared Database with Schema Separation (Recommended)
**Architecture**: Single PostgreSQL instance with tenant-specific schemas
- `tenant_123_projects`, `tenant_123_users`, `tenant_123_clients`
- Complete data isolation at schema level
- Shared system tables in `public` schema
- Easier backup/restore per tenant

**Pros**: Cost-effective, simpler management, shared resources
**Cons**: Schema management complexity, potential cross-tenant queries

#### Option B: Separate Databases per Tenant
**Architecture**: Each tenant gets their own PostgreSQL database
- Complete physical isolation
- Per-tenant connection pooling
- Independent backups and scaling

**Pros**: Maximum isolation, independent scaling
**Cons**: Higher operational complexity, cost scaling

#### **Chosen Approach**: Shared Database with Schema Separation
Rationale: Balances isolation with operational simplicity for construction SaaS.

### Tenant Data Model

```sql
-- Core tenant management
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  database_schema VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-specific tables will be created in tenant schemas:
-- tenant_{id}_user_profiles
-- tenant_{id}_projects
-- tenant_{id}_clients
-- etc.
```

### Application Architecture Changes

#### 1. Tenant Context Management
```typescript
interface TenantContext {
  id: string;
  name: string;
  schema: string;
  subdomain: string;
  settings: TenantSettings;
}

class TenantManager {
  private currentTenant: TenantContext | null = null;

  async switchTenant(tenantId: string): Promise<void> {
    // Load tenant context
    // Update Supabase client schema
    // Refresh all queries
  }

  getCurrentTenant(): TenantContext | null {
    return this.currentTenant;
  }
}
```

#### 2. Database Connection Management
```typescript
class MultiTenantSupabaseClient {
  private tenantClients = new Map<string, SupabaseClient>();

  getClient(tenantSchema?: string): SupabaseClient {
    const schema = tenantSchema || this.getCurrentTenantSchema();

    if (!this.tenantClients.has(schema)) {
      const client = createClient(url, key, {
        db: { schema },
        global: { headers: { 'X-Tenant-Schema': schema } }
      });
      this.tenantClients.set(schema, client);
    }

    return this.tenantClients.get(schema)!;
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Tenant Management Database Schema
**Files to create/modify:**
- `supabase/migrations/YYYYMMDD_create_tenant_management.sql`
- Update existing migrations to support schema-based isolation

**Key Changes:**
```sql
-- Create tenant management tables
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  database_schema VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to get current tenant schema
CREATE OR REPLACE FUNCTION public.get_current_tenant_schema()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_tenant_schema', true),
    'public'
  );
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Application Tenant Context
**Files to create:**
- `src/contexts/TenantContext.tsx`
- `src/hooks/useTenant.tsx`
- `src/services/tenantService.ts`

**Key Features:**
- Tenant context provider
- Tenant switching logic
- Schema-aware Supabase client wrapper

### Phase 2: Database Migration (Week 3-4)

#### 2.1 Schema Migration Strategy
**Approach:**
1. Create tenant-specific schemas for existing data
2. Migrate data from shared tables to tenant schemas
3. Update all RLS policies to include tenant scoping
4. Maintain backward compatibility during transition

#### 2.2 Data Migration Scripts
**Files to create:**
- `supabase/migrations/YYYYMMDD_migrate_to_multi_tenant.sql`
- `scripts/migrate-to-multi-tenant.js`

**Migration Process:**
```sql
-- For each existing company, create tenant schema
DO $$
DECLARE
    company_record RECORD;
    tenant_schema_name TEXT;
BEGIN
    FOR company_record IN SELECT * FROM company_profiles LOOP
        tenant_schema_name := 'tenant_' || company_record.id::text;

        -- Create tenant schema
        EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || tenant_schema_name;

        -- Migrate user profiles
        EXECUTE 'CREATE TABLE ' || tenant_schema_name || '.user_profiles AS
                 SELECT * FROM public.user_profiles
                 WHERE company_id = $1' USING company_record.id;

        -- Continue for all tenant-specific tables...
    END LOOP;
END $$;
```

### Phase 3: Authentication & Authorization (Week 5-6)

#### 3.1 Tenant-Aware Authentication
**Files to modify:**
- `src/integrations/supabase/client.ts`
- `src/hooks/useCurrentUserProfile.tsx`
- `src/hooks/useUserRoles.tsx`

**Key Changes:**
- Add tenant context to authentication flow
- Update user profile queries to use tenant schema
- Modify role checking to include tenant scope

#### 3.2 Updated RLS Policies
**Example Policy Update:**
```sql
-- Before (single-tenant)
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- After (multi-tenant)
CREATE POLICY "Users can view own tenant projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id
    AND get_current_tenant_schema() = 'tenant_' || (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );
```

### Phase 4: Application Updates (Week 7-8)

#### 4.1 Tenant-Aware Components
**Files to update:**
- All data-fetching hooks (`useProjects.tsx`, `useClients.tsx`, etc.)
- Components that display tenant-specific data
- Forms that create tenant-scoped records

#### 4.2 Tenant Switching UI
**Files to create:**
- `src/components/TenantSelector.tsx`
- `src/pages/TenantManagement.tsx`
- Update `AppSidebar` to include tenant context

### Phase 5: Client Portal Isolation (Week 9-10)

#### 5.1 Tenant-Specific Client Portals
**Current State:** Client portal shares authentication with main app
**Target State:** Each tenant has isolated client portal

**Implementation:**
```typescript
// Tenant-specific client portal routing
const clientPortalRoutes = tenantId => [
  `/client/${tenantId}/dashboard`,
  `/client/${tenantId}/projects`,
  `/client/${tenantId}/documents`
];
```

#### 5.2 Client Portal Authentication
**Files to create/modify:**
- `src/hooks/clientPortal/useTenantClientAuth.tsx`
- `src/pages/clientPortal/TenantClientPortal.tsx`

### Phase 6: Tenant Provisioning (Week 11-12)

#### 6.1 Onboarding Workflow
**Files to create:**
- `src/pages/TenantOnboarding.tsx`
- `src/services/tenantProvisioningService.ts`
- `src/components/onboarding/TenantSetupWizard.tsx`

**Onboarding Steps:**
1. Company information collection
2. Subdomain selection and validation
3. Database schema creation
4. Initial admin user setup
5. Sample data seeding (optional)

#### 6.2 Tenant Management Dashboard
**Files to create:**
- `src/pages/admin/TenantManagement.tsx`
- `src/components/admin/TenantList.tsx`
- `src/components/admin/TenantSettings.tsx`

## Security Considerations

### Data Isolation
1. **Schema-level Isolation**: Each tenant has dedicated schema
2. **RLS Policies**: All queries filtered by tenant context
3. **Connection Security**: Tenant-specific database users
4. **API Security**: Tenant context validation on all endpoints

### Access Control
1. **Tenant Admin Role**: Can manage users within their tenant
2. **Super Admin Role**: Can manage tenants across the platform
3. **Client Portal**: Isolated authentication per tenant
4. **Audit Logging**: All tenant operations logged with tenant context

## Migration Strategy

### Zero-Downtime Migration
1. **Phase 1**: Add tenant infrastructure alongside existing system
2. **Phase 2**: Migrate existing tenants to new structure
3. **Phase 3**: Enable new tenant provisioning
4. **Phase 4**: Deprecate old single-tenant endpoints
5. **Phase 5**: Clean up legacy code

### Data Migration
1. **Schema Creation**: Create tenant schemas for existing companies
2. **Data Migration**: Move existing data to tenant schemas
3. **Reference Updates**: Update foreign keys and references
4. **Testing**: Validate data integrity post-migration

## Testing Strategy

### Unit Tests
- Tenant context management
- Schema-aware database operations
- RLS policy validation

### Integration Tests
- Tenant provisioning workflow
- Cross-tenant data isolation
- Client portal authentication

### End-to-End Tests
- Complete tenant onboarding flow
- Multi-tenant user workflows
- Client portal isolation

## Monitoring & Observability

### Tenant Metrics
- Active tenants count
- Database usage per tenant
- API usage patterns
- Error rates by tenant

### Performance Monitoring
- Query performance per tenant schema
- Database connection pooling
- Tenant-specific slow queries

## Rollback Plan

### Emergency Rollback
1. **Database Level**: Switch back to shared schema
2. **Application Level**: Feature flag to disable multi-tenancy
3. **Data Level**: Restore from pre-migration backups

### Gradual Rollback
1. **Stop New Tenants**: Disable tenant provisioning
2. **Migrate Back**: Move tenant data back to shared schema
3. **Feature Toggle**: Disable multi-tenancy features

## Success Metrics

### Technical Metrics
- 100% tenant data isolation
- <5% performance degradation
- Zero cross-tenant data leaks
- <1 hour tenant provisioning time

### Business Metrics
- Successful tenant onboarding rate >95%
- Client portal satisfaction >4.5/5
- Support tickets per tenant <0.1/month

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Core Infrastructure | 2 weeks | Tenant management DB, app context |
| Database Migration | 2 weeks | Schema migration, data migration |
| Auth & Security | 2 weeks | Updated RLS, tenant-aware auth |
| Application Updates | 2 weeks | Component updates, tenant UI |
| Client Portal | 2 weeks | Isolated client portals |
| Provisioning | 2 weeks | Onboarding, management dashboard |

**Total Timeline**: 12 weeks

## Risk Assessment

### High Risk
- **Data Migration**: Potential data loss during schema migration
- **RLS Policy Updates**: Incorrect policies could cause data leaks
- **Performance Impact**: Schema-based queries may be slower

### Mitigation Strategies
- Comprehensive testing before production migration
- Gradual rollout with feature flags
- Automated rollback procedures
- Performance monitoring and optimization

## Conclusion

This multi-tenancy implementation transforms CastorWorks into a true SaaS platform with complete tenant isolation. The schema-based approach provides strong data isolation while maintaining operational simplicity. The phased implementation ensures minimal disruption to existing users while enabling scalable tenant management.

The plan addresses all aspects of multi-tenancy: database isolation, application-level tenant switching, secure client portals, and comprehensive tenant management. Success will be measured by complete data isolation, smooth tenant onboarding, and satisfied customers with their own dedicated SaaS environment.