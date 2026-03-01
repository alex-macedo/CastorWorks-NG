import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type BudgetTemplateItem = Database['public']['Tables']['budget_template_items']['Row'];

export interface ApplyTemplateOptions {
  templateId: string;
  projectId: string;
  merge?: boolean; // If true, merge with existing items; if false, replace
}

export interface ApplyTemplateResult {
  itemsApplied: number;
  totalAmount: number;
}

export function useTemplateApplication() {
  const queryClient = useQueryClient();

  // Get template with all items
  const getTemplateData = async (templateId: string) => {
    const { data: template, error: templateError } = await supabase
      .from('budget_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    const { data: items, error: itemsError } = await supabase
      .from('budget_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    return { template, items: items || [] };
  };

  // Apply template to project
  const applyTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      projectId,
      merge = false,
    }: ApplyTemplateOptions): Promise<ApplyTemplateResult> => {
      const { template, items } = await getTemplateData(templateId);

      // Delete existing items if not merging
      if (!merge) {
        const { error: deleteError } = await supabase
          .from('project_budget_items')
          .delete()
          .eq('project_id', projectId);

        if (deleteError) throw deleteError;
      }

      // Insert template items as project budget items
      if (items.length === 0) {
        return { itemsApplied: 0, totalAmount: 0 };
      }

      const itemsToInsert = items.map((item, index) => ({
        project_id: projectId,
        category: item.category,
        description: item.description,
        budgeted_amount: item.budgeted_amount,
        phase_id: item.phase_id,
      }));

      const { error: insertError } = await supabase
        .from('project_budget_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      const totalAmount = items.reduce(
        (sum, item) => sum + Number(item.budgeted_amount || 0),
        0
      );

      return {
        itemsApplied: items.length,
        totalAmount,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate project-related queries
      queryClient.invalidateQueries({ queryKey: ['project_budget_items', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['budget_analysis'] });
    },
  });

  // Get preview of template items (what will be applied)
  const getTemplatePreview = async (templateId: string) => {
    const { template, items } = await getTemplateData(templateId);

    return {
      templateName: template.name,
      description: template.description,
      budgetType: template.budget_type,
      items: items.map((item) => ({
        id: item.id,
        category: item.category,
        description: item.description,
        budgetedAmount: Number(item.budgeted_amount),
        displayOrder: item.sort_order,
      })),
      totalBudget: items.reduce(
        (sum, item) => sum + Number(item.budgeted_amount || 0),
        0
      ),
      itemCount: items.length,
    };
  };

  // Apply template to new project (pre-populate during creation)
  const prepareTemplateForNewProject = async (
    templateId: string
  ): Promise<Array<Omit<BudgetItem, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'actual_amount'>>> => {
    const { items } = await getTemplateData(templateId);

    return items.map((item) => ({
      category: item.category,
      description: item.description || undefined,
      budgeted_amount: Number(item.budgeted_amount),
      phase_id: item.phase_id || undefined,
    }));
  };

  return {
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
    applyError: applyTemplateMutation.error,
    applySuccess: applyTemplateMutation.isSuccess,
    getTemplatePreview,
    prepareTemplateForNewProject,
  };
}
