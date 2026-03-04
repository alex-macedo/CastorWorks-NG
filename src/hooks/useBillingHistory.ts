import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'

export interface BillingHistoryItem {
  id: string
  number: string
  date: number
  amount_due: number
  amount_paid: number
  status: string
  currency: string
  attempt_count: number
  paid_at: number | null
}

export interface UseBillingHistoryResult {
  items: BillingHistoryItem[] | undefined
  isLoading: boolean
  error: Error | null
}

export function useBillingHistory(): UseBillingHistoryResult {
  const tenantId = useTenantId()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId, 'billing-history'],
    queryFn: async () => {
      if (!tenantId) return { items: [] }
      const { data: result, error: fnError } = await supabase.functions.invoke('list-billing-history', {
        body: { tenant_id: tenantId },
      })
      if (fnError) throw fnError
      const items = (result as { items?: BillingHistoryItem[] })?.items ?? []
      return { items }
    },
    enabled: !!tenantId,
  })

  return {
    items: data?.items,
    isLoading,
    error: error as Error | null,
  }
}
