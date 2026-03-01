import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useFinancialEntries } from './useFinancialEntries';
import { useProjectBudgetItems } from './useProjectBudgetItems';
import { TimePeriod, getDateRangeForPeriod, filterByDateRange } from '@/utils/dateFilters';
import { computeActualsWithFallback } from '@/utils/budgetActualsComputation';

export interface CategoryBudget {
  category: string;
  budgeted: number;
  actual: number;
  percentage: number;
  remaining: number;
  status: 'success' | 'warning' | 'danger';
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentageUsed: number;
  categoryBreakdown: CategoryBudget[];
}

type CostCodeSummaryRow = {
  cost_code_id: string;
  code: string;
  name: string;
  level: number;
  budget_amount: number;
  committed_amount: number;
  actual_amount: number;
  forecast_eac: number;
  variance: number;
  percent_used: number;
};

function toRpcDateRange(period: TimePeriod) {
  if (period === 'all') return { from: null as string | null, to: null as string | null };
  const range = getDateRangeForPeriod(period);
  return {
    from: range?.start?.toISOString().slice(0, 10) ?? null,
    to: range?.end?.toISOString().slice(0, 10) ?? null,
  };
}

export function useBudgetAnalysis(projectId?: string, period: TimePeriod = 'all') {
  const { financialEntries: allFinancialEntries } = useFinancialEntries(projectId);
  const { budgetItems } = useProjectBudgetItems(projectId);
  
  const dateRange = useMemo(() => getDateRangeForPeriod(period), [period]);
  const rpcDateRange = useMemo(() => toRpcDateRange(period), [period]);
  
  const financialEntries = useMemo(() => {
    return filterByDateRange(allFinancialEntries || [], dateRange);
  }, [allFinancialEntries, dateRange]);

  const { data: costCodeSummary } = useQuery({
    queryKey: ['cost_control', 'cost_code_summary', projectId, period],
    queryFn: async () => {
      if (!projectId) return [] as CostCodeSummaryRow[];
      const { data, error } = await supabase.rpc('get_project_cost_code_summary', {
        _project_id: projectId,
        _cost_code_level: 1,
        _from_date: rpcDateRange.from,
        _to_date: rpcDateRange.to,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CostCodeSummaryRow[];
    },
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });

  const { data: projectSummary } = useQuery({
    queryKey: ['project-budget-analysis', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('budget_model, budget_total')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });

  const analysis = useMemo<BudgetSummary>(() => {
    const hasCostControlData =
      !!costCodeSummary &&
      costCodeSummary.some((row) => Number(row.budget_amount || 0) > 0 || Number(row.actual_amount || 0) > 0 || Number(row.committed_amount || 0) > 0);

    if (hasCostControlData) {
      const categoryBreakdown = costCodeSummary.map((row) => {
        const budgeted = Number(row.budget_amount || 0);
        const actual = Number(row.actual_amount || 0);
        const percentage = budgeted > 0 ? (actual / budgeted) * 100 : actual > 0 ? 100 : 0;
        const remaining = budgeted - actual;

        let status: 'success' | 'warning' | 'danger' = 'success';
        if (budgeted === 0 && actual > 0) status = 'danger';
        else if (percentage > 90) status = 'danger';
        else if (percentage > 75) status = 'warning';

        return {
          category: row.name,
          budgeted,
          actual,
          percentage,
          remaining,
          status,
        };
      });

      const totalBudgeted = costCodeSummary.reduce((sum, row) => sum + Number(row.budget_amount || 0), 0);
      const totalSpent = costCodeSummary.reduce((sum, row) => sum + Number(row.actual_amount || 0), 0);
      const totalRemaining = totalBudgeted - totalSpent;
      const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

      return {
        totalBudgeted,
        totalSpent,
        totalRemaining,
        percentageUsed,
        categoryBreakdown,
      };
    }

    if (!budgetItems || !financialEntries) {
      return {
        totalBudgeted: 0,
        totalSpent: 0,
        totalRemaining: 0,
        percentageUsed: 0,
        categoryBreakdown: [],
      };
    }

    // Use standardized actual computation with fallback logic
    const computationResult = computeActualsWithFallback(financialEntries, null, period);
    const actualsByCategory = computationResult.byCategory || [];
    const actualByCategoryMap = Object.fromEntries(
      actualsByCategory.map((a) => [a.category, a.actual])
    );

    const budgetCategoryTotals = budgetItems.reduce((acc, item) => {
      const category = item.category || 'Other';
      const budgeted = Number(item.budgeted_amount || 0);

      acc[category] = (acc[category] || 0) + budgeted;
      return acc;
    }, {} as Record<string, number>);

    const orderedCategories = Array.from(
      new Set([
        ...budgetItems.map((item) => item.category || 'Other'),
        ...Object.keys(actualByCategoryMap),
      ])
    );

    const categoryBreakdown = orderedCategories.map((category) => {
      const budgeted = budgetCategoryTotals[category] ?? 0;
      const actual = actualByCategoryMap[category] ?? 0;
      const percentage = budgeted > 0 ? (actual / budgeted) * 100 : actual > 0 ? 100 : 0;
      const remaining = budgeted - actual;

      let status: 'success' | 'warning' | 'danger' = 'success';
      if (budgeted === 0 && actual > 0) status = 'danger';
      else if (percentage > 90) status = 'danger';
      else if (percentage > 75) status = 'warning';

      return {
        category,
        budgeted,
        actual,
        percentage,
        remaining,
        status,
      };
    });

    let totalBudgeted = budgetItems.reduce(
      (sum, item) => sum + Number(item.budgeted_amount || 0),
      0
    );
    const totalSpent = computationResult.totalActual;
    if (projectSummary?.budget_model === 'simple' && projectSummary.budget_total != null) {
      totalBudgeted = Number(projectSummary.budget_total || 0);
    }
    const totalRemaining = totalBudgeted - totalSpent;
    const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      percentageUsed,
      categoryBreakdown,
    };
  }, [budgetItems, costCodeSummary, financialEntries, period, projectSummary]);

  return analysis;
}
