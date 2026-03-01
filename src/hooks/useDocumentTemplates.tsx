import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type DocumentTemplate = Database['public']['Tables']['document_templates']['Row'];
type DocumentTemplateInsert = Database['public']['Tables']['document_templates']['Insert'];
type DocumentTemplateUpdate = Database['public']['Tables']['document_templates']['Update'];

export const useDocumentTemplates = (templateType?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['document-templates', templateType],
    queryFn: async () => {
      let query = supabase
        .from('document_templates')
        .select('*')
        .order('template_name');
      
      if (templateType) {
        query = query.eq('template_type', templateType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  const createTemplate = useMutation({
    mutationFn: async (template: DocumentTemplateInsert) => {
      const { data, error } = await supabase
        .from('document_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
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
    mutationFn: async ({ id, updates }: { id: string; updates: DocumentTemplateUpdate }) => {
      const { data, error } = await supabase
        .from('document_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
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
        .from('document_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
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
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
