import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';

/**
 * Shared hook for fetching project data in client portal pages.
 * Ensures consistent query key and error handling across all pages.
 */
export function useClientPortalProject() {
  const { projectId, isLoading: isLoadingAuth } = useClientPortalAuth();

  const { data: project, isLoading, error, isFetching } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn('[useClientPortalProject] No projectId provided');
        return null;
      }

      console.log('[useClientPortalProject] Fetching project data', { projectId });

      const { data, error: queryError } = await supabase
        .from('projects')
        .select('name, total_duration, start_date, end_date, client_id, clients(id, email, phone, name)')
        .eq('id', projectId)
        .single();

      if (queryError) {
        console.error('[useClientPortalProject] Error fetching project', {
          error: queryError,
          projectId,
          errorCode: queryError.code,
          errorMessage: queryError.message,
        });
        throw queryError;
      }

      if (!data) {
        console.warn('[useClientPortalProject] Project query returned no data', { projectId });
        return null;
      }

      console.log('[useClientPortalProject] Project data loaded successfully', {
        projectName: data?.name,
        projectId,
      });

      return data;
    },
    enabled: !!projectId && !isLoadingAuth,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    project,
    isLoading: isLoading || isLoadingAuth,
    isFetching,
    error,
    projectId,
    projectName: project?.name,
  };
}
