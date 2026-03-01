/**
 * Open Finance Hook
 * Phase 2i: Open Finance Integration
 * 
 * Manages bank connections and automatic transaction sync
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface OpenFinanceConnection {
  id: string
  project_id: string
  provider: 'pluggy' | 'belvo'
  provider_item_id: string
  bank_name: string
  bank_code: string | null
  account_type: 'checking' | 'savings' | 'payment'
  account_number_masked: string | null
  status: 'active' | 'expired' | 'error' | 'disconnected'
  last_sync_at: string | null
  last_sync_status: string | null
  next_sync_at: string | null
  error_message: string | null
  consent_expires_at: string | null
  linked_account_id: string | null
  connected_by: string | null
  created_at: string
  updated_at: string
}

export interface OpenFinanceSyncLog {
  id: string
  connection_id: string
  project_id: string
  sync_type: 'automatic' | 'manual' | 'retry'
  status: 'started' | 'completed' | 'partial' | 'failed'
  transactions_fetched: number
  transactions_new: number
  transactions_updated: number
  transactions_reconciled: number
  sync_from_date: string | null
  sync_to_date: string | null
  balance_at_sync: number | null
  balance_currency: string
  error_message: string | null
  error_code: string | null
  duration_ms: number | null
  started_at: string
  completed_at: string | null
}

export interface CreateConnectionInput {
  project_id: string
  provider: 'pluggy' | 'belvo'
  bank_name: string
  bank_code?: string
  account_type?: 'checking' | 'savings' | 'payment'
}

export function useOpenFinanceConnections(projectId?: string) {
  return useQuery({
    queryKey: ['open-finance-connections', projectId],
    queryFn: async () => {
      let query = supabase
        .from('open_finance_connections')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as OpenFinanceConnection[]
    },
    enabled: true,
  })
}

export function useOpenFinanceConnection(connectionId?: string) {
  return useQuery({
    queryKey: ['open-finance-connection', connectionId],
    queryFn: async () => {
      if (!connectionId) return null

      const { data, error } = await supabase
        .from('open_finance_connections')
        .select('*')
        .eq('id', connectionId)
        .single()

      if (error) throw error
      return data as OpenFinanceConnection
    },
    enabled: !!connectionId,
  })
}

export function useOpenFinanceSyncLogs(connectionId?: string) {
  return useQuery({
    queryKey: ['open-finance-sync-logs', connectionId],
    queryFn: async () => {
      if (!connectionId) return []

      const { data, error } = await supabase
        .from('open_finance_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as OpenFinanceSyncLog[]
    },
    enabled: !!connectionId,
  })
}

export function useActiveConnections(projectId?: string) {
  return useQuery({
    queryKey: ['active-open-finance-connections', projectId],
    queryFn: async () => {
      let query = supabase
        .from('open_finance_connections')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as OpenFinanceConnection[]
    },
    enabled: true,
  })
}

export function useCreateOpenFinanceConnection() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateConnectionInput) => {
      // In production, this would call an Edge Function to initiate the OAuth flow
      // For now, we'll create a placeholder record
      const { data, error } = await supabase
        .from('open_finance_connections')
        .insert({
          project_id: input.project_id,
          provider: input.provider,
          provider_item_id: `pending-${Date.now()}`,
          bank_name: input.bank_name,
          bank_code: input.bank_code || null,
          account_type: input.account_type || 'checking',
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data as OpenFinanceConnection
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['open-finance-connections'] })
      queryClient.invalidateQueries({ queryKey: ['active-open-finance-connections'] })
      toast({
        title: 'Bank connection initiated',
        description: 'Please complete the authentication process',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useSyncOpenFinance() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (connectionId: string) => {
      // In production, this would call an Edge Function to trigger sync
      const startTime = Date.now()

      // Create sync log entry
      const { data: syncLog, error: logError } = await supabase
        .from('open_finance_sync_logs')
        .insert({
          connection_id: connectionId,
          project_id: '', // Would be fetched from connection
          sync_type: 'manual',
          status: 'started',
        })
        .select()
        .single()

      if (logError) throw logError

      // Simulate sync (in production, this would be async)
      // Update connection status
      await supabase
        .from('open_finance_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'completed',
          next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', connectionId)

      // Complete sync log
      const { error: completeError } = await supabase
        .from('open_finance_sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          transactions_fetched: 0,
          transactions_new: 0,
          transactions_updated: 0,
          transactions_reconciled: 0,
        })
        .eq('id', syncLog.id)

      if (completeError) throw completeError

      return syncLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-finance-connections'] })
      queryClient.invalidateQueries({ queryKey: ['open-finance-sync-logs'] })
      toast({
        title: 'Sync completed',
        description: 'Bank transactions have been synchronized',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useDisconnectOpenFinance() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase
        .from('open_finance_connections')
        .update({ status: 'disconnected' as const })
        .eq('id', connectionId)
        .select()
        .single()

      if (error) throw error
      return data as OpenFinanceConnection
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-finance-connections'] })
      queryClient.invalidateQueries({ queryKey: ['active-open-finance-connections'] })
      toast({
        title: 'Disconnected',
        description: 'Bank connection has been removed',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useRefreshOpenFinanceConsent() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (connectionId: string) => {
      // In production, this would call an Edge Function to refresh consent
      const { data, error } = await supabase
        .from('open_finance_connections')
        .update({
          consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single()

      if (error) throw error
      return data as OpenFinanceConnection
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-finance-connections'] })
      toast({
        title: 'Consent refreshed',
        description: 'Bank connection consent has been extended',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
