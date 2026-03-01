import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'

const MS_PER_DAY = 86400000

export interface TenantTrialData {
  trial_ends_at: string | null
  subscription_tier_id: string | null
  daysRemaining: number | null
  isOnTrial: boolean
}

export function useTenantTrial(): TenantTrialData & { isLoading: boolean } {
  const tenantId = useTenantId()
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', tenantId, 'trial'],
    queryFn: async (): Promise<{ trial_ends_at: string | null; subscription_tier_id: string | null }> => {
      if (!tenantId) return { trial_ends_at: null, subscription_tier_id: null }
      const { data: row, error } = await supabase
        .from('tenants')
        .select('trial_ends_at, subscription_tier_id')
        .eq('id', tenantId)
        .single()
      if (error) throw error
      return {
        trial_ends_at: row?.trial_ends_at ?? null,
        subscription_tier_id: row?.subscription_tier_id ?? null,
      }
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  })

  const trial_ends_at = data?.trial_ends_at ?? null
  const subscription_tier_id = data?.subscription_tier_id ?? null

  const { daysRemaining, isOnTrial } = useMemo(() => {
    if (!trial_ends_at || !subscription_tier_id || now === 0) {
      return { daysRemaining: null, isOnTrial: false }
    }
    const end = new Date(trial_ends_at).getTime()
    const days = Math.max(0, Math.ceil((end - now) / MS_PER_DAY))
    return {
      daysRemaining: days,
      isOnTrial: subscription_tier_id === 'trial' && end > now,
    }
  }, [trial_ends_at, subscription_tier_id, now])

  return {
    trial_ends_at,
    subscription_tier_id,
    daysRemaining,
    isOnTrial,
    isLoading,
  }
}
