import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from '@/contexts/TenantContext'

const STALE_TIME_MS = 2 * 60 * 1000 // 2 min

export function useLicensedModules(): {
  modules: string[]
  hasModule: (id: string) => boolean
  isLoading: boolean
} {
  const { tenantId } = useTenant()

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-licensed-modules', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data: result, error } = await supabase.rpc('get_tenant_licensed_modules', {
        p_tenant_id: tenantId,
      })
      if (error) throw error
      return (result ?? []) as string[]
    },
    enabled: !!tenantId,
    staleTime: STALE_TIME_MS,
  })

  const modules = data ?? []
  const hasModule = useCallback(
    (id: string) => modules.includes(id),
    [modules]
  )

  return { modules, hasModule, isLoading }
}
