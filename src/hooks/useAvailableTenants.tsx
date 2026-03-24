import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRoles } from '@/hooks/useUserRoles'

export interface AvailableTenant {
  id: string
  name: string
  slug: string
}

/**
 * Fetches tenants that the current user can assign new users to.
 * - super_admin/platform_owner: all active tenants
 * - admin: only tenants they belong to
 */
export function useAvailableTenants() {
  const { user } = useAuth()
  const { roles } = useUserRoles()

  const isPlatformAdmin =
    roles.includes('super_admin') ||
    roles.includes('platform_owner') ||
    roles.includes('global_admin')

  return useQuery({
    queryKey: ['available-tenants', user?.id, isPlatformAdmin],
    queryFn: async () => {
      if (!user?.id) return []

      if (isPlatformAdmin) {
        // Platform admins can see all tenants
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .in('status', ['active', 'trial'])
          .order('name', { ascending: true })

        if (error) {
          console.error('[useAvailableTenants] Error fetching all tenants:', error)
          return []
        }

        return (data ?? []) as AvailableTenant[]
      } else {
        // Regular admins can only see their own tenants
        const { data, error } = await supabase
          .from('tenant_users')
          .select('tenant_id, tenants(id, name, slug)')
          .eq('user_id', user.id)

        if (error) {
          console.error('[useAvailableTenants] Error fetching user tenants:', error)
          return []
        }

        const tenants: AvailableTenant[] = (data ?? [])
          .map((row) => {
            const t = row.tenants as { id: string; name: string; slug: string } | null
            if (!t?.id) return null
            return { id: t.id, name: t.name, slug: t.slug }
          })
          .filter(Boolean) as AvailableTenant[]

        return tenants.sort((a, b) => a.name.localeCompare(b.name))
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
