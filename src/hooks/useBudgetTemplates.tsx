import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { Database } from '@/integrations/supabase/types';

type BudgetTemplate = Database['public']['Tables']['budget_templates']['Row'] & {
  has_materials?: boolean | null;
};
type BudgetTemplateItem = Database['public']['Tables']['budget_template_items']['Row'];
type BudgetTemplatePhase = Database['public']['Tables']['budget_template_phases']['Row'];
type BudgetTemplateCostCode = Database['public']['Tables']['budget_template_cost_codes']['Row'];

export interface BudgetTemplateWithItems extends BudgetTemplate {
  items?: BudgetTemplateItem[];
  phases?: BudgetTemplatePhase[];
  cost_codes?: BudgetTemplateCostCode[];
}

export interface CreateBudgetTemplateInput {
  name: string;
  description?: string;
  budget_type: 'simple' | 'cost_control';
  is_public?: boolean;
  is_default?: boolean;
  is_system?: boolean;
  has_materials?: boolean;
  items: Array<{
    category: string;
    description?: string;
    budgeted_amount: number;
    sort_order?: number;
  }>;
  phases?: Array<{
    phase_name: string;
    sort_order?: number;
  }>;
  cost_codes?: Array<{
    code: string;
    name: string;
  }>;
}

export function useBudgetTemplates(companyId?: string) {
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  // List all templates for the company
  // Use a stable query key that doesn't change when companyId is undefined
  const queryKey = ['budget_templates', companyId ?? 'public'];
  
  const { data: templates, isLoading, error: listError } = useQuery({
    queryKey,
    queryFn: async () => {
       // RLS policy allows: company_id matches user's company_id OR is_public = TRUE
       // So we can query all templates and RLS will automatically filter appropriately
       const { data, error } = await supabase
         .from('budget_templates')
         .select('*')
         .order('is_default', { ascending: false })
         .order('created_at', { ascending: false });

       if (error) {
         console.error('useBudgetTemplates: Query error:', error);
         throw error;
       }
       
       return (data || []) as BudgetTemplate[];
     },
    enabled: true, // Always enabled - RLS handles filtering
  });

  // Get single template with all related data
  const getTemplate = async (templateId: string): Promise<BudgetTemplateWithItems | null> => {
    try {
      const { data: template, error: templateError } = await supabase
        .from('budget_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) {
        console.error('getTemplate: Error fetching template:', templateError);
        throw new Error(`Failed to fetch template: ${templateError.message}`);
      }

      if (!template) {
        console.warn('getTemplate: Template not found:', templateId);
        return null;
      }

      // PHASE 1 FIX: Always check modern budget_template_items table FIRST (reads/writes consistency)
      // This fixes the bug where updates written to modern table don't show up on reload from legacy tables
      const modernItemsPromise = supabase
        .from('budget_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      // Keep legacy fetch as fallback ONLY if modern table has no data
      let legacyItemsPromise;
      
      if (template.budget_type === 'simple') {
        if (template.has_materials) {
          legacyItemsPromise = supabase
            .from('simplebudget_materials_template')
            .select('*')
            .order('sort_order', { ascending: true });
        } else {
          legacyItemsPromise = supabase
            .from('simplebudget_labor_template')
            .select('*')
            .order('id', { ascending: true });
        }
      } else {
        legacyItemsPromise = Promise.resolve({ data: [], error: null });
      }

      const [{ data: modernItems, error: modernItemsError }, { data: legacyItems, error: legacyItemsError }] = await Promise.all([
        modernItemsPromise,
        legacyItemsPromise,
      ]);

      if (modernItemsError) {
        console.error('getTemplate: Error fetching modern items:', modernItemsError);
      }
      if (legacyItemsError) {
        console.error('getTemplate: Error fetching legacy items:', legacyItemsError);
      }

      // PHASE 1 FIX: Use modern items if available, fallback to legacy only if modern is empty
      // This ensures updates (which write to modern table) are visible on reload
      let items = modernItems;
      let itemsSource = 'budget_template_items';
      
      if (!items || items.length === 0) {
        // Fallback to legacy items only if modern table is empty
        if (legacyItems && legacyItems.length > 0) {
          items = legacyItems;
          itemsSource = template.has_materials ? 'simplebudget_materials_template' : 'simplebudget_labor_template';
        } else {
          items = [];
        }
      }

      // Transform simple budget items to match the expected format
      let transformedItems = items || [];
      
      if (template.budget_type === 'simple' && items && itemsSource !== 'budget_template_items') {
        // Only transform if coming from legacy tables
        // Modern table items are already in the correct format
        if (template.has_materials) {
          // Transform materials template items to budget_template_items format
          transformedItems = items.map((item: any) => ({
            id: item.id,
            template_id: templateId,
            category: item.group_name,
            description: item.description,
            budgeted_amount: item.total || 0,
            sort_order: item.sort_order || 0,
            created_at: item.created_at,
            updated_at: item.updated_at,
            // Include original fields for reference
            _source: 'simplebudget_materials_template',
            _original: item,
          }));
        } else {
          // Transform labor template items to budget_template_items format
          transformedItems = items.map((item: any) => ({
            id: item.id,
            template_id: templateId,
            category: item.group,
            description: item.description,
            budgeted_amount: item.total_value || 0,
            sort_order: item.sort_order || 0,
            created_at: item.created_at,
            updated_at: item.updated_at,
            // Include original fields for reference
            _source: 'simplebudget_labor_template',
            _original: item,
          }));
        }
      }

      const result = {
        ...(template as BudgetTemplate),
        items: transformedItems,
      };
      
      return result;
    } catch (error) {
      console.error('getTemplate: Unexpected error:', error);
      throw error;
    }
  };

  // Create new template
  const createTemplateMutation = useMutation({
    mutationFn: async (input: CreateBudgetTemplateInput) => {
      if (!companyId) throw new Error('Company ID is required');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Calculate total budget
      const totalBudget = input.items.reduce((sum, item) => sum + item.budgeted_amount, 0);

      // If setting as default, first unset any existing default templates for the same company and budget_type
      if (input.is_default) {
        await supabase
          .from('budget_templates')
          .update({ is_default: false })
          .eq('company_id', companyId)
          .eq('budget_type', input.budget_type)
          .eq('is_default', true);
      }

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('budget_templates')
        .insert({
          name: input.name,
          description: input.description,
          company_id: companyId,
          created_by: user.id,
          budget_type: input.budget_type,
          is_public: input.is_public || false,
          is_default: input.is_default || false,
          is_system: input.is_system || false,
          has_materials: input.has_materials ?? true,
          total_budget_amount: totalBudget,
          has_phases: (input.phases?.length || 0) > 0,
          has_cost_codes: (input.cost_codes?.length || 0) > 0,
        })
        .select()
        .single();

      if (templateError || !template) throw templateError || new Error('Failed to create template');

      // Create items
      if (input.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('budget_template_items')
          .insert(
            input.items.map((item, index) => ({
              template_id: template.id,
              category: item.category,
              description: item.description,
              budgeted_amount: item.budgeted_amount,
              sort_order: item.sort_order ?? index,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Create phases if provided
      if (input.phases && input.phases.length > 0) {
        const { error: phasesError } = await supabase
          .from('budget_template_phases')
          .insert(
            input.phases.map((phase, index) => ({
              template_id: template.id,
              phase_name: phase.phase_name,
              sort_order: phase.sort_order ?? index,
            }))
          );

        if (phasesError) throw phasesError;
      }

      // Create cost codes if provided
      if (input.cost_codes && input.cost_codes.length > 0) {
        const { error: costCodesError } = await supabase
          .from('budget_template_cost_codes')
          .insert(
            input.cost_codes.map((cc) => ({
              template_id: template.id,
              code: cc.code,
              name: cc.name,
            }))
          );

        if (costCodesError) throw costCodesError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', companyId ?? 'public'] });
    },
  });

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: Partial<CreateBudgetTemplateInput>;
    }) => {
      const totalBudget = data.items
        ? data.items.reduce((sum, item) => sum + item.budgeted_amount, 0)
        : undefined;

      // If setting this template as default, first unset any existing default templates for the same company and budget_type
      if (data.is_default) {
        // We need the company_id and budget_type to properly unset other defaults
        // If they aren't provided in 'data', we should ideally fetch them or assume they stay the same
        // For simplicity, we'll try to use what's in 'data'
        if (data.budget_type) {
          // If we have budget_type, we can use it. But we still need company_id.
          // In this system, company_id is usually passed to the hook.
          await supabase
            .from('budget_templates')
            .update({ is_default: false })
            .eq('company_id', companyId)
            .eq('budget_type', data.budget_type)
            .eq('is_default', true)
            .neq('id', templateId);
        }
      }

      const { error } = await supabase
        .from('budget_templates')
        .update({
          name: data.name,
          description: data.description,
          budget_type: data.budget_type,
          is_public: data.is_public,
          is_default: data.is_default,
          has_materials: data.has_materials,
          total_budget_amount: totalBudget,
          has_phases: (data.phases?.length || 0) > 0,
          has_cost_codes: (data.cost_codes?.length || 0) > 0,
        })
        .eq('id', templateId);

      if (error) throw error;

      // Update items if provided
      if (data.items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('budget_template_items')
          .delete()
          .eq('template_id', templateId);

        if (deleteError) throw deleteError;

        // Insert new items
        if (data.items.length > 0) {
          const { error: insertError } = await supabase
            .from('budget_template_items')
            .insert(
              data.items.map((item, index) => ({
                template_id: templateId,
                category: item.category,
                description: item.description,
                budgeted_amount: item.budgeted_amount,
                sort_order: item.sort_order ?? index,
              }))
            );

          if (insertError) throw insertError;
        }
      }

      return { templateId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', companyId ?? 'public'] });
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase
        .from('budget_templates')
        .delete()
        .eq('id', templateId)
        .select();

      if (error) {
        console.error('deleteTemplateMutation: Error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('deleteTemplateMutation: No rows deleted. Check RLS policies.');
        throw new Error(t('templates:deleteError', 'You do not have permission to delete this template.'));
      }

      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', companyId ?? 'public'] });
    },
  });

  // Duplicate template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (sourceTemplateId: string) => {
      const sourceTemplate = await getTemplate(sourceTemplateId);
      if (!sourceTemplate) throw new Error('Template not found');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // Create new template with duplicated name
      const newName = `${sourceTemplate.name} (Copy)`;

      const { data: newTemplate, error: templateError } = await supabase
        .from('budget_templates')
        .insert({
          name: newName,
          description: sourceTemplate.description,
          company_id: sourceTemplate.company_id,
          created_by: user.id,
          budget_type: sourceTemplate.budget_type,
          is_public: false, // New templates start private
          total_budget_amount: sourceTemplate.total_budget_amount,
          has_phases: sourceTemplate.has_phases,
          has_cost_codes: sourceTemplate.has_cost_codes,
        })
        .select()
        .single();

      if (templateError || !newTemplate) throw templateError || new Error('Failed to duplicate template');

      // Copy items
      if (sourceTemplate.items && sourceTemplate.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('budget_template_items')
          .insert(
            sourceTemplate.items.map((item) => ({
              template_id: newTemplate.id,
              category: item.category,
              description: item.description,
              budgeted_amount: item.budgeted_amount,
              sort_order: item.sort_order,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Copy phases
      if (sourceTemplate.phases && sourceTemplate.phases.length > 0) {
        const { error: phasesError } = await supabase
          .from('budget_template_phases')
          .insert(
            sourceTemplate.phases.map((phase) => ({
              template_id: newTemplate.id,
              phase_name: phase.phase_name,
              sort_order: phase.sort_order,
            }))
          );

        if (phasesError) throw phasesError;
      }

      // Copy cost codes
      if (sourceTemplate.cost_codes && sourceTemplate.cost_codes.length > 0) {
        const { error: costCodesError } = await supabase
          .from('budget_template_cost_codes')
          .insert(
            sourceTemplate.cost_codes.map((cc) => ({
              template_id: newTemplate.id,
              code: cc.code,
              name: cc.name,
            }))
          );

        if (costCodesError) throw costCodesError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', companyId ?? 'public'] });
    },
  });

  return {
    templates: templates ?? [],
    isLoading,
    listError,
    getTemplate,
    createTemplate: createTemplateMutation,
    updateTemplate: updateTemplateMutation,
    deleteTemplate: deleteTemplateMutation,
    duplicateTemplate: duplicateTemplateMutation,
    // Keep these for backward compatibility if needed, but they are now available via the objects above
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isDuplicating: duplicateTemplateMutation.isPending,
  };
}
