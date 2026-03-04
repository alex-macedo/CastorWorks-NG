import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'

export interface Subscription {
  id: string
  tenant_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  tier_id: string
  billing_period: 'monthly' | 'annual'
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UseSubscriptionResult {
  subscription: Subscription | null
  isActive: boolean
  isCancelling: boolean
  currentTier: string | null
  isLoading: boolean
  error: Error | null
}

export function useSubscription(): UseSubscriptionResult {
  const tenantId = useTenantId()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId, 'subscription'],
    queryFn: async () => {
      if (!tenantId) return null
      const { data: row, error: err } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (err) throw err
      return row as Subscription | null
    },
    enabled: !!tenantId,
  })

  return {
    subscription: data ?? null,
    isActive: data?.status === 'active' || data?.status === 'trialing',
    isCancelling: data?.cancel_at_period_end ?? false,
    currentTier: data?.tier_id ?? null,
    isLoading,
    error: error as Error | null,
  }
}
