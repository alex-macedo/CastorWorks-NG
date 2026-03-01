import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PhaseTemplate {
  id: string;
  template_name: string;
  description: string | null;
  is_default: boolean;
  is_system: boolean;
  phases: Array<{
    sequence: number;
    phaseName: string;
    defaultDurationDays: number;
    defaultBudgetPercentage: number;
  }>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  image_url: string | null;
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const usePhaseTemplates = () => {
   const queryClient = useQueryClient();

     const { data: templates, isLoading, error } = useQuery<PhaseTemplate[]>({
       queryKey: ['phase_templates'],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('phase_templates')
           .select('*')
           .order('is_default', { ascending: false })
           .order('template_name');
         
         if (error) {
           throw error;
         }
         return data as unknown as PhaseTemplate[];
       },
     });

  const createTemplate = useMutation({
    mutationFn: async (template: any) => {
      // If setting as default, first unset any existing default templates
      if (template.is_default) {
        const { error: updateError } = await supabase
          .from('phase_templates' as any)
          .update({ is_default: false })
          .eq('is_default', true);

        if (updateError) throw updateError;
      }

      const { data, error } = await supabase
        .from('phase_templates' as any)
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase_templates'] });
      toast.success('Phase template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // If setting this template as default, first unset any existing default templates
      if (updates.is_default) {
        const { error: updateError } = await supabase
          .from('phase_templates' as any)
          .update({ is_default: false })
          .eq('is_default', true)
          .neq('id', id);

        if (updateError) throw updateError;
      }

      const { data, error } = await supabase
        .from('phase_templates' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase_templates'] });
      toast.success('Phase template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('phase_templates' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase_templates'] });
      toast.success('Phase template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    }
  });

  return {
    templates: templates ?? [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
