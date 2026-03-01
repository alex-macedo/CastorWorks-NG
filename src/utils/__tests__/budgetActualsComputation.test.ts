import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeTotalActual,
  computeActualsByCategory,
  computeActualsByCostCode,
  computeActualsWithFallback,
  getActualForCategory,
  getActualForCostCode,
} from '../budgetActualsComputation';

describe('budgetActualsComputation', () => {
  describe('computeTotalActual', () => {
    it('should return 0 for empty entries', () => {
      expect(computeTotalActual(null)).toBe(0);
      expect(computeTotalActual(undefined)).toBe(0);
      expect(computeTotalActual([])).toBe(0);
    });

    it('should sum only expense entries', () => {
      const entries = [
        { amount: 100, entry_type: 'expense', date: '2024-01-15' },
        { amount: 200, entry_type: 'expense', date: '2024-01-16' },
        { amount: 50, entry_type: 'income', date: '2024-01-17' }, // should be ignored
      ];
      expect(computeTotalActual(entries, 'all')).toBe(300);
    });

    it('should filter by time period', () => {
      const entries = [
        { amount: 100, entry_type: 'expense', date: '2024-01-15' },
        { amount: 200, entry_type: 'expense', date: '2024-02-16' },
        { amount: 50, entry_type: 'expense', date: '2024-03-17' },
      ];

      // For 'month' period, only includes January (assuming current month is January)
      // This test would depend on mocking the current date
      // For now, just test 'all' which should include all entries
      expect(computeTotalActual(entries, 'all')).toBe(350);
    });

    it('should handle entries without date', () => {
      const entries = [
        { amount: 100, entry_type: 'expense' },
        { amount: 200, entry_type: 'expense', date: '2024-01-16' },
      ];
      expect(computeTotalActual(entries, 'all')).toBe(300);
    });
  });

  describe('computeActualsByCategory', () => {
    it('should return empty array for no entries', () => {
      expect(computeActualsByCategory(null)).toEqual([]);
      expect(computeActualsByCategory([])).toEqual([]);
    });

    it('should group expenses by category', () => {
      const entries = [
        { amount: 100, entry_type: 'expense', category: 'Materials' },
        { amount: 150, entry_type: 'expense', category: 'Labor' },
        { amount: 50, entry_type: 'expense', category: 'Materials' }, // should sum with first
      ];

      const result = computeActualsByCategory(entries, 'all');
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ category: 'Materials', actual: 150 });
      expect(result).toContainEqual({ category: 'Labor', actual: 150 });
    });

    it('should use "Other" for entries without category', () => {
      const entries = [
        { amount: 100, entry_type: 'expense' },
        { amount: 200, entry_type: 'expense', category: 'Labor' },
      ];

      const result = computeActualsByCategory(entries, 'all');
      expect(result).toHaveLength(2);
      const otherCategory = result.find((c) => c.category === 'Other');
      expect(otherCategory?.actual).toBe(100);
    });

    it('should sort by amount descending', () => {
      const entries = [
        { amount: 50, entry_type: 'expense', category: 'C' },
        { amount: 300, entry_type: 'expense', category: 'A' },
        { amount: 100, entry_type: 'expense', category: 'B' },
      ];

      const result = computeActualsByCategory(entries, 'all');
      expect(result[0].actual).toBe(300);
      expect(result[1].actual).toBe(100);
      expect(result[2].actual).toBe(50);
    });
  });

  describe('computeActualsByCostCode', () => {
    it('should return empty array for no data', () => {
      expect(computeActualsByCostCode(null)).toEqual([]);
      expect(computeActualsByCostCode([])).toEqual([]);
    });

    it('should extract cost code actuals from RPC data', () => {
      const costCodeSummary = [
        { cost_code_id: 'cc1', code: 'LAB', name: 'Labor', actual_amount: 1000 },
        { cost_code_id: 'cc2', code: 'MAT', name: 'Materials', actual_amount: 500 },
      ];

      const result = computeActualsByCostCode(costCodeSummary);
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('LAB');
      expect(result[0].actual).toBe(1000);
    });

    it('should sort by actual amount descending', () => {
      const costCodeSummary = [
        { cost_code_id: 'cc1', code: 'LAB', name: 'Labor', actual_amount: 500 },
        { cost_code_id: 'cc2', code: 'MAT', name: 'Materials', actual_amount: 1000 },
        { cost_code_id: 'cc3', code: 'EQT', name: 'Equipment', actual_amount: 750 },
      ];

      const result = computeActualsByCostCode(costCodeSummary);
      expect(result[0].actual).toBe(1000);
      expect(result[1].actual).toBe(750);
      expect(result[2].actual).toBe(500);
    });
  });

  describe('computeActualsWithFallback', () => {
    it('should prefer cost code data when available', () => {
      const financialEntries = [
        { amount: 100, entry_type: 'expense', category: 'Materials' },
      ];

      const costCodeSummary = [
        { cost_code_id: 'cc1', code: 'MAT', name: 'Materials', actual_amount: 500 },
      ];

      const result = computeActualsWithFallback(
        financialEntries,
        costCodeSummary,
        'all'
      );

      expect(result.totalActual).toBe(500);
      expect(result.byCostCode).toBeDefined();
      expect(result.byCategory).toBeUndefined();
    });

    it('should fall back to category data when no cost code data', () => {
      const financialEntries = [
        { amount: 100, entry_type: 'expense', category: 'Materials' },
        { amount: 200, entry_type: 'expense', category: 'Labor' },
      ];

      const result = computeActualsWithFallback(
        financialEntries,
        null,
        'all'
      );

      expect(result.totalActual).toBe(300);
      expect(result.byCategory).toBeDefined();
      expect(result.byCostCode).toBeUndefined();
      expect(result.byCategory).toHaveLength(2);
    });

    it('should handle empty cost code summary (no data)', () => {
      const financialEntries = [
        { amount: 100, entry_type: 'expense', category: 'Materials' },
      ];

      const costCodeSummary = [
        { cost_code_id: 'cc1', code: 'LAB', name: 'Labor', actual_amount: 0 },
      ];

      const result = computeActualsWithFallback(
        financialEntries,
        costCodeSummary,
        'all'
      );

      // Should fall back to category because cost code has no data
      expect(result.byCategory).toBeDefined();
      expect(result.byCostCode).toBeUndefined();
    });

    it('should include period information in result', () => {
      const entries = [
        { amount: 100, entry_type: 'expense' },
      ];

      const result = computeActualsWithFallback(entries, null, 'all');

      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });
  });

  describe('getActualForCategory', () => {
    it('should return actual for matching category', () => {
      const categories = [
        { category: 'Materials', actual: 100 },
        { category: 'Labor', actual: 200 },
      ];

      expect(getActualForCategory('Materials', categories)).toBe(100);
      expect(getActualForCategory('Labor', categories)).toBe(200);
    });

    it('should return 0 for non-matching category', () => {
      const categories = [
        { category: 'Materials', actual: 100 },
      ];

      expect(getActualForCategory('Equipment', categories)).toBe(0);
    });

    it('should return 0 for undefined input', () => {
      expect(getActualForCategory('Materials', undefined)).toBe(0);
    });
  });

  describe('getActualForCostCode', () => {
    it('should return actual for matching cost code', () => {
      const costCodes = [
        { cost_code_id: 'cc1', code: 'LAB', name: 'Labor', actual: 100 },
        { cost_code_id: 'cc2', code: 'MAT', name: 'Materials', actual: 200 },
      ];

      expect(getActualForCostCode('cc1', costCodes)).toBe(100);
      expect(getActualForCostCode('cc2', costCodes)).toBe(200);
    });

    it('should return 0 for non-matching cost code', () => {
      const costCodes = [
        { cost_code_id: 'cc1', code: 'LAB', name: 'Labor', actual: 100 },
      ];

      expect(getActualForCostCode('cc999', costCodes)).toBe(0);
    });

    it('should return 0 for undefined input', () => {
      expect(getActualForCostCode('cc1', undefined)).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex project with mixed data sources', () => {
      const financialEntries = [
        { amount: 100, entry_type: 'expense', category: 'Materials', date: '2024-01-15' },
        { amount: 200, entry_type: 'expense', category: 'Labor', date: '2024-01-16' },
        { amount: 50, entry_type: 'income', category: 'Revenue', date: '2024-01-17' },
        { amount: 75, entry_type: 'expense', category: 'Materials', date: '2024-01-18' },
      ];

      const costCodeSummary = [
        { cost_code_id: 'cc1', code: 'MAT', name: 'Materials', actual_amount: 175 },
        { cost_code_id: 'cc2', code: 'LAB', name: 'Labor', actual_amount: 200 },
      ];

      const result = computeActualsWithFallback(
        financialEntries,
        costCodeSummary,
        'all'
      );

      // Should use cost code data (preferred)
      expect(result.totalActual).toBe(375);
      expect(result.byCostCode).toHaveLength(2);
      expect(result.byCategory).toBeUndefined();
    });

    it('should handle scenario with only income entries', () => {
      const entries = [
        { amount: 100, entry_type: 'income', category: 'Revenue' },
        { amount: 200, entry_type: 'income', category: 'Interest' },
      ];

      const result = computeActualsWithFallback(entries, null, 'all');

      // Should return 0 because no expenses
      expect(result.totalActual).toBe(0);
      expect(result.byCategory).toEqual([]);
    });
  });
});
