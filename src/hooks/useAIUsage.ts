import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'

export interface AIUsageFeatureBreakdown {
  feature: string
  total: number
}

export interface ConsumeAIActionsInput {
  feature: string
  actions: number
  modelUsed: string
  tokensIn?: number
  tokensOut?: number
  costBrl?: number
  cached?: boolean
}

export interface ConsumeAIActionsResult {
  allowed: boolean
  degraded: boolean
  remaining: number
}

interface AIUsageQueryData {
  usedThisMonth: number
  effectiveBudget: number | null
  isEnterprise: boolean
  featureBreakdown: AIUsageFeatureBreakdown[]
  resetDate: string
}

export interface UseAIUsageResult extends AIUsageQueryData {
  isLoading: boolean
  error: Error | null
  consumeAIActions: (input: ConsumeAIActionsInput) => Promise<ConsumeAIActionsResult>
}

export function useAIUsage(): UseAIUsageResult {
  const tenantId = useTenantId()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId, 'ai-usage'],
    enabled: !!tenantId,
    queryFn: async (): Promise<AIUsageQueryData> => {
      if (!tenantId) {
        return {
          usedThisMonth: 0,
          effectiveBudget: 0,
          isEnterprise: false,
          featureBreakdown: [],
          resetDate: getNextMonthStartDate(),
        }
      }

      const startOfMonthIso = getMonthStartIso()
      const { data: logRows, error: logError } = await supabase
        .from('ai_usage_log')
        .select('tenant_id, feature, actions_consumed, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonthIso)

      if (logError) throw logError

      let tenant: { ai_credits_purchased?: number; subscription_tier_id?: string } | null = null
      let tier: { ai_monthly_credits?: number | null } | null = null

      try {
        const tenantQuery = supabase
          .from('tenants')
          .select('ai_credits_purchased, subscription_tier_id')
          .eq('id', tenantId) as unknown as {
          maybeSingle?: () => Promise<{ data: typeof tenant; error: unknown }>
        }

        if (tenantQuery.maybeSingle) {
          const { data: tenantData, error: tenantError } = await tenantQuery.maybeSingle()
          if (tenantError) throw tenantError
          tenant = tenantData
        }
      } catch {
        // Keep hook resilient for partial mocks and degraded API responses.
      }

      try {
        const tierQuery = supabase
          .from('subscription_tiers')
          .select('ai_monthly_credits')
          .eq('id', tenant?.subscription_tier_id ?? '') as unknown as {
          maybeSingle?: () => Promise<{ data: typeof tier; error: unknown }>
        }

        if (tierQuery.maybeSingle) {
          const { data: tierData, error: tierError } = await tierQuery.maybeSingle()
          if (tierError) throw tierError
          tier = tierData
        }
      } catch {
        // Keep hook resilient for partial mocks and degraded API responses.
      }

      const rows = logRows ?? []
      const usedThisMonth = rows.reduce((sum, row) => sum + (row.actions_consumed ?? 0), 0)

      const isEnterprise = tier?.ai_monthly_credits == null || tenant?.subscription_tier_id === 'enterprise'
      const purchased = tenant?.ai_credits_purchased ?? 0
      const effectiveBudget =
        isEnterprise
          ? null
          : (tier?.ai_monthly_credits ?? 0) + purchased

      const byFeature = new Map<string, number>()
      rows.forEach((row) => {
        const feature = row.feature ?? 'unknown'
        byFeature.set(feature, (byFeature.get(feature) ?? 0) + (row.actions_consumed ?? 0))
      })

      const featureBreakdown = Array.from(byFeature.entries())
        .map(([feature, total]) => ({ feature, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      return {
        usedThisMonth,
        effectiveBudget,
        isEnterprise,
        featureBreakdown,
        resetDate: getNextMonthStartDate(),
      }
    },
  })

  const consumeAIActions = useCallback(
    async (input: ConsumeAIActionsInput): Promise<ConsumeAIActionsResult> => {
      if (!tenantId) {
        return { allowed: true, degraded: false, remaining: 0 }
      }

      const { data, error } = await supabase.rpc('consume_ai_actions', {
        p_tenant_id: tenantId,
        p_feature: input.feature,
        p_actions: input.actions,
        p_user_id: null,
        p_model_used: input.modelUsed,
        p_tokens_in: input.tokensIn ?? 0,
        p_tokens_out: input.tokensOut ?? 0,
        p_cost_brl: input.costBrl ?? 0,
        p_cached: input.cached ?? false,
      })

      if (error) throw error

      const result = (Array.isArray(data) ? data[0] : data) ?? {}
      return {
        allowed: result.allowed ?? true,
        degraded: result.degraded ?? false,
        remaining: result.remaining ?? 0,
      }
    },
    [tenantId]
  )

  return {
    usedThisMonth: data?.usedThisMonth ?? 0,
    effectiveBudget: data?.effectiveBudget === undefined ? 0 : data.effectiveBudget,
    isEnterprise: data?.isEnterprise ?? false,
    featureBreakdown: data?.featureBreakdown ?? [],
    resetDate: data?.resetDate ?? getNextMonthStartDate(),
    isLoading,
    error: error as Error | null,
    consumeAIActions,
  }
}

function getMonthStartIso(): string {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return monthStart.toISOString()
}

function getNextMonthStartDate(): string {
  const now = new Date()
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return nextMonthStart.toISOString().split('T')[0]
}
