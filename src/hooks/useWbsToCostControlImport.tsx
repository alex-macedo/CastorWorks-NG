import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { toast } from 'sonner';

export type WbsImportOptions = {
  projectId: string;
  wbsTemplateId?: string; // Optional: if not provided, use project's existing WBS
  budgetVersionName: string;
  effectiveDate: string;
};

export type WbsImportResult = {
  versionId: string;
  phasesCreated: number;
  budgetLinesCreated: number;
};

/**
 * Hook to import Cost Control Budget from WBS Template
 * Maps WBS items to phases and cost codes based on user's language
 */
export function useWbsToCostControlImport() {
  const queryClient = useQueryClient();
  const { language } = useLocalization();

  return useMutation({
    mutationFn: async (options: WbsImportOptions): Promise<WbsImportResult> => {
      const { projectId, wbsTemplateId, budgetVersionName, effectiveDate } = options;

      // Step 1: Get WBS items (from template or project's existing WBS)
      let wbsItems;
      if (wbsTemplateId) {
        const { data, error } = await supabase
          .from('project_wbs_template_items')
          .select('*')
          .eq('template_id', wbsTemplateId)
          .order('code_path');

        if (error) throw new Error(`Failed to fetch WBS template items: ${error.message}`);
        wbsItems = data;
      } else {
        const { data, error } = await supabase
          .from('project_wbs_items')
          .select('*')
          .eq('project_id', projectId)
          .order('code_path');

        if (error) throw new Error(`Failed to fetch project WBS items: ${error.message}`);
        wbsItems = data;
      }

      if (!wbsItems || wbsItems.length === 0) {
        throw new Error('No WBS items found to import');
      }

      // Step 2: Create budget version
      const { data: budgetVersion, error: versionError } = await supabase
        .from('project_budget_versions')
        .insert({
          project_id: projectId,
          name: budgetVersionName,
          effective_date: effectiveDate,
          status: 'draft',
        })
        .select()
        .single();

      if (versionError) throw new Error(`Failed to create budget version: ${versionError.message}`);

      // Step 3: Filter phase items
      const phaseItems = wbsItems.filter(item => item.item_type === 'phase');
      let phasesCreated = 0;
      let budgetLinesCreated = 0;

      // Step 4: For each phase, create or find project phase
      for (const phaseWbsItem of phaseItems) {
        // Find or create project phase
        let projectPhase;
        const { data: existingPhase } = await supabase
          .from('project_phases')
          .select('*')
          .eq('project_id', projectId)
          .eq('phase_name', phaseWbsItem.name)
          .maybeSingle();

        if (existingPhase) {
          projectPhase = existingPhase;
        } else {
          const { data: newPhase, error: phaseError } = await supabase
            .from('project_phases')
            .insert({
              project_id: projectId,
              phase_name: phaseWbsItem.name,
              description: phaseWbsItem.description,
              sort_order: phaseWbsItem.sort_order,
            })
            .select()
            .single();

          if (phaseError) {
            console.error(`Failed to create phase ${phaseWbsItem.name}:`, phaseError);
            continue;
          }
          projectPhase = newPhase;
          phasesCreated++;
        }

        // Step 5: Get child items (deliverables/work packages) with cost codes
        const childItems = wbsItems.filter(
          item => item.parent_id === phaseWbsItem.id && item.standard_cost_code
        );

        // Step 6: Group by cost code and create budget lines
        const costCodeMap = new Map<string, string[]>();
        
        for (const child of childItems) {
          if (child.standard_cost_code) {
            if (!costCodeMap.has(child.standard_cost_code)) {
              costCodeMap.set(child.standard_cost_code, []);
            }
            costCodeMap.get(child.standard_cost_code)!.push(child.name);
          }
        }

        // Step 7: For each unique cost code, map to language-specific UUID and create budget line
        for (const [costCodeString, itemNames] of costCodeMap.entries()) {
          // Map cost code string to language-specific UUID
          const { data: costCode, error: costCodeError } = await supabase
            .from('cost_codes')
            .select('id')
            .eq('code', costCodeString)
            .eq('language', language)
            .eq('is_active', true)
            .maybeSingle();

          if (costCodeError || !costCode) {
            console.warn(
              `Cost code ${costCodeString} not found for language ${language}. Skipping.`
            );
            continue;
          }

          // Create budget line
          const { error: lineError } = await supabase
            .from('project_budget_lines')
            .insert({
              version_id: budgetVersion.id,
              phase_id: projectPhase.id,
              cost_code_id: costCode.id,
              amount: 0, // User will fill in amounts in matrix editor
              notes: `Imported from WBS: ${itemNames.join(', ')}`,
            });

          if (lineError) {
            console.error(
              `Failed to create budget line for phase ${projectPhase.phase_name}, cost code ${costCodeString}:`,
              lineError
            );
          } else {
            budgetLinesCreated++;
          }
        }
      }

      return {
        versionId: budgetVersion.id,
        phasesCreated,
        budgetLinesCreated,
      };
    },
    onSuccess: (result, options) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['project_budget_versions', options.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', options.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_budget_lines'] });

      toast.success(
        `Budget imported successfully! Created ${result.phasesCreated} phases and ${result.budgetLinesCreated} budget lines.`
      );
    },
    onError: (error: Error) => {
      console.error('WBS import error:', error);
      toast.error(`Failed to import WBS: ${error.message}`);
    },
  });
}
