import { describe, expect, it } from 'vitest';

import {
  calculateProfitability,
  calculatePortfolioProfitability,
  compareToBenchmark,
  ProfitabilityMetrics,
} from '@/utils/profitabilityCalculator';

describe('calculateProfitability', () => {
  const baseProject = {
    id: 'project-1',
    name: 'Sample Project',
    budget_total: 2000,
    total_spent: 0,
  };

  it('calculates profitability metrics for a mix of income and expenses', () => {
    const metrics = calculateProfitability(baseProject, [
      { entry_type: 'income', amount: 1500, date: '2024-01-01' },
      { entry_type: 'income', amount: 500, date: '2024-01-05' },
      { entry_type: 'expense', amount: 300, date: '2024-01-10' },
      { entry_type: 'expense', amount: 200, date: '2024-01-15' },
    ]);

    expect(metrics.totalIncome).toBe(2000);
    expect(metrics.totalExpenses).toBe(500);
    expect(metrics.grossProfit).toBe(1500);
    expect(metrics.netProfit).toBe(1500);
    expect(metrics.profitMargin).toBeCloseTo(75, 5);
    expect(metrics.roi).toBeCloseTo(300, 5);
    expect(metrics.remainingBudget).toBe(1500);
    expect(metrics.budgetUtilization).toBeCloseTo(25, 5);
  });

  it('handles zero-income projects without producing invalid ratios', () => {
    const metrics = calculateProfitability(baseProject, [
      { entry_type: 'expense', amount: 400, date: '2024-02-01' },
    ]);

    expect(metrics.totalIncome).toBe(0);
    expect(metrics.totalExpenses).toBe(400);
    expect(metrics.grossProfit).toBe(-400);
    expect(metrics.netProfit).toBe(-400);
    expect(metrics.profitMargin).toBe(0);
    expect(metrics.roi).toBeCloseTo(-100, 5);
    expect(metrics.remainingBudget).toBe(1600);
    expect(metrics.budgetUtilization).toBeCloseTo(20, 5);
  });
});

describe('calculatePortfolioProfitability', () => {
  it('aggregates profitability across multiple projects', () => {
    const projects = [
      { id: 'project-a', name: 'A', budget_total: 1000, total_spent: 0 },
      { id: 'project-b', name: 'B', budget_total: 2000, total_spent: 0 },
    ];

    const metrics = calculatePortfolioProfitability(projects, {
      'project-a': [
        { entry_type: 'income', amount: 800, date: '2024-01-01' },
        { entry_type: 'expense', amount: 300, date: '2024-01-03' },
      ],
      'project-b': [
        { entry_type: 'income', amount: 400, date: '2024-01-05' },
        { entry_type: 'expense', amount: 100, date: '2024-01-08' },
      ],
    });

    expect(metrics.totalIncome).toBe(1200);
    expect(metrics.totalExpenses).toBe(400);
    expect(metrics.grossProfit).toBe(800);
    expect(metrics.netProfit).toBe(800);
    expect(metrics.profitMargin).toBeCloseTo(66.6667, 3);
    expect(metrics.roi).toBeCloseTo(200, 3);
    expect(metrics.remainingBudget).toBe(2600);
    expect(metrics.budgetUtilization).toBeCloseTo(13.3333, 3);
  });
});

describe('compareToBenchmark', () => {
  const baseMetrics: ProfitabilityMetrics = {
    totalIncome: 1000,
    totalExpenses: 100,
    grossProfit: 900,
    netProfit: 900,
    profitMargin: 15.4,
    roi: 0,
    remainingBudget: 0,
    budgetUtilization: 0,
  };

  it('treats small variances within the threshold as on-target', () => {
    const comparison = compareToBenchmark(baseMetrics, 15, 10);

    expect(comparison.profitMarginVariance).toBeCloseTo(0.4, 5);
    expect(comparison.profitMarginStatus).toBe('on-target');
    expect(comparison.overheadVariance).toBeCloseTo(0, 5);
    expect(comparison.overheadStatus).toBe('on-target');
  });

  it('handles zero expenses by flagging overhead well below the benchmark', () => {
    const metrics: ProfitabilityMetrics = {
      ...baseMetrics,
      totalIncome: 2000,
      totalExpenses: 0,
      profitMargin: 25,
    };

    const comparison = compareToBenchmark(metrics, 15, 10);

    expect(comparison.profitMarginVariance).toBeCloseTo(10, 5);
    expect(comparison.profitMarginStatus).toBe('above');
    expect(comparison.overheadVariance).toBeCloseTo(-10, 5);
    expect(comparison.overheadStatus).toBe('above');
  });

  it('marks underperforming profitability and excessive overhead as below benchmark', () => {
    const metrics: ProfitabilityMetrics = {
      ...baseMetrics,
      totalIncome: 2000,
      totalExpenses: 1500,
      profitMargin: 5,
    };

    const comparison = compareToBenchmark(metrics);

    expect(comparison.profitMarginVariance).toBeCloseTo(-10, 5);
    expect(comparison.profitMarginStatus).toBe('below');
    expect(comparison.overheadVariance).toBeCloseTo(65, 5);
    expect(comparison.overheadStatus).toBe('below');
  });
});
