import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocalization } from '@/contexts/LocalizationContext';

/**
 * Hook to check if the current user has access to a project
 * Returns access status and automatically redirects if access is denied
 */
export const useProjectAccessCheck = (projectId: string | undefined, redirectTo?: string) => {
  const navigate = useNavigate();
  const { t } = useLocalization();

  const { data: hasAccess, isLoading, error } = useQuery({
    queryKey: ['project-access-check', projectId],
    queryFn: async () => {
      if (!projectId) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Call the has_project_access function via RPC
      const { data, error: rpcError } = await supabase.rpc('has_project_access', {
        _user_id: user.id,
        _project_id: projectId,
      });

      if (rpcError) {
        console.error('Error checking project access:', rpcError);
        return false;
      }

      return data === true;
    },
    enabled: !!projectId,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && hasAccess === false && projectId) {
      toast.error('You do not have access to this project');
      navigate(redirectTo || '/architect/projects', { replace: true });
    }
  }, [hasAccess, isLoading, projectId, navigate, redirectTo]);

  return {
    hasAccess: hasAccess === true,
    isLoading,
    error,
  };
};
