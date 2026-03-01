interface FinancialEntry {
  entry_type: 'income' | 'expense';
  amount: number;
  date: string;
}

interface Project {
  id: string;
  name: string;
  budget_total: number;
  total_spent: number;
}

export interface ProfitabilityMetrics {
  totalIncome: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  remainingBudget: number;
  budgetUtilization: number;
}

export function calculateProfitability(
  project: Project,
  financialEntries: FinancialEntry[]
): ProfitabilityMetrics {
  const totalIncome = financialEntries
    .filter(e => e.entry_type === 'income')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalExpenses = financialEntries
    .filter(e => e.entry_type === 'expense')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const grossProfit = totalIncome - totalExpenses;
  const netProfit = grossProfit;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;
  const remainingBudget = (project.budget_total || 0) - totalExpenses;
  const budgetUtilization = project.budget_total > 0 
    ? (totalExpenses / project.budget_total) * 100 
    : 0;

  return {
    totalIncome,
    totalExpenses,
    grossProfit,
    netProfit,
    profitMargin,
    roi,
    remainingBudget,
    budgetUtilization,
  };
}

export function calculatePortfolioProfitability(
  projects: Project[],
  allFinancialEntries: Record<string, FinancialEntry[]>
): ProfitabilityMetrics {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalBudget = 0;

  projects.forEach(project => {
    const entries = allFinancialEntries[project.id] || [];
    totalIncome += entries
      .filter(e => e.entry_type === 'income')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    totalExpenses += entries
      .filter(e => e.entry_type === 'expense')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    totalBudget += project.budget_total || 0;
  });

  const grossProfit = totalIncome - totalExpenses;
  const netProfit = grossProfit;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;
  const remainingBudget = totalBudget - totalExpenses;
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    grossProfit,
    netProfit,
    profitMargin,
    roi,
    remainingBudget,
    budgetUtilization,
  };
}

export function compareToBenchmark(
  metrics: ProfitabilityMetrics,
  benchmarkProfitMargin: number = 15.0,
  benchmarkOverhead: number = 10.0
): {
  profitMarginVariance: number;
  overheadVariance: number;
  profitMarginStatus: 'above' | 'below' | 'on-target';
  overheadStatus: 'above' | 'below' | 'on-target';
} {
  const profitMarginVariance = metrics.profitMargin - benchmarkProfitMargin;
  const overheadPercentage = metrics.totalExpenses > 0 
    ? (metrics.totalExpenses / (metrics.totalIncome || 1)) * 100 
    : 0;
  const overheadVariance = overheadPercentage - benchmarkOverhead;

  const profitMarginStatus = 
    Math.abs(profitMarginVariance) < 1 ? 'on-target' :
    profitMarginVariance > 0 ? 'above' : 'below';

  const overheadStatus = 
    Math.abs(overheadVariance) < 1 ? 'on-target' :
    overheadVariance < 0 ? 'above' : 'below';

  return {
    profitMarginVariance,
    overheadVariance,
    profitMarginStatus,
    overheadStatus,
  };
}
