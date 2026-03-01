import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook to trigger the project timeline cascade recalculation
 * This calls a Supabase Edge Function that recalculates milestone adjusted_target_dates
 * based on delays and dependencies.
 */
export function useRecalculateTimeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, force }: { projectId: string; force?: boolean }) => {
      console.log(`[Recalculate] Triggering cascade for project: ${projectId}${force ? ' (forced)' : ''}`)
      
      const { data, error } = await supabase.functions.invoke('recalculate-milestone-dates', {
        body: { projectId, force },
      })

      if (error) {
        console.error('[Recalculate] Edge function error:', error)
        throw error
      }

      return data
    },
    onSuccess: (data, variables) => {
      const { projectId } = variables
      
      // Invalidate milestone-related queries to show updated dates
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions', projectId] })
      queryClient.invalidateQueries({ queryKey: ['milestone-dependencies', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] })
      
      if (data?.skipped) {
        console.log('[Recalculate] Recalculation skipped by server')
      } else {
        toast.success('Timeline recalculated successfully')
      }
    },
    onError: (error: Error) => {
      console.error('[Recalculate] Error:', error)
      toast.error(`Recalculation failed: ${error.message}`)
    },
  })
}
