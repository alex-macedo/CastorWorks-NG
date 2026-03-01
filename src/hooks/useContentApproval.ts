import { supabase } from '@/integrations/supabase/client';
import { useMutationWithToast } from '@/hooks/core/useMutationWithToast';
import { useLocalization } from '@/contexts/LocalizationContext';

export const useContentApproval = () => {
  const { t } = useLocalization();

  const submitForApproval = useMutationWithToast({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('content_hub')
        .update({ status: 'pending_approval' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    successMessage: t('contentHub.toast.submitted'),
    errorMessage: t('contentHub.toast.submitError'),
    invalidateQueries: [['content-hub']],
  });

  const approveContent = useMutationWithToast({
    mutationFn: async (id: string) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error(t('contentHub.errors.userNotFound'));
      }

      const { data, error } = await supabase
        .from('content_hub')
        .update({
          status: 'published',
          approved_by: userId,
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    successMessage: t('contentHub.toast.approved'),
    errorMessage: t('contentHub.toast.approveError'),
    invalidateQueries: [['content-hub']],
  });

  const archiveContent = useMutationWithToast({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('content_hub')
        .update({ status: 'archived' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    successMessage: t('contentHub.toast.archived'),
    errorMessage: t('contentHub.toast.archiveError'),
    invalidateQueries: [['content-hub']],
  });

  const restoreContent = useMutationWithToast({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('content_hub')
        .update({ status: 'draft', approved_by: null, published_at: null })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    successMessage: t('contentHub.toast.restored'),
    errorMessage: t('contentHub.toast.restoreError'),
    invalidateQueries: [['content-hub']],
  });

  return {
    submitForApproval,
    approveContent,
    archiveContent,
    restoreContent,
  };
};
