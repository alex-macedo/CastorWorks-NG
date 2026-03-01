/**
 * Hook to fetch and update integration_settings
 * Used for WhatsApp AI Auto-Responder and other integration config.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface IntegrationSetting {
  id: string
  integration_type: string
  is_enabled: boolean
  configuration: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

const QUERY_KEY = ['integration_settings'] as const

export function useIntegrationSettings(integrationType: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...QUERY_KEY, integrationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('integration_type', integrationType)
        .single()

      if (error) throw error
      return data as IntegrationSetting
    },
    enabled: !!integrationType,
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      is_enabled,
      configuration,
    }: {
      is_enabled?: boolean
      configuration?: Record<string, unknown>
    }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (typeof is_enabled === 'boolean') updates.is_enabled = is_enabled
      if (configuration !== undefined) updates.configuration = configuration

      const { data, error } = await supabase
        .from('integration_settings')
        .update(updates)
        .eq('integration_type', integrationType)
        .select()
        .single()

      if (error) throw error
      return data as IntegrationSetting
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...QUERY_KEY, integrationType], data)
    },
  })

  const updateConfig = (key: string, value: unknown) => {
    const current = query.data?.configuration ?? {}
    const next = { ...current, [key]: value }
    return updateMutation.mutateAsync({ configuration: next })
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutateAsync,
    updateConfig,
  }
}
