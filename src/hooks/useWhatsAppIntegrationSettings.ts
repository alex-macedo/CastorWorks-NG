/**
 * Hook to fetch and update WhatsApp integration_settings.
 * Used for AI Auto-Responder toggle (WA-8.1).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface WhatsAppIntegrationSettings {
  id: string
  integration_type: string
  is_enabled: boolean
  configuration: {
    provider?: string
    ai_auto_responder_enabled?: boolean
    [key: string]: unknown
  } | null
}

const QUERY_KEY = ['integration-settings', 'whatsapp']

async function fetchWhatsAppSettings(): Promise<WhatsAppIntegrationSettings | null> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('id, integration_type, is_enabled, configuration')
    .eq('integration_type', 'whatsapp')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as WhatsAppIntegrationSettings
}

async function updateWhatsAppConfig(
  updates: Partial<Pick<WhatsAppIntegrationSettings, 'is_enabled' | 'configuration'>>
): Promise<WhatsAppIntegrationSettings> {
  const { data, error } = await supabase
    .from('integration_settings')
    .update(updates)
    .eq('integration_type', 'whatsapp')
    .select()
    .single()

  if (error) throw error
  return data as WhatsAppIntegrationSettings
}

export function useWhatsAppIntegrationSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchWhatsAppSettings,
  })

  const updateMutation = useMutation({
    mutationFn: updateWhatsAppConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const setAiAutoResponderEnabled = (enabled: boolean) => {
    const current = query.data
    const config = current?.configuration ?? {}
    const merged = { ...config, ai_auto_responder_enabled: enabled }
    return updateMutation.mutateAsync({ configuration: merged })
  }

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    setAiAutoResponderEnabled,
    isUpdating: updateMutation.isPending,
  }
}
