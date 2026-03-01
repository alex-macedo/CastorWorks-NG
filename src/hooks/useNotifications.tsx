import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface MobileNotification {
  id: string
  user_id: string
  project_id: string | null
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  read: boolean
  archived: boolean
  action_url: string | null
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NotificationFilters {
  projectId?: string
  unreadOnly?: boolean
}

export function useNotifications(userId?: string, filters?: NotificationFilters) {
  const queryClient = useQueryClient()
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mobile-notifications', userId, filters],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters?.unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query

      if (error) throw error
      return data as MobileNotification[]
    },
    enabled: !!userId,
  })

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mobile-notifications', userId] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['mobile-notifications', userId] })
      const previous = queryClient.getQueryData(['mobile-notifications', userId, filters])

      queryClient.setQueryData(['mobile-notifications', userId, filters], (old: MobileNotification[] = []) =>
        old.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mobile-notifications', userId, filters], context.previous)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-notifications', userId] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('archived', false)

      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['mobile-notifications', userId] })
      const previous = queryClient.getQueryData(['mobile-notifications', userId, filters])

      queryClient.setQueryData(['mobile-notifications', userId, filters], (old: MobileNotification[] = []) =>
        old.map(n => ({ ...n, read: true }))
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mobile-notifications', userId, filters], context.previous)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-notifications', userId] })
    },
  })

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['mobile-notifications', userId] })
      const previous = queryClient.getQueryData(['mobile-notifications', userId, filters])

      queryClient.setQueryData(['mobile-notifications', userId, filters], (old: MobileNotification[] = []) =>
        old.filter(n => n.id !== notificationId)
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mobile-notifications', userId, filters], context.previous)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-notifications', userId] })
    },
  })

  const effectiveNotifications = isLoading ? [] : notifications

  const unreadCount = effectiveNotifications.filter(n => !n.read).length
  const highPriorityCount = effectiveNotifications.filter(n => n.priority === 'high' && !n.read).length

  return {
    notifications: effectiveNotifications,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingRead: markAsRead.isPending || markAllAsRead.isPending,
    isDeleting: deleteNotification.isPending,
    unreadCount,
    highPriorityCount,
  }
}
