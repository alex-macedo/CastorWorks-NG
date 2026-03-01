import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMutationWithToast } from '@/hooks/core/useMutationWithToast';
import { useLocalization } from '@/contexts/LocalizationContext';
import type {
  ContentHubFilters,
  ContentHubInsert,
  ContentHubRow,
  ContentHubUpdate,
} from '@/types/contentHub';

const buildContentHubQuery = (filters: ContentHubFilters) => {
  let query = supabase
    .from('content_hub')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.visibility?.length) {
    query = query.overlaps('visibility', filters.visibility);
  }

  if (filters.search) {
    const searchValue = `%${filters.search}%`;
    query = query.or(`title.ilike.${searchValue},content.ilike.${searchValue}`);
  }

  if (!filters.includeArchived) {
    query = query.neq('status', 'archived');
  }

  return query;
};

export const useContentHub = (filters: ContentHubFilters = {}) => {
  const { t } = useLocalization();

  const contentQuery = useQuery({
    queryKey: ['content-hub', filters],
    queryFn: async () => {
      const { data, error } = await buildContentHubQuery(filters);
      if (error) throw error;
      return (data ?? []) as ContentHubRow[];
    },
  });

  const createContent = useMutationWithToast({
    mutationFn: async (payload: ContentHubInsert) => {
      const { data, error } = await supabase
        .from('content_hub')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data as ContentHubRow;
    },
    successMessage: t('contentHub.toast.created'),
    errorMessage: t('contentHub.toast.createError'),
    invalidateQueries: [['content-hub']],
  });

  const updateContent = useMutationWithToast({
    mutationFn: async ({ id, updates }: { id: string; updates: ContentHubUpdate }) => {
      const { data, error } = await supabase
        .from('content_hub')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ContentHubRow;
    },
    successMessage: t('contentHub.toast.updated'),
    errorMessage: t('contentHub.toast.updateError'),
    invalidateQueries: [['content-hub']],
  });

  const deleteContent = useMutationWithToast({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_hub').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    successMessage: t('contentHub.toast.deleted'),
    errorMessage: t('contentHub.toast.deleteError'),
    invalidateQueries: [['content-hub']],
  });

  return {
    ...contentQuery,
    createContent,
    updateContent,
    deleteContent,
  };
};

export const useContentHubItem = (id?: string) =>
  useQuery({
    queryKey: ['content-hub-item', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('content_hub')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as ContentHubRow | null;
    },
    enabled: Boolean(id),
  });

export const useContentHubBySlug = (slug?: string) =>
  useQuery({
    queryKey: ['content-hub-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('content_hub')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as ContentHubRow | null;
    },
    enabled: Boolean(slug),
  });
