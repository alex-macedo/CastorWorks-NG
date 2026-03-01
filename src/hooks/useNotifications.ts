import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Archive, Trash2, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { logger } from "@/lib/logger";

export type NotificationType = 
  | 'financial_alert' 
  | 'project_update' 
  | 'schedule_change' 
  | 'material_delivery' 
  | 'system' 
  | 'budget_overrun' 
  | 'milestone_delay'
  | 'task_due'
  | 'task_due_soon'
  | 'payment_due'
  | 'payment_due_soon'
  | 'chat_message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  archived: boolean;
  createdAt: Date;
  actionUrl?: string;
  data?: Record<string, any>;
}

const NOTIFICATION_TYPES = {
  financial_alert: { icon: '💰', color: 'text-red-600 bg-red-50', label: 'Financial Alert' },
  project_update: { icon: '📋', color: 'text-blue-600 bg-blue-50', label: 'Project Update' },
  schedule_change: { icon: '📅', color: 'text-yellow-600 bg-yellow-50', label: 'Schedule Change' },
  material_delivery: { icon: '📦', color: 'text-green-600 bg-green-50', label: 'Material Delivery' },
  system: { icon: '🔧', color: 'text-blue-600 bg-blue-50', label: 'System' },
  budget_overrun: { icon: '💸', color: 'text-red-700 bg-red-100', label: 'Budget Overrun' },
  milestone_delay: { icon: '⏰', color: 'text-orange-600 bg-orange-50', label: 'Milestone Delay' },
  task_due: { icon: '📋', color: 'text-red-600 bg-red-50', label: 'Task Due' },
  task_due_soon: { icon: '📋', color: 'text-yellow-600 bg-yellow-50', label: 'Task Due Soon' },
  payment_due: { icon: '💰', color: 'text-red-600 bg-red-50', label: 'Payment Due' },
  payment_due_soon: { icon: '💰', color: 'text-yellow-600 bg-yellow-50', label: 'Payment Due Soon' },
  chat_message: { icon: '💬', color: 'text-blue-600 bg-blue-50', label: 'New Message' },
};

export function useNotifications() {
  const queryClient = useQueryClient();

  // Fetch notifications from database
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent notifications

      if (error) {
        logger.error('Error fetching notifications:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        logger.info('No notifications found for user:', { userId: user.id });
      }

      return (data || []).map(notification => ({
        id: notification.id,
        type: notification.type as NotificationType,
        title: notification.title,
        message: notification.message,
        priority: notification.priority as 'low' | 'medium' | 'high',
        read: notification.read,
        archived: notification.archived,
        createdAt: new Date(notification.created_at),
        actionUrl: notification.action_url,
        data: notification.data,
      }));
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark notification as archived
  const markAsArchivedMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Bulk mark as read
  const bulkMarkAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', notificationIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const markAsArchived = useCallback((id: string) => {
    markAsArchivedMutation.mutate(id);
  }, [markAsArchivedMutation]);

  const deleteNotification = useCallback((id: string) => {
    deleteNotificationMutation.mutate(id);
  }, [deleteNotificationMutation]);

  const markAllAsRead = useCallback(() => {
    const unreadIds = notifications
      .filter(n => !n.read && !n.archived)
      .map(n => n.id);
    if (unreadIds.length > 0) {
      bulkMarkAsReadMutation.mutate(unreadIds);
    }
  }, [notifications, bulkMarkAsReadMutation]);

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const archivedCount = notifications.filter(n => n.archived).length;
  const recentNotifications = notifications
    .filter(n => !n.archived)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return {
    notifications,
    recentNotifications,
    unreadCount,
    archivedCount,
    isLoading,
    markAsRead,
    markAsArchived,
    markAllAsRead,
    deleteNotification,
  };
}