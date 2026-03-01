import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export interface ImportTemplateInput {
  templateName: string;
  description?: string;
  companyId: string;
  projectId: string;
  budgetType: 'simple' | 'cost_control';
  isPublic: boolean;
}

export const useImportTemplateFromProject = () => {
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (input: ImportTemplateInput) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const companyId = input.companyId || profile?.company_id;
      if (!companyId) throw new Error('Company ID is required');

      const functionName = input.budgetType === 'simple'
        ? 'create_simple_budget_template'
        : 'create_cost_control_budget_template';

      const { data, error } = await supabase.rpc(functionName, {
        p_template_name: input.templateName,
        p_company_id: companyId,
        p_user_id: user.id,
        p_project_id: input.projectId,
        p_is_public: input.isPublic,
        p_description: input.description,
      });

      if (error) {
        console.error('Import template error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Function called:', functionName);
        console.error('Parameters:', {
          p_template_name: input.templateName,
          p_company_id: companyId,
          p_user_id: user.id,
          p_project_id: input.projectId,
          p_is_public: input.isPublic,
          p_description: input.description,
        });
        throw new Error(error.message || error.details || 'Failed to import template from project');
      }

      console.log('Template imported successfully, template_id:', data);
      return data; // Returns template_id (UUID)
    },
    onSuccess: async (templateId) => {
      console.log('Import successful, template_id:', templateId);
      console.log('Invalidating queries for company_id:', profile?.company_id);
      
      // Invalidate ALL budget_templates queries (this will match any query key starting with 'budget_templates')
      await queryClient.invalidateQueries({ 
        queryKey: ['budget_templates'],
        exact: false // Match all queries starting with 'budget_templates'
      });
      
      // Explicitly refetch all budget_templates queries
      await queryClient.refetchQueries({ 
        queryKey: ['budget_templates'],
        exact: false // Match all queries starting with 'budget_templates'
      });
      
      console.log('Query invalidation and refetch completed');
    },
  });

  return {
    importTemplate: importMutation.mutate,
    isImporting: importMutation.isPending,
    importError: importMutation.error,
  };
};
