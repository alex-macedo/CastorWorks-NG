import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBudgetVersions } from './useBudgetVersions';
import { useBudgetLines } from './useBudgetLines';
import type { Database } from '@/integrations/supabase/types';

type BudgetTemplate = Database['public']['Tables']['budget_templates']['Row'];
type BudgetTemplateItem = Database['public']['Tables']['budget_template_items']['Row'];
type BudgetTemplatePhase = Database['public']['Tables']['budget_template_phases']['Row'];
type BudgetTemplateCostCode = Database['public']['Tables']['budget_template_cost_codes']['Row'];

export interface ApplyCostControlTemplateOptions {
  templateId: string;
  projectId: string;
  versionName: string;
  effectiveDate: string;
  description?: string;
}

export interface ApplyCostControlTemplateResult {
  versionId: string;
  phasesCreated: number;
  linesCreated: number;
  totalAmount: number;
}

/**
 * Hook for applying Cost Control budget templates to create budget versions and lines
 */
export function useCostControlTemplateApplication() {
  const queryClient = useQueryClient();

  // Get template with all related data
  const getTemplateData = async (templateId: string) => {
    const { data: template, error: templateError } = await supabase
      .from('budget_templates')
      .select('*')
      .eq('id', templateId)
      .eq('budget_type', 'cost_control')
      .single();

    if (templateError || !template) {
      throw new Error('Cost Control template not found');
    }

    const [
      { data: items = [] },
      { data: phases = [] },
      { data: costCodes = [] },
    ] = await Promise.all([
      supabase
        .from('budget_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('budget_template_phases')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('budget_template_cost_codes')
        .select('*')
        .eq('template_id', templateId),
    ]);

    return {
      template: template as BudgetTemplate,
      items: items as BudgetTemplateItem[],
      phases: phases as BudgetTemplatePhase[],
      costCodes: costCodes as BudgetTemplateCostCode[],
    };
  };

  // Apply Cost Control template
  const applyTemplateMutation = useMutation({
    mutationFn: async (
      options: ApplyCostControlTemplateOptions
    ): Promise<ApplyCostControlTemplateResult> => {
      const { templateId, projectId, versionName, effectiveDate, description } = options;

      // Get template data
      const { template, items, phases: templatePhases, costCodes: templateCostCodes } =
        await getTemplateData(templateId);

      // Step 1: Get or create project phases from template phases
      const projectPhasesMap = new Map<string, string>(); // template phase name -> project phase id
      let phasesCreated = 0;

      for (const templatePhase of templatePhases) {
        // Check if phase exists in project
        const { data: existingPhase } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', projectId)
          .eq('phase_name', templatePhase.phase_name)
          .single();

        if (existingPhase) {
          projectPhasesMap.set(templatePhase.phase_name, existingPhase.id);
        } else {
          // Create phase
          const { data: newPhase, error: phaseError } = await supabase
            .from('project_phases')
            .insert({
              project_id: projectId,
              phase_name: templatePhase.phase_name,
              sort_order: templatePhase.sort_order,
              status: 'pending',
              progress_percentage: 0,
            })
            .select()
            .single();

          if (phaseError) throw phaseError;
          if (newPhase) {
            projectPhasesMap.set(templatePhase.phase_name, newPhase.id);
            phasesCreated++;
          }
        }
      }

      // Step 2: Map template cost codes to actual cost codes
      const costCodeMap = new Map<string, string>(); // template code -> cost_code id

      for (const templateCostCode of templateCostCodes) {
        const { data: costCode } = await supabase
          .from('cost_codes')
          .select('id')
          .eq('code', templateCostCode.code)
          .eq('is_active', true)
          .single();

        if (costCode) {
          costCodeMap.set(templateCostCode.code, costCode.id);
        }
      }

      // Step 3: Create budget version
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: version, error: versionError } = await supabase
        .from('project_budget_versions')
        .insert({
          project_id: projectId,
          name: versionName,
          effective_date: effectiveDate,
          description: description,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (versionError || !version) throw versionError || new Error('Failed to create version');

      // Step 4: Create budget lines
      const budgetLines: Array<{
        version_id: string;
        phase_id: string;
        cost_code_id: string;
        amount: number;
      }> = [];

      // If template has items with phase_id, use those
      const itemsWithPhases = items.filter((item) => item.phase_id);
      if (itemsWithPhases.length > 0) {
        // Map items to budget lines
        for (const item of itemsWithPhases) {
          // Find the phase name from the phase_id (need to look it up)
          const { data: phase } = await supabase
            .from('project_phases')
            .select('phase_name')
            .eq('id', item.phase_id)
            .single();

          if (phase && projectPhasesMap.has(phase.phase_name)) {
            const projectPhaseId = projectPhasesMap.get(phase.phase_name)!;
            // Try to infer cost code from category
            const costCodeId = costCodeMap.values().next().value; // Use first available cost code as fallback
            if (costCodeId) {
              budgetLines.push({
                version_id: version.id,
                phase_id: projectPhaseId,
                cost_code_id: costCodeId,
                amount: Number(item.budgeted_amount || 0),
              });
            }
          }
        }
      } else {
        // Distribute template items across phases and cost codes
        // Strategy: Distribute evenly or by template item category
        const totalAmount = items.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0);
        const phaseCount = templatePhases.length;
        const costCodeCount = templateCostCodes.length || 1;

        if (phaseCount > 0 && costCodeCount > 0) {
          // Distribute evenly across all phase × cost code combinations
          const amountPerLine = totalAmount / (phaseCount * costCodeCount);

          for (const templatePhase of templatePhases) {
            const projectPhaseId = projectPhasesMap.get(templatePhase.phase_name);
            if (!projectPhaseId) continue;

            for (const templateCostCode of templateCostCodes) {
              const costCodeId = costCodeMap.get(templateCostCode.code);
              if (!costCodeId) continue;

              budgetLines.push({
                version_id: version.id,
                phase_id: projectPhaseId,
                cost_code_id: costCodeId,
                amount: amountPerLine,
              });
            }
          }
        }
      }

      // Step 5: Bulk insert budget lines
      let linesCreated = 0;
      if (budgetLines.length > 0) {
        const { error: linesError } = await supabase
          .from('project_budget_lines')
          .insert(budgetLines);

        if (linesError) throw linesError;
        linesCreated = budgetLines.length;
      }

      const totalAmount = budgetLines.reduce((sum, line) => sum + line.amount, 0);

      return {
        versionId: version.id,
        phasesCreated,
        linesCreated,
        totalAmount,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgetVersions', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['budgetLines'] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', variables.projectId] });
      toast.success(
        `Template applied: ${result.linesCreated} budget lines created, ${result.phasesCreated} phases created`
      );
    },
    onError: (error) => {
      toast.error(`Failed to apply template: ${error.message}`);
    },
  });

  // Get template preview
  const getTemplatePreview = async (templateId: string) => {
    const { template, items, phases, costCodes } = await getTemplateData(templateId);

    return {
      templateName: template.name,
      description: template.description,
      budgetType: template.budget_type,
      phaseCount: phases.length,
      costCodeCount: costCodes.length,
      itemCount: items.length,
      totalBudget: template.total_budget_amount ? Number(template.total_budget_amount) : 0,
      phases: phases.map((p) => p.phase_name),
      costCodes: costCodes.map((cc) => `${cc.code} - ${cc.name}`),
    };
  };

  return {
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
    applyError: applyTemplateMutation.error,
    applySuccess: applyTemplateMutation.isSuccess,
    getTemplatePreview,
  };
}

