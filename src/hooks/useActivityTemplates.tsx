import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ActivityTemplateRow = Database['public']['Tables']['activity_templates']['Row'];

type ActivityTemplate = ActivityTemplateRow & {
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ActivityTemplateInsert = Database['public']['Tables']['activity_templates']['Insert'];
type ActivityTemplateUpdate = Database['public']['Tables']['activity_templates']['Update'];

export const useActivityTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<ActivityTemplate[]>({
    queryKey: ['activity-templates'],
    queryFn: async () => {
       const { data, error } = await supabase
         .from('activity_templates')
         .select('*')
         .order('is_default', { ascending: false })
         .order('template_name');
       
       if (error) throw error;
       return data as ActivityTemplate[];
     }
  });

  const createTemplate = useMutation({
    mutationFn: async (template: ActivityTemplateInsert) => {
      // If setting as default, first unset any existing default templates
      if (template.is_default) {
        await supabase
          .from('activity_templates')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('activity_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ActivityTemplateUpdate }) => {
      // If setting this template as default, first unset any existing default templates
      if (updates.is_default) {
        await supabase
          .from('activity_templates')
          .update({ is_default: false })
          .eq('is_default', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('activity_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activity_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
