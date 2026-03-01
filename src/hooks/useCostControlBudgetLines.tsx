import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logError, logDebug, logWarn } from '@/lib/logger-migration';

export interface CostControlBudgetLine {
  id: string;
  version_id: string;
  phase_id: string;
  cost_code_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  // Joined data
  project_phases?: {
    id: string;
    phase_name: string;
  } | null;
  cost_codes?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

/**
 * Hook for fetching Cost Control budget lines with phase and cost code information
 * Used by BudgetPhaseTotalsTab to calculate phase-level totals for Cost Control budgets
 */
export function useCostControlBudgetLines(budgetId: string | undefined) {
  logDebug('[useCostControlBudgetLines] Called with budgetId', { budgetId });

  return useQuery({
    queryKey: ['cost-control-budget-lines-v20', budgetId],
    queryFn: async (): Promise<CostControlBudgetLine[]> => {
      if (!budgetId) return [];
      
      logDebug('[useCostControlBudgetLines] CORE ENGINE v20');
      console.group('[useCostControlBudgetLines] CORE ENGINE v20');
      try {
        // 1. First, get the project_id from the budget
        const { data: budget, error: budgetErr } = await supabase
          .from('project_budgets')
          .select('project_id')
          .eq('id', budgetId)
          .maybeSingle();

        if (budgetErr) {
          console.error('Error fetching budget:', budgetErr);
          throw budgetErr;
        }
        
        if (!budget) {
          console.warn('No budget found for budgetId:', budgetId);
          console.groupEnd();
          return [];
        }

        logInfo('Budget found', { project_id: budget.project_id });

        // 2. Resolve the baseline Version for this project
        const { data: version, error: verErr } = await supabase
          .from('project_budget_versions')
          .select('id, project_id')
          .eq('project_id', budget.project_id)
          .eq('status', 'baseline')
          .maybeSingle();

        if (verErr) throw verErr;
        if (!version) {
          console.warn('No baseline version found for project:', budget.project_id);
          console.groupEnd();
          return [];
        }

        logInfo('Resolved Version', { versionId: version.id, projectId: version.project_id });

        // 2. Parallel Fetch with explicit error checks
        const [linesRes, codesRes, phasesRes] = await Promise.all([
          supabase.from('project_budget_lines').select('*').eq('version_id', version.id),
          supabase.from('cost_codes').select('*'),
          supabase.from('project_phases').select('*').eq('project_id', version.project_id)
        ]);

        if (linesRes.error) logError('Lines Fetch Error', linesRes.error);
        if (codesRes.error) logError('Codes Fetch Error', codesRes.error);
        if (phasesRes.error) logError('Phases Fetch Error', phasesRes.error);

        const lines = linesRes.data || [];
        const codes = codesRes.data || [];
        const phases = phasesRes.data || [];

        logInfo('Fetch Counts', { lines: lines.length, codes: codes.length, phases: phases.length });

        // DEBUG: Log sample IDs from both sides
        if (codes.length > 0) {
          logDebug('Sample cost_codes from DB', codes.slice(0, 3).map(c => ({ id: c.id, code: c.code })));
        }
        if (lines.length > 0) {
          logDebug('Sample cost_code_id from lines', lines.slice(0, 3).map(l => l.cost_code_id));
        }

        // 3. Robust Map Creation
        const codesMap = new Map(codes.map(c => [c.id, c]));
        const phasesMap = new Map(phases.map(p => [p.id, p]));

        logDebug('codesMap size', { size: codesMap.size, keysSample: Array.from(codesMap.keys()).slice(0, 3) });

        // 4. Perform Join with detailed logging
        const result = lines.map(line => {
          const matchedCode = codesMap.get(line.cost_code_id);
          if (!matchedCode && line.cost_code_id) {
            logWarn('MISS: cost_code_id not in map', { cost_code_id: line.cost_code_id });
          }
          return {
            ...line,
            cost_codes: matchedCode || null,
            project_phases: phasesMap.get(line.phase_id) || null
          };
        });

        const successCount = result.filter(r => r.cost_codes).length;
        logInfo('Join Success', { success: successCount, total: result.length });
        
        if (result.length > 0) {
          logDebug('Sample Joined Record', result[0]);
        }
        return result as CostControlBudgetLine[];
      } catch (err) {
        logError('[useCostControlBudgetLines] CRITICAL ENGINE FAILURE', err);
        console.groupEnd();
        throw err;
      }
    },
    enabled: !!budgetId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
}