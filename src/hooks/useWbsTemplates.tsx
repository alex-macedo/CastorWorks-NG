import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WbsTemplate = {
  id: string;
  template_name: string;
  description: string | null;
  project_type: string | null;
  standard_duration_days?: number | null;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type WbsTemplateItem = {
  id: string;
  template_id: string;
  parent_id: string | null;
  item_type: 'phase' | 'deliverable' | 'work_package' | 'control_account';
  name: string;
  description: string | null;
  standard_duration_days?: number | null;
  sort_order: number;
  wbs_code: string;
  code_path: string;
  standard_cost_code?: string | null; // Cost code string (e.g., 'MO', 'LAB', 'MAT')
  created_at: string;
  updated_at: string;
};

export const useWbsTemplates = () => {
  const queryClient = useQueryClient();

   const { data: templates, isLoading } = useQuery<WbsTemplate[]>({
     queryKey: ['wbs_templates'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('project_wbs_templates')
         .select('*')
         .order('is_default', { ascending: false })
         .order('template_name');

       if (error) throw error;
       return (data ?? []) as WbsTemplate[];
     },
   });

  const useTemplateById = (id: string | undefined) =>
    useQuery<WbsTemplate | null>({
      queryKey: ['wbs_templates', id],
      enabled: !!id,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('project_wbs_templates' as any)
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return (data ?? null) as WbsTemplate | null;
      },
    });

  const useTemplateItems = (templateId: string | undefined) =>
    useQuery<WbsTemplateItem[]>({
      queryKey: ['wbs_template_items', templateId],
      enabled: !!templateId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('project_wbs_template_items' as any)
          .select('*')
          .eq('template_id', templateId)
          .order('code_path');

        if (error) throw error;
        return (data ?? []) as WbsTemplateItem[];
      },
    });

  const upsertTemplateItems = useMutation({
    mutationFn: async (items: WbsTemplateItem[]) => {
      const { data, error } = await supabase
        .from('project_wbs_template_items' as any)
        .upsert(items, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return data as WbsTemplateItem[];
    },
    onSuccess: (_data, items) => {
      const templateId = items?.[0]?.template_id;
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ['wbs_template_items', templateId] });
      }
    },
  });

  const deleteTemplateItemsByIds = useMutation({
    mutationFn: async ({ templateId, ids }: { templateId: string; ids: string[] }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('project_wbs_template_items' as any)
        .delete()
        .in('id', ids);

      if (error) throw error;
      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wbs_template_items', variables.templateId] });
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<WbsTemplate>) => {
      // If setting as default, first unset any existing default templates for the same project_type
      if (template.is_default) {
        await supabase
          .from('project_wbs_templates' as any)
          .update({ is_default: false })
          .eq('project_type', template.project_type ?? null)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('project_wbs_templates' as any)
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data as WbsTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs_templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WbsTemplate> }) => {
      if (updates.is_default) {
        await supabase
          .from('project_wbs_templates' as any)
          .update({ is_default: false })
          .eq('project_type', updates.project_type ?? null)
          .eq('is_default', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('project_wbs_templates' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WbsTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs_templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // 1. Check if there are any projects using items from this template
      const { data: usageCount, error: checkError } = await supabase
        .rpc('check_wbs_template_usage', { _template_id: id });

      if (checkError) {
        // Fallback if RPC doesn't exist yet - check manually via join
        const { count, error: countError } = await supabase
          .from('project_wbs_items')
          .select('id', { count: 'exact', head: true })
          .in('source_template_item_id', 
            supabase.from('project_wbs_template_items').select('id').eq('template_id', id)
          );
          
        if (countError) throw countError;
        if (count && count > 0) {
          throw new Error('NOT_EMPTY');
        }
      } else if (usageCount > 0) {
        throw new Error('NOT_EMPTY');
      }

      // 2. Proceed with deletion
      const { error } = await supabase
        .from('project_wbs_templates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs_templates'] });
    },
  });

  return {
    templates: templates ?? [],
    isLoading,
    useTemplateById,
    useTemplateItems,
    upsertTemplateItems,
    deleteTemplateItemsByIds,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};


