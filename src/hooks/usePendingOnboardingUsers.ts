import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface PendingOnboardingUser {
  id: string
  email: string
  created_at: string
  display_name: string | null
}

export const PENDING_ONBOARDING_QUERY_KEY = ['pending-onboarding-users'] as const

export function usePendingOnboardingUsers() {
  return useQuery<PendingOnboardingUser[]>({
    queryKey: PENDING_ONBOARDING_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-pending-onboarding-users')
      if (error) throw error
      return (data?.users ?? []) as PendingOnboardingUser[]
    },
    staleTime: 30_000,
  })
}
