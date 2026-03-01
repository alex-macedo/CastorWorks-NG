/**
 * Tenant-scoped Supabase client.
 * Use useTenantSupabase() inside TenantProvider; when tenantId is set,
 * set_tenant_context has already been called so RLS sees the correct tenant.
 */
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from '@/contexts/TenantContext'

export type SupabaseClient = ReturnType<typeof supabase>

/**
 * Returns the Supabase client. Must be used within TenantProvider.
 * When tenantId is set, set_tenant_context(tenant_id) has been called for the session,
 * so tenant-scoped queries (e.g. projects) are filtered by RLS.
 */
export function useTenantSupabase(): SupabaseClient {
  useTenant()
  return supabase
}
