import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type {
  MilestoneDependency,
  MilestoneDependencyType,
} from '@/types/timeline'
import { useRecalculateTimeline } from './useRecalculateTimeline'

interface CreateDependencyInput {
  projectId: string
  predecessorId: string
  successorId: string
  dependencyType?: MilestoneDependencyType
  lagDays?: number
}

interface UpdateDependencyInput {
  id: string
  dependencyType?: MilestoneDependencyType
  lagDays?: number
}

function mapRowToDependency(row: Record<string, unknown>): MilestoneDependency {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    predecessorId: row.predecessor_id as string,
    successorId: row.successor_id as string,
    dependencyType: row.dependency_type as MilestoneDependencyType,
    lagDays: (row.lag_days as number) ?? 0,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Hook for listing all dependency relationships for a project
 */
export function useMilestoneDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: ['milestone-dependencies', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('milestone_dependencies')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDependency)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // Dependencies change less frequently
  })
}

/**
 * Hook for fetching all dependencies for multiple project IDs (useful for global view)
 */
export function useGlobalMilestoneDependencies(projectIds: string[]) {
  return useQuery({
    queryKey: ['global-milestone-dependencies', projectIds],
    queryFn: async () => {
      if (!projectIds.length) return []

      const { data, error } = await supabase
        .from('milestone_dependencies')
        .select('*')
        .in('project_id', projectIds)

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDependency)
    },
    enabled: projectIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for listing dependencies where a specific milestone is the successor
 * (What does this milestone depend on?)
 */
export function useMilestonePredecessors(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['milestone-predecessors', milestoneId],
    queryFn: async () => {
      if (!milestoneId) return []

      const { data, error } = await supabase
        .from('milestone_dependencies')
        .select('*')
        .eq('successor_id', milestoneId)

      if (error) throw error
      return (data as Record<string, unknown>[]).map(mapRowToDependency)
    },
    enabled: !!milestoneId,
  })
}

/**
 * Hook for creating a new milestone dependency
 */
export function useCreateMilestoneDependency() {
  const queryClient = useQueryClient()
  const { mutate: recalculate } = useRecalculateTimeline()

  return useMutation({
    mutationFn: async (input: CreateDependencyInput) => {
      const { data, error } = await supabase
        .from('milestone_dependencies')
        .insert({
          project_id: input.projectId,
          predecessor_id: input.predecessorId,
          successor_id: input.successorId,
          dependency_type: input.dependencyType || 'FS',
          lag_days: input.lagDays ?? 0,
        })
        .select()
        .single()

      if (error) throw error
      return mapRowToDependency(data as Record<string, unknown>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-dependencies', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['milestone-predecessors', data.successorId] })
      
      // Trigger cascade recalculation
      recalculate({ projectId: data.projectId })
      
      toast.success('Dependency created')
    },
    onError: (error: Error) => {
      if (error.message.includes('unique_predecessor_successor')) {
        toast.error('This dependency relationship already exists')
      } else {
        toast.error(`Failed to create dependency: ${error.message}`)
      }
    },
  })
}

/**
 * Hook for updating a milestone dependency
 */
export function useUpdateMilestoneDependency() {
  const queryClient = useQueryClient()
  const { mutate: recalculate } = useRecalculateTimeline()

  return useMutation({
    mutationFn: async (input: UpdateDependencyInput) => {
      const updates: Record<string, unknown> = {}
      if (input.dependencyType !== undefined) updates.dependency_type = input.dependencyType
      if (input.lagDays !== undefined) updates.lag_days = input.lagDays

      const { data, error } = await supabase
        .from('milestone_dependencies')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return mapRowToDependency(data as Record<string, unknown>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-dependencies', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['milestone-predecessors', data.successorId] })
      
      // Trigger cascade recalculation
      recalculate({ projectId: data.projectId })
      
      toast.success('Dependency updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update dependency: ${error.message}`)
    },
  })
}

/**
 * Hook for deleting a milestone dependency
 */
export function useDeleteMilestoneDependency() {
  const queryClient = useQueryClient()
  const { mutate: recalculate } = useRecalculateTimeline()

  return useMutation({
    mutationFn: async ({ id, projectId, successorId }: { id: string; projectId: string; successorId: string }) => {
      const { error } = await supabase
        .from('milestone_dependencies')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, projectId, successorId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestone-dependencies', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['milestone-predecessors', data.successorId] })
      
      // Trigger cascade recalculation
      recalculate({ projectId: data.projectId })
      
      toast.success('Dependency removed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete dependency: ${error.message}`)
    },
  })
}
