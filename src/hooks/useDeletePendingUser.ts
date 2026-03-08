import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { PENDING_ONBOARDING_QUERY_KEY } from '@/hooks/usePendingOnboardingUsers'

interface DeletePendingUserPayload {
  userId: string
}

export function useDeletePendingUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }: DeletePendingUserPayload) => {
      const { data, error } = await supabase.functions.invoke('delete-pending-user', {
        body: { userId },
      })
      if (error) throw error
      if (!data?.success) throw new Error('Deletion failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_ONBOARDING_QUERY_KEY })
    },
  })
}
