import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocalization } from '@/contexts/LocalizationContext'
import { supabase } from '@/integrations/supabase/client'
import type {
  DelayImpactType,
  DelayResponsibleParty,
  DelayRootCause,
  MilestoneDelay,
} from '@/types/timeline'
import { useRecalculateTimeline } from './useRecalculateTimeline'

interface CreateDelayInput {
  milestoneId: string
  projectId: string
  delayDays: number
  rootCause: DelayRootCause
  responsibleParty: DelayResponsibleParty
  impactType: DelayImpactType
  description: string
  correctiveActions?: string
  subcontractorTrade?: string
}

interface UpdateDelayInput {
  delayId: string
  delayDays?: number
  rootCause?: DelayRootCause
  responsibleParty?: DelayResponsibleParty
  impactType?: DelayImpactType
  description?: string
  correctiveActions?: string | null
  subcontractorTrade?: string | null
}

function mapRowToDelay(row: Record<string, unknown>): MilestoneDelay {
  return {
    id: row.id as string,
    milestoneId: row.milestone_id as string,
    projectId: row.project_id as string,
    delayDays: row.delay_days as number,
    rootCause: row.root_cause as DelayRootCause,
    responsibleParty: row.responsible_party as DelayResponsibleParty,
    impactType: row.impact_type as DelayImpactType,
    description: row.description as string,
    correctiveActions: (row.corrective_actions as string) ?? null,
    subcontractorTrade: (row.subcontractor_trade as string) ?? null,
    reportedBy: (row.reported_by as string) ?? null,
    reportedAt: new Date(row.reported_at as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Hook for listing delays by milestone
 */
export function useDelays(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['milestone-delays', milestoneId],
    queryFn: async () => {
      if (!milestoneId) return []

      const { data, error } = await supabase
        .from('milestone_delays')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('reported_at', { ascending: false })

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDelay)
    },
    enabled: !!milestoneId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook for listing all delays for a project
 */
export function useProjectDelays(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-delays', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('milestone_delays')
        .select('*')
        .eq('project_id', projectId)
        .order('reported_at', { ascending: false })

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDelay)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook for creating a new delay record
 */
export function useCreateDelay() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()
  const { mutate: recalculate } = useRecalculateTimeline()

  return useMutation({
    mutationFn: async (input: CreateDelayInput) => {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      const { data, error } = await supabase
        .from('milestone_delays')
        .insert({
          milestone_id: input.milestoneId,
          project_id: input.projectId,
          delay_days: input.delayDays,
          root_cause: input.rootCause,
          responsible_party: input.responsibleParty,
          impact_type: input.impactType,
          description: input.description,
          corrective_actions: input.correctiveActions || null,
          subcontractor_trade: input.subcontractorTrade || null,
          reported_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return mapRowToDelay(data as Record<string, unknown>)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-delays', variables.milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['project-delays', variables.projectId] })
      
      // Trigger cascade recalculation
      recalculate({ projectId: variables.projectId })
      
      toast.success(t('timeline.delays.createSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.delays.createError', { message: error.message }))
    },
  })
}

/**
 * Hook for updating an existing delay record
 */
export function useUpdateDelay() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()
  const { mutate: recalculate } = useRecalculateTimeline()

  return useMutation({
    mutationFn: async (input: UpdateDelayInput) => {
      const updates: Record<string, unknown> = {}
      if (input.delayDays !== undefined) updates.delay_days = input.delayDays
      if (input.rootCause !== undefined) updates.root_cause = input.rootCause
      if (input.responsibleParty !== undefined) updates.responsible_party = input.responsibleParty
      if (input.impactType !== undefined) updates.impact_type = input.impactType
      if (input.description !== undefined) updates.description = input.description
      if (input.correctiveActions !== undefined) updates.corrective_actions = input.correctiveActions
      if (input.subcontractorTrade !== undefined)
        updates.subcontractor_trade = input.subcontractorTrade

      const { data, error } = await supabase
        .from('milestone_delays')
        .update(updates)
        .eq('id', input.delayId)
        .select()
        .single()

      if (error) throw error
      return mapRowToDelay(data as Record<string, unknown>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-delays', data.milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['project-delays', data.projectId] })
      
      // Trigger cascade recalculation
      recalculate({ projectId: data.projectId })
      
      toast.success(t('timeline.delays.updateSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.delays.updateError', { message: error.message }))
    },
  })
}

/**
 * Hook for counting delays per milestone (for badges)
 */
export function useDelayCountByMilestone(milestoneIds: string[]) {
  return useQuery({
    queryKey: ['milestone-delay-counts', milestoneIds],
    queryFn: async () => {
      if (!milestoneIds.length) return {} as Record<string, number>

      const { data, error } = await supabase
        .from('milestone_delays')
        .select('milestone_id')
        .in('milestone_id', milestoneIds)

      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data as Record<string, unknown>[]) {
        const mid = row.milestone_id as string
        counts[mid] = (counts[mid] || 0) + 1
      }
      return counts
    },
    enabled: milestoneIds.length > 0,
    staleTime: 1000 * 60 * 2,
  })
}
