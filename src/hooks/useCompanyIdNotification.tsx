import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Hook that checks if user profile is missing company_id and creates a notification
 * This notification will appear in the Bell icon at the top right.
 * Skips when user has no tenant (e.g. onboarding) to avoid tenant_id NOT NULL violation.
 */
export function useCompanyIdNotification() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { data: profile, isLoading: profileLoading } = useUserProfile();

  // Check if notification already exists for this issue
  const { data: existingNotification } = useQuery({
    queryKey: ['company-id-notification-check', profile?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for existing unread system notifications about company_id
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, data')
        .eq('user_id', user.id)
        .eq('type', 'system')
        .eq('read', false)
        .eq('archived', false)
        .ilike('title', '%Company ID%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking for existing notification:', error);
        return null;
      }

      // Check if data contains the issue flag
      if (data && data.data && typeof data.data === 'object' && 'issue' in data.data) {
        return data.data.issue === 'missing_company_id' ? data : null;
      }

      // If title matches, consider it a match even without the data flag
      return data;
    },
    enabled: !profileLoading && !profile?.company_id,
    staleTime: 30000, // Check every 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    // Don't create notification if:
    // 1. Profile is still loading
    // 2. User has company_id
    // 3. Notification already exists
    // 4. User has no tenant yet (e.g. onboarding) — notifications.tenant_id is NOT NULL
    if (profileLoading || profile?.company_id || existingNotification || !tenantId) {
      return;
    }

    // Create notification for missing company_id
    const createNotification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useCompanyIdNotification] No user found');
        return;
      }

      console.log('[useCompanyIdNotification] Creating notification for user:', user.id);

      try {
        const { data: notificationData, error } = await supabase.rpc('create_notification', {
          p_user_id: user.id,
          p_type: 'system',
          p_title: 'Company ID Required',
          p_message: 'Your profile is missing a company ID. Some features may be limited. Please contact your administrator.',
          p_priority: 'high',
          p_action_url: '/settings',
          p_data: {
            issue: 'missing_company_id',
            requiresAction: true,
          },
          p_tenant_id: tenantId ?? undefined,
        });

        if (error) {
          console.error('[useCompanyIdNotification] Failed to create notification:', error);
        } else {
          console.log('[useCompanyIdNotification] Notification created successfully:', notificationData);
          // Invalidate the notification check query to refresh
          queryClient.invalidateQueries({ queryKey: ['company-id-notification-check'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      } catch (error) {
        console.error('[useCompanyIdNotification] Error creating notification:', error);
      }
    };

    createNotification();
  }, [profileLoading, profile?.company_id, existingNotification, tenantId, queryClient]);
}

