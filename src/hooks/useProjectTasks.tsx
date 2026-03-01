import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type ArchitectTask = Database['public']['Tables']['architect_tasks']['Row']
type ArchitectTaskInsert = Database['public']['Tables']['architect_tasks']['Insert']
type ArchitectTaskUpdate = Database['public']['Tables']['architect_tasks']['Update']

export const useProjectTasks = (projectId: string | undefined) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['project_tasks', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('architect_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        // Handle case where table doesn't exist or no permission
        if (error.code === 'PGRST205' || error.code === '42P01') {
          return []
        }
        throw error
      }
      return data as ArchitectTask[]
    },
    enabled: !!projectId,
  })

  const createTask = useMutation({
    mutationFn: async (task: ArchitectTaskInsert) => {
      const { data, error } = await supabase
        .from('architect_tasks')
        .insert(task)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks', projectId] })
      toast({
        title: 'Task created',
        description: 'The task has been created successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create task: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: ArchitectTaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('architect_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks', projectId] })
      toast({
        title: 'Task updated',
        description: 'The task has been updated successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update task: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('architect_tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks', projectId] })
      toast({
        title: 'Task deleted',
        description: 'The task has been deleted successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete task: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const toggleTaskStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'
      const { data, error } = await supabase
        .from('architect_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_tasks', projectId] })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update task: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  }
}
