import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { AppRole } from '@/hooks/useUserRoles'
import { PENDING_ONBOARDING_QUERY_KEY } from '@/hooks/usePendingOnboardingUsers'

interface ConfirmOnboardingPayload {
  userId: string
  defaultRole?: AppRole
}

export function useConfirmOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, defaultRole }: ConfirmOnboardingPayload) => {
      const { data, error } = await supabase.functions.invoke('confirm-user-onboarding', {
        body: { userId, defaultRole: defaultRole ?? 'viewer' },
      })
      if (error) throw error
      if (!data?.success) throw new Error('Onboarding confirmation failed')
      return data
    },
    onSuccess: () => {
      // Refresh pending list and the main users-with-roles list
      queryClient.invalidateQueries({ queryKey: PENDING_ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] })
    },
  })
}
