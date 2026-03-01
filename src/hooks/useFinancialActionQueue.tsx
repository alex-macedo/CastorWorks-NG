import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type {
  FinancialAIAction,
  FinancialAIActionInsert,
  AIActionStatus,
} from '@/types/finance'

const QUEUE_TABLE = 'financial_ai_action_queue'
const LOG_TABLE = 'financial_ai_action_logs'
const QUERY_KEY = 'financial_ai_action_queue'

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

export const useFinancialActionQueue = (projectId?: string) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: actions, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: async () => {
      let query = supabase
        .from(QUEUE_TABLE)
        .select('*')
        .order('priority', { ascending: false })
        .order('proposed_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return (data ?? []) as FinancialAIAction[]
    },
  })

  const pendingActions = (actions ?? []).filter(
    a => a.status === 'proposed'
  )

  const recentActions = (actions ?? []).filter(
    a => a.status !== 'proposed' && a.status !== 'expired'
  )

  const approveAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from(QUEUE_TABLE)
        .update({
          status: 'approved' as AIActionStatus,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', actionId)
        .eq('status', 'proposed')
        .select()
        .single()

      if (error) throw error

      await supabase.from(LOG_TABLE).insert({
        action_id: actionId,
        event_type: 'approved',
        actor_id: user.id,
        actor_role: 'user',
        details: { approved_at: new Date().toISOString() },
      })

      return data as FinancialAIAction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Action approved', description: 'The AI action has been approved.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const rejectAction = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from(QUEUE_TABLE)
        .update({ status: 'rejected' as AIActionStatus })
        .eq('id', actionId)
        .eq('status', 'proposed')
        .select()
        .single()

      if (error) throw error

      await supabase.from(LOG_TABLE).insert({
        action_id: actionId,
        event_type: 'rejected',
        actor_id: user.id,
        actor_role: 'user',
        details: { reason: reason ?? 'User rejected', rejected_at: new Date().toISOString() },
      })

      return data as FinancialAIAction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Action rejected', description: 'The AI action has been rejected.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createAction = useMutation({
    mutationFn: async (action: FinancialAIActionInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from(QUEUE_TABLE)
        .insert({ ...action, proposed_by: user.id })
        .select()
        .single()

      if (error) throw error
      return data as FinancialAIAction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  return {
    actions: actions ?? [],
    pendingActions,
    recentActions,
    isLoading,
    error,
    approveAction,
    rejectAction,
    createAction,
  }
}
