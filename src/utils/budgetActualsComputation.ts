/**
 * Centralized utility for computing actual amounts from financial entries.
 * This ensures consistent "actual" values across dashboards, reports, and components.
 *
 * Source of truth: project_financial_entries WHERE entry_type = 'expense'
 * Aggregated by: category (fallback) or cost_code_id (when available)
 */

import { TimePeriod, getDateRangeForPeriod } from '@/utils/dateFilters';

export interface ActualByCategory {
  category: string;
  actual: number;
}

export interface ActualByCostCode {
  cost_code_id: string;
  code: string;
  name: string;
  actual: number;
}

export interface ActualComputationResult {
  totalActual: number;
  byCategory?: ActualByCategory[];
  byCostCode?: ActualByCostCode[];
  periodStart?: Date;
  periodEnd?: Date;
}

/**
 * Compute total actual amount for a project during a given period.
 *
 * @param financialEntries - Array of financial entries from useFinancialEntries
 * @param period - Time period to include ('all', 'month', 'quarter', 'year')
 * @returns Total of all expense entries, optionally filtered by period
 */
export function computeTotalActual(
  financialEntries: Array<{ amount: number; entry_type: string; date?: string }> | null | undefined,
  period: TimePeriod = 'all'
): number {
  if (!financialEntries || financialEntries.length === 0) {
    return 0;
  }

  const dateRange = getDateRangeForPeriod(period);

  return financialEntries
    .filter((entry) => {
      // Only include expenses, not income
      if (entry.entry_type !== 'expense') return false;

      // Filter by date range if specified
      if (dateRange && entry.date) {
        const entryDate = new Date(entry.date);
        if (entryDate < dateRange.start || entryDate > dateRange.end) {
          return false;
        }
      }

      return true;
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

/**
 * Compute actual amounts grouped by category.
 * Used when cost code data is unavailable.
 *
 * @param financialEntries - Array of financial entries
 * @param period - Time period to include
 * @returns Array of actuals by category, sorted by amount descending
 */
export function computeActualsByCategory(
  financialEntries: Array<{
    amount: number;
    entry_type: string;
    category?: string;
    date?: string;
  }> | null | undefined,
  period: TimePeriod = 'all'
): ActualByCategory[] {
  if (!financialEntries || financialEntries.length === 0) {
    return [];
  }

  const dateRange = getDateRangeForPeriod(period);
  const categoryActuals: Record<string, number> = {};

  for (const entry of financialEntries) {
    // Only include expenses
    if (entry.entry_type !== 'expense') continue;

    // Filter by date range
    if (dateRange && entry.date) {
      const entryDate = new Date(entry.date);
      if (entryDate < dateRange.start || entryDate > dateRange.end) {
        continue;
      }
    }

    const category = entry.category || 'Other';
    categoryActuals[category] = (categoryActuals[category] || 0) + Number(entry.amount || 0);
  }

  return Object.entries(categoryActuals)
    .map(([category, actual]) => ({ category, actual }))
    .sort((a, b) => b.actual - a.actual);
}

/**
 * Compute actual amounts from RPC cost code summary data.
 * This is the primary method when using cost control budgets.
 *
 * @param costCodeSummary - Array from get_project_cost_code_summary RPC
 * @returns Array of actuals by cost code, sorted by amount descending
 */
export function computeActualsByCostCode(
  costCodeSummary: Array<{
    cost_code_id: string;
    code: string;
    name: string;
    actual_amount: number;
  }> | null | undefined
): ActualByCostCode[] {
  if (!costCodeSummary || costCodeSummary.length === 0) {
    return [];
  }

  return costCodeSummary
    .map((row) => ({
      cost_code_id: row.cost_code_id,
      code: row.code,
      name: row.name,
      actual: Number(row.actual_amount || 0),
    }))
    .sort((a, b) => b.actual - a.actual);
}

/**
 * Compute actual amounts with intelligent fallback logic.
 *
 * Priority order:
 * 1. Use costCodeSummary if available (cost control system)
 * 2. Fall back to computing from financialEntries by category
 *
 * @param financialEntries - Array of financial entries (fallback source)
 * @param costCodeSummary - RPC result with cost codes (preferred source)
 * @param period - Time period to include
 * @returns Computation result with total and breakdown
 */
export function computeActualsWithFallback(
  financialEntries: Array<{
    amount: number;
    entry_type: string;
    category?: string;
    date?: string;
  }> | null | undefined,
  costCodeSummary: Array<{
    cost_code_id: string;
    code: string;
    name: string;
    actual_amount: number;
  }> | null | undefined,
  period: TimePeriod = 'all'
): ActualComputationResult {
  const dateRange = getDateRangeForPeriod(period);

  // Check if we have cost control data
  const hasCostControlData =
    costCodeSummary &&
    costCodeSummary.some((row) => Number(row.actual_amount || 0) > 0);

  if (hasCostControlData) {
    // Use cost code summary (preferred)
    const byCostCode = computeActualsByCostCode(costCodeSummary);
    const totalActual = byCostCode.reduce((sum, cc) => sum + cc.actual, 0);

    return {
      totalActual,
      byCostCode,
      periodStart: dateRange?.start,
      periodEnd: dateRange?.end,
    };
  }

  // Fall back to category-based computation
  const byCategory = computeActualsByCategory(financialEntries, period);
  const totalActual = byCategory.reduce((sum, cat) => sum + cat.actual, 0);

  return {
    totalActual,
    byCategory,
    periodStart: dateRange?.start,
    periodEnd: dateRange?.end,
  };
}

/**
 * Helper to get actual amount for a specific category or cost code.
 * Used by individual components (e.g., BudgetCategoryCard).
 */
export function getActualForCategory(
  category: string,
  byCategory: ActualByCategory[] | undefined
): number {
  if (!byCategory) return 0;
  return byCategory.find((c) => c.category === category)?.actual || 0;
}

export function getActualForCostCode(
  costCodeId: string,
  byCostCode: ActualByCostCode[] | undefined
): number {
  if (!byCostCode) return 0;
  return byCostCode.find((cc) => cc.cost_code_id === costCodeId)?.actual || 0;
}
