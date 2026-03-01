/**
 * useCommunicationLog Hook
 * 
 * Manages communication logs for the Client Portal
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CommunicationLogWithDetails, CommunicationType } from '@/types/clientPortal';
import { useClientPortalAuth } from './useClientPortalAuth';

interface UseCommunicationLogOptions {
  type?: CommunicationType;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export function useCommunicationLog(options: UseCommunicationLogOptions = {}) {
  const { projectId, isAuthenticated, token } = useClientPortalAuth();
  const { page = 1, pageSize = 10 } = options;

  // Fetch communication logs
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['communicationLog', projectId, options],
    queryFn: async () => {
      if (!projectId) return { data: [], total: 0 };

      const { data, error } = await supabase
        .rpc('get_portal_communication', { p_project_id: projectId });

      if (error) throw error;
      
      let filteredLogs = data as unknown as CommunicationLogWithDetails[];

      // Apply filters client-side
      if (options.type) {
        filteredLogs = filteredLogs.filter(l => l.type === options.type);
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredLogs = filteredLogs.filter(l => 
          l.subject.toLowerCase().includes(searchLower) || 
          l.description?.toLowerCase().includes(searchLower)
        );
      }

      if (options.startDate) {
        filteredLogs = filteredLogs.filter(l => l.date_time >= options.startDate!);
      }

      if (options.endDate) {
        filteredLogs = filteredLogs.filter(l => l.date_time <= options.endDate!);
      }

      const total = filteredLogs.length;
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedData = filteredLogs.slice(from, to);

      return {
        data: paginatedData,
        total
      };
    },
    enabled: isAuthenticated && !!projectId,
  });

  return {
    logs: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.total ? Math.ceil(data.total / pageSize) : 0,
    isLoading,
    error,
  };
}
