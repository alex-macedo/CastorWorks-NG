import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocalization } from '@/contexts/LocalizationContext'
import { supabase } from '@/integrations/supabase/client'
import type {
  ClientDefinition,
  ClientDefinitionStatus,
  ClientDefinitionType,
  FollowUpEntry,
} from '@/types/timeline'

interface CreateDefinitionInput {
  projectId: string
  milestoneId?: string | null
  definitionItem: string
  definitionType?: ClientDefinitionType
  description?: string
  requiredByDate: string
  status?: ClientDefinitionStatus
  assignedClientContact?: string
  impactScore?: number
  notes?: string
}

interface UpdateDefinitionInput {
  definitionId: string
  definitionItem?: string
  definitionType?: ClientDefinitionType
  description?: string | null
  requiredByDate?: string
  status?: ClientDefinitionStatus
  assignedClientContact?: string | null
  impactScore?: number
  completionDate?: string | null
  notes?: string | null
  milestoneId?: string | null
}

interface AddFollowUpInput {
  definitionId: string
  note: string
}

function mapRowToDefinition(row: Record<string, unknown>): ClientDefinition {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    milestoneId: (row.milestone_id as string) ?? null,
    definitionItem: row.definition_item as string,
    definitionType: (row.definition_type as ClientDefinitionType) ?? 'other',
    description: (row.description as string) ?? null,
    requiredByDate: new Date(row.required_by_date as string),
    status: row.status as ClientDefinitionStatus,
    assignedClientContact: (row.assigned_client_contact as string) ?? null,
    impactScore: (row.impact_score as number) ?? 0,
    completionDate: row.completion_date ? new Date(row.completion_date as string) : null,
    notes: (row.notes as string) ?? null,
    followUpHistory: (row.follow_up_history as FollowUpEntry[]) ?? [],
    createdBy: (row.created_by as string) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Hook for listing all client definitions for a project
 */
export function useClientDefinitions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['client-definitions', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('client_definitions')
        .select('*')
        .eq('project_id', projectId)
        .order('required_by_date', { ascending: true })

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDefinition)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook for listing overdue client definitions across all accessible projects
 */
export function useOverdueDefinitions() {
  return useQuery({
    queryKey: ['client-definitions-overdue'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('client_definitions')
        .select('*')
        .in('status', ['pending', 'in_progress', 'overdue', 'blocking'])
        .lt('required_by_date', today)
        .order('required_by_date', { ascending: true })

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDefinition)
    },
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook for counting definitions by status for a project (badges).
 * Includes date-based overdue: items past required_by_date and not completed.
 */
export function useDefinitionStatusCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['client-definitions-counts', projectId],
    queryFn: async () => {
      if (!projectId) return { total: 0, pending: 0, overdue: 0, blocking: 0, completed: 0 }

      const { data, error } = await supabase
        .from('client_definitions')
        .select('status, required_by_date')
        .eq('project_id', projectId)

      if (error) throw error

      const rows = data as Record<string, unknown>[]
      const today = new Date().toISOString().split('T')[0]
      const counts = { total: rows.length, pending: 0, overdue: 0, blocking: 0, completed: 0 }

      for (const row of rows) {
        const status = row.status as string
        const requiredBy = (row.required_by_date as string) ?? ''
        if (status === 'pending' || status === 'in_progress') counts.pending++
        else if (status === 'blocking') counts.blocking++
        else if (status === 'completed') counts.completed++
        if (status !== 'completed' && requiredBy && requiredBy < today) counts.overdue++
      }

      return counts
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook for creating a new client definition
 */
export function useCreateDefinition() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()

  return useMutation({
    mutationFn: async (input: CreateDefinitionInput) => {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      const { data, error } = await supabase
        .from('client_definitions')
        .insert({
          project_id: input.projectId,
          milestone_id: input.milestoneId || null,
          definition_item: input.definitionItem,
          definition_type: input.definitionType ?? 'other',
          description: input.description || null,
          required_by_date: input.requiredByDate,
          status: input.status || 'pending',
          assigned_client_contact: input.assignedClientContact || null,
          impact_score: input.impactScore ?? 0,
          notes: input.notes || null,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return mapRowToDefinition(data as Record<string, unknown>)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-definitions', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-counts', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-overdue'] })
      toast.success(t('timeline.clientDefinitions.createSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.clientDefinitions.createError', { message: error.message }))
    },
  })
}

/**
 * Hook for updating a client definition
 */
export function useUpdateDefinition() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()

  return useMutation({
    mutationFn: async (input: UpdateDefinitionInput) => {
      const updates: Record<string, unknown> = {}
      if (input.definitionItem !== undefined) updates.definition_item = input.definitionItem
      if (input.definitionType !== undefined) updates.definition_type = input.definitionType
      if (input.description !== undefined) updates.description = input.description
      if (input.requiredByDate !== undefined) updates.required_by_date = input.requiredByDate
      if (input.status !== undefined) updates.status = input.status
      if (input.assignedClientContact !== undefined) updates.assigned_client_contact = input.assignedClientContact
      if (input.impactScore !== undefined) updates.impact_score = input.impactScore
      if (input.completionDate !== undefined) updates.completion_date = input.completionDate
      if (input.notes !== undefined) updates.notes = input.notes
      if (input.milestoneId !== undefined) updates.milestone_id = input.milestoneId

      // Auto-set completion date when status changes to completed
      if (input.status === 'completed' && !input.completionDate) {
        updates.completion_date = new Date().toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('client_definitions')
        .update(updates)
        .eq('id', input.definitionId)
        .select()
        .single()

      if (error) throw error
      return mapRowToDefinition(data as Record<string, unknown>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-definitions', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-counts', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-overdue'] })
      toast.success(t('timeline.clientDefinitions.updateSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.clientDefinitions.updateError', { message: error.message }))
    },
  })
}

/**
 * Hook for adding a follow-up entry to a client definition
 */
export function useAddFollowUp() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()

  return useMutation({
    mutationFn: async (input: AddFollowUpInput) => {
      // Fetch current follow_up_history
      const { data: current, error: fetchError } = await supabase
        .from('client_definitions')
        .select('follow_up_history, project_id')
        .eq('id', input.definitionId)
        .single()

      if (fetchError) throw fetchError

      const row = current as Record<string, unknown>
      const history = (row.follow_up_history as FollowUpEntry[]) ?? []

      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      const newEntry: FollowUpEntry = {
        date: new Date().toISOString(),
        note: input.note,
        userId: userId || undefined,
      }

      const { data, error } = await supabase
        .from('client_definitions')
        .update({ follow_up_history: [...history, newEntry] })
        .eq('id', input.definitionId)
        .select()
        .single()

      if (error) throw error
      return mapRowToDefinition(data as Record<string, unknown>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-definitions', data.projectId] })
      toast.success(t('timeline.clientDefinitions.followUpSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.clientDefinitions.followUpError', { message: error.message }))
    },
  })
}

/**
 * Hook for deleting a client definition
 */
export function useDeleteDefinition() {
  const queryClient = useQueryClient()
  const { t } = useLocalization()

  return useMutation({
    mutationFn: async ({ definitionId, projectId }: { definitionId: string; projectId: string }) => {
      const { error } = await supabase
        .from('client_definitions')
        .delete()
        .eq('id', definitionId)

      if (error) throw error
      return { definitionId, projectId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-definitions', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-counts', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['client-definitions-overdue'] })
      toast.success(t('timeline.clientDefinitions.deleteSuccess'))
    },
    onError: (error: Error) => {
      toast.error(t('timeline.clientDefinitions.deleteError', { message: error.message }))
    },
  })
}
