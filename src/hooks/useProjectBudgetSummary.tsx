import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { calculateSINGrandTotals } from '@/utils/budgetCalculations';

interface BudgetSummary {
  budgeted: number;
  spent: number;
  committed: number;
  remaining: number;
  percentage: number;
}

export const useProjectBudgetSummary = (projectId?: string, budgetModel?: string | null): BudgetSummary => {
  const { settings } = useAppSettings();

  const { data: latestBudget } = useQuery({
    queryKey: ['project-budgets', projectId, 'latest'],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('project_budgets')
        .select('id, budget_model, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
    enabled: !!projectId && budgetModel === 'simple',
  });

  const latestBudgetId = latestBudget?.id;

  const { data: budgetLineItems } = useQuery({
    queryKey: ['budget_line_items', latestBudgetId, 'summary'],
    queryFn: async () => {
      if (!latestBudgetId) return [];
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('total_material, total_labor')
        .eq('budget_id', latestBudgetId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!latestBudgetId && budgetModel === 'simple',
  });

  const { data } = useQuery({
    queryKey: [
      'project-budget-summary',
      projectId,
      budgetModel,
      latestBudgetId,
      budgetLineItems?.length ?? 0,
      settings?.bdi_central_admin ?? 0,
      settings?.bdi_financial_costs ?? 0,
    ],
    queryFn: async (): Promise<BudgetSummary> => {
      if (!projectId) {
        return { budgeted: 0, spent: 0, committed: 0, remaining: 0, percentage: 0 };
      }

      // Get total budgeted amount from budget items
      const { data: budgetItems } = await supabase
        .from('project_budget_items')
        .select('budgeted_amount')
        .eq('project_id', projectId);

      const budgeted = budgetItems?.reduce((sum, item) => sum + (Number(item.budgeted_amount) || 0), 0) || 0;

      // Get total spent from financial entries (expenses)
      const { data: expenses } = await supabase
        .from('project_financial_entries')
        .select('amount')
        .eq('project_id', projectId)
        .eq('entry_type', 'expense');

      const spent = expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

      // Get committed amounts from purchase orders
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('total_amount')
        .eq('project_id', projectId)
        .in('status', ['sent', 'acknowledged', 'in_transit']);

      const committed = purchaseOrders?.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0) || 0;

      let totalBudgeted = budgeted;
      if (budgetModel === 'simple' && budgetLineItems) {
        const totals = calculateSINGrandTotals(
          budgetLineItems,
          settings?.bdi_central_admin || 0,
          settings?.bdi_financial_costs || 0
        );
        totalBudgeted = totals.grandTotal || 0;
      }

      // Calculate remaining and percentage
      const totalSpent = spent + committed;
      const remaining = Math.max(0, totalBudgeted - totalSpent);
      const percentage = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;

      return {
        budgeted: totalBudgeted,
        spent,
        committed,
        remaining,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      };
    },
    enabled: !!projectId,
  });

  return data || { budgeted: 0, spent: 0, committed: 0, remaining: 0, percentage: 0 };
};
