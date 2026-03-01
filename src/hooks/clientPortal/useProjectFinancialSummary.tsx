import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortalAuth } from "./useClientPortalAuth";
import { logger } from "@/lib/logger";

export const useProjectFinancialSummary = () => {
  const { projectId } = useClientPortalAuth();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['portalFinancialSummary', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      try {
        // Fetch project basic financial info
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('budget_total')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        // Fetch entries
        const { data: entries, error: entriesError } = await (supabase as any)
          .from('project_financial_entries')
          .select('amount, status, entry_type, category')
          .eq('project_id', projectId);

        if (entriesError) throw entriesError;

        const totalBudget = Number((project as any).budget_total || 0);
        const entriesData = (entries as any) || [];
        const expenses = entriesData.filter((e: any) => e.entry_type === 'expense') || [];
        
        const totalPaid = expenses
          .filter((e: any) => e.status === 'paid')
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
          
        const totalOutstanding = expenses
          .filter((e: any) => e.status !== 'paid')
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Aggregate by category
        const categories = expenses.reduce((acc: any, curr: any) => {
          const cat = curr.category || 'other';
          if (!acc[cat]) acc[cat] = 0;
          acc[cat] += Number(curr.amount);
          return acc;
        }, {});

        // Fetch budget items to get "budgeted" amount per category if possible
        // For now, we'll return the aggregated spent amounts
        const categoryBreakdown = Object.entries(categories).map(([name, spent]) => ({
          name,
          spent: spent as number,
          budgeted: 0 // We might need to fetch this from another table if we want a progress bar
        }));

        return {
          totalProjectCost: totalBudget,
          paid: totalPaid,
          outstanding: totalOutstanding,
          percentagePaid: totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0,
          categoryBreakdown
        };
      } catch (err) {
        logger.error('[useProjectFinancialSummary] Error calculating summary', { err });
        return {
          totalProjectCost: 0,
          paid: 0,
          outstanding: 0,
          percentagePaid: 0
        };
      }
    },
    enabled: !!projectId
  });

  return {
    summary: summary || { totalProjectCost: 0, paid: 0, outstanding: 0, percentagePaid: 0, categoryBreakdown: [] },
    isLoading,
    error
  };
};
