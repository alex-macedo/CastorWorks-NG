import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlobalTemplate, GlobalTemplateFormData, TemplateFamily } from '@/types/platform.types';

const QUERY_KEY = ['global-templates'] as const;

export const useGlobalTemplates = (family?: TemplateFamily) => {
  return useQuery({
    queryKey: family ? [...QUERY_KEY, family] : QUERY_KEY,
    queryFn: async () => {
      let query = supabase
        .from('global_templates')
        .select('*')
        .order('name', { ascending: true });
      if (family) query = query.eq('family', family);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GlobalTemplate[];
    },
  });
};

export const useCreateGlobalTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GlobalTemplateFormData) => {
      const { content, ...rest } = payload;
      const { data, error } = await supabase
        .from('global_templates')
        .insert([{ ...rest, content: JSON.parse(content) }])
        .select()
        .single();
      if (error) throw error;
      return data as GlobalTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Template created');
    },
    onError: (err: Error) => toast.error(`Failed to create template: ${err.message}`),
  });
};

export const useUpdateGlobalTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GlobalTemplateFormData> }) => {
      const { content, ...rest } = updates;
      const patch: Record<string, unknown> = { ...rest };
      if (content !== undefined) patch.content = JSON.parse(content);

      const { data, error } = await supabase
        .from('global_templates')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Template updated');
    },
    onError: (err: Error) => toast.error(`Failed to update template: ${err.message}`),
  });
};

export const useDeleteGlobalTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Template deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete template: ${err.message}`),
  });
};

export const usePublishGlobalTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_templates')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Template published');
    },
    onError: (err: Error) => toast.error(`Failed to publish template: ${err.message}`),
  });
};

export const useArchiveGlobalTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_templates')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Template archived');
    },
    onError: (err: Error) => toast.error(`Failed to archive template: ${err.message}`),
  });
};
