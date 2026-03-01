/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExpiredQuoteNotification {
  id: string;
  quote_request_id: string;
  request_number: string;
  supplier_name: string;
  project_name: string;
  response_deadline: string;
  created_at: string;
}

/**
 * Hook to fetch expired quote requests for the current user
 * Returns notifications for quotes that have passed their deadline
 */
export const useExpiredQuoteNotifications = () => {
  const { data: notifications, isLoading, error, refetch } = useQuery<ExpiredQuoteNotification[]>({
    queryKey: ['expired-quote-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_quote_requests_with_manager')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch expired quote notifications: ${error.message}`);
      }

      // Map to notification format
      return (data || []).map((item: any) => ({
        id: item.id,
        quote_request_id: item.id,
        request_number: item.request_number,
        supplier_name: item.supplier_name,
        project_name: item.project_name,
        response_deadline: item.response_deadline,
        created_at: item.created_at,
      }));
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });

  return {
    notifications: notifications || [],
    unreadCount: notifications?.length || 0,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to trigger the check-expired-quotes edge function
 * This can be called manually or on a schedule
 */
export const useCheckExpiredQuotes = () => {
  const checkExpiredQuotes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-expired-quotes', {
        body: {},
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking expired quotes:', error);
      throw error;
    }
  };

  return { checkExpiredQuotes };
};
