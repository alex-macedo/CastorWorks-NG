import { describe, it, expect } from 'vitest';
import { calculateCategoryReorder, type BudgetTemplateItem, type ReorderUpdate } from '../budgetTemplateUtils';

describe('calculateCategoryReorder', () => {
  describe('Sequential Numbering', () => {
    it('should renumber items sequentially when categories are reordered', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Expenses', sort_order: 1 },
        { id: '2', category: 'Expenses', sort_order: 2 },
        { id: '3', category: 'Income', sort_order: 3 },
        { id: '4', category: 'Income', sort_order: 4 },
      ];
      const newCategoryOrder = ['Income', 'Expenses'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toEqual([
        { id: '3', sort_order: 1 },
        { id: '4', sort_order: 2 },
        { id: '1', sort_order: 3 },
        { id: '2', sort_order: 4 },
      ]);
    });

    it('should handle single category reordering', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Expenses', sort_order: 1 },
        { id: '2', category: 'Expenses', sort_order: 2 },
        { id: '3', category: 'Expenses', sort_order: 3 },
      ];
      const newCategoryOrder = ['Expenses'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toEqual([]);
    });
  });

  describe('Skip Unchanged Items (Optimization)', () => {
    it('should return empty array when items are already in correct order', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Income', sort_order: 1 },
        { id: '2', category: 'Income', sort_order: 2 },
        { id: '3', category: 'Expenses', sort_order: 3 },
        { id: '4', category: 'Expenses', sort_order: 4 },
      ];
      const newCategoryOrder = ['Income', 'Expenses'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toEqual([]);
    });

    it('should only return items with actual sort_order changes', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Income', sort_order: 1 },
        { id: '2', category: 'Income', sort_order: 2 },
        { id: '3', category: 'Expenses', sort_order: 3 },
        { id: '4', category: 'Expenses', sort_order: 4 },
      ];
      const newCategoryOrder = ['Expenses', 'Income'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toContainEqual({ id: '1', sort_order: 3 });
      expect(result).toContainEqual({ id: '2', sort_order: 4 });
      expect(result).not.toContainEqual({ id: '3', sort_order: 3 });
      expect(result).not.toContainEqual({ id: '4', sort_order: 4 });
    });

    it('should optimize by not including unchanged items', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 1 },
        { id: '2', category: 'A', sort_order: 2 },
        { id: '3', category: 'B', sort_order: 3 },
      ];
      const newCategoryOrder = ['B', 'A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      // All 3 items change: '3' from 3→1, '1' from 1→2, '2' from 2→3
      expect(result.length).toBe(3);
      expect(result).toContainEqual({ id: '3', sort_order: 1 });
      expect(result).toContainEqual({ id: '1', sort_order: 2 });
      expect(result).toContainEqual({ id: '2', sort_order: 3 });
    });

    it('should handle partial category reordering with optimization', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 1 },
        { id: '2', category: 'B', sort_order: 2 },
        { id: '3', category: 'C', sort_order: 3 },
      ];
      const newCategoryOrder = ['A', 'C', 'B'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toContainEqual({ id: '2', sort_order: 3 });
      expect(result).toContainEqual({ id: '3', sort_order: 2 });
      expect(result).not.toContainEqual({ id: '1', sort_order: 1 });
    });
  });

  describe('Within-Category Order Preservation', () => {
    it('should maintain relative order within each category', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Expenses', sort_order: 1 },
        { id: '2', category: 'Expenses', sort_order: 2 },
        { id: '3', category: 'Expenses', sort_order: 3 },
        { id: '4', category: 'Income', sort_order: 4 },
        { id: '5', category: 'Income', sort_order: 5 },
      ];
      const newCategoryOrder = ['Income', 'Expenses'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      const reorderedItems = items.map(item => {
        const update = result.find(u => u.id === item.id);
        return { ...item, sort_order: update?.sort_order || item.sort_order };
      });

      const expenseItems = reorderedItems.filter(i => i.category === 'Expenses');
      expect(expenseItems[0].id).toBe('1');
      expect(expenseItems[1].id).toBe('2');
      expect(expenseItems[2].id).toBe('3');
    });

    it('should preserve order after category reorganization', () => {
      const items: BudgetTemplateItem[] = [
        { id: 'a', category: 'Z', sort_order: 1 },
        { id: 'b', category: 'Z', sort_order: 2 },
        { id: 'c', category: 'A', sort_order: 3 },
        { id: 'd', category: 'A', sort_order: 4 },
      ];
      const newCategoryOrder = ['A', 'Z'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      const aItems = [
        { id: 'c', expectedOrder: 1 },
        { id: 'd', expectedOrder: 2 },
      ];
      aItems.forEach(item => {
        const update = result.find(u => u.id === item.id);
        expect(update?.sort_order).toBe(item.expectedOrder);
      });
    });
  });

  describe('Multi-Category Complexity', () => {
    it('should handle 3+ categories correctly', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 1 },
        { id: '2', category: 'B', sort_order: 2 },
        { id: '3', category: 'C', sort_order: 3 },
        { id: '4', category: 'A', sort_order: 4 },
        { id: '5', category: 'B', sort_order: 5 },
      ];
      const newCategoryOrder = ['C', 'B', 'A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      // Only changed items are returned: '3' (3→1), '5' (5→3), '1' (1→4), '4' (4→5)
      // '2' stays at sort_order 2, so it's not included
      expect(result).toContainEqual({ id: '3', sort_order: 1 });
      expect(result).not.toContainEqual({ id: '2', sort_order: 2 }); // unchanged
      expect(result).toContainEqual({ id: '5', sort_order: 3 });
      expect(result).toContainEqual({ id: '1', sort_order: 4 });
      expect(result).toContainEqual({ id: '4', sort_order: 5 });
    });

    it('should handle complex 4-category reordering', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Fixed Costs', sort_order: 1 },
        { id: '2', category: 'Fixed Costs', sort_order: 2 },
        { id: '3', category: 'Variable Costs', sort_order: 3 },
        { id: '4', category: 'Revenue', sort_order: 4 },
        { id: '5', category: 'Revenue', sort_order: 5 },
        { id: '6', category: 'Taxes', sort_order: 6 },
      ];
      const newCategoryOrder = ['Revenue', 'Fixed Costs', 'Variable Costs', 'Taxes'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toContainEqual({ id: '4', sort_order: 1 });
      expect(result).toContainEqual({ id: '5', sort_order: 2 });
      expect(result).toContainEqual({ id: '1', sort_order: 3 });
      expect(result).toContainEqual({ id: '2', sort_order: 4 });
      expect(result).toEqual(expect.arrayContaining([
        { id: '4', sort_order: 1 },
        { id: '5', sort_order: 2 },
        { id: '1', sort_order: 3 },
        { id: '2', sort_order: 4 },
      ]));
    });
  });

  describe('Undefined sort_order Handling', () => {
    it('should treat undefined sort_order as 0', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: undefined },
        { id: '2', category: 'A', sort_order: 2 },
      ];
      const newCategoryOrder = ['A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      const item1Update = result.find(u => u.id === '1');
      expect(item1Update?.sort_order).toBe(1);
    });

    it('should handle all undefined sort_order values', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A' },
        { id: '2', category: 'A' },
        { id: '3', category: 'B' },
      ];
      const newCategoryOrder = ['A', 'B'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toContainEqual({ id: '1', sort_order: 1 });
      expect(result).toContainEqual({ id: '2', sort_order: 2 });
      expect(result).toContainEqual({ id: '3', sort_order: 3 });
    });

    it('should handle mixed defined and undefined sort_order values', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 5 },
        { id: '2', category: 'A' }, // undefined sort_order
        { id: '3', category: 'A', sort_order: 10 },
      ];
      const newCategoryOrder = ['A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      // Sort order: undefined=0, so order is: '2' (0), '1' (5), '3' (10)
      // After reordering: '2' gets 1, '1' gets 2, '3' gets 3
      expect(result.find(u => u.id === '2')?.sort_order).toBe(1);
    });
  });

  describe('Error Resilience & Edge Cases', () => {
    it('should return empty array for empty items array', () => {
      const items: BudgetTemplateItem[] = [];
      const newCategoryOrder = ['A', 'B'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty newCategoryOrder', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 1 },
      ];
      const newCategoryOrder: string[] = [];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toEqual([]);
    });

    it('should handle items with undefined category', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', sort_order: 1 },
        { id: '2', category: 'A', sort_order: 2 },
        { id: '3', sort_order: 3 },
      ];
      const newCategoryOrder = ['A', 'Uncategorized'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      const uncategorizedItems = items
        .filter(i => !i.category)
        .map(i => i.id);
      
      expect(result.filter(u => uncategorizedItems.includes(u.id)).length).toBeGreaterThan(0);
    });

    it('should exclude items in categories not in newCategoryOrder', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: 1 },
        { id: '2', category: 'B', sort_order: 2 },
        { id: '3', category: 'C', sort_order: 3 },
      ];
      const newCategoryOrder = ['A', 'B'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result.find(u => u.id === '3')).toBeUndefined();
    });

    it('should handle large number of items (100+)', () => {
      const items: BudgetTemplateItem[] = Array.from({ length: 150 }, (_, i) => ({
        id: String(i + 1),
        category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
        sort_order: i + 1,
      }));
      const newCategoryOrder = ['C', 'B', 'A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(u => u.sort_order > 0 && u.sort_order <= 150)).toBe(true);
    });

    it('should handle negative and zero sort_order values', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'A', sort_order: -5 },
        { id: '2', category: 'A', sort_order: 0 },
        { id: '3', category: 'A', sort_order: 5 },
      ];
      const newCategoryOrder = ['A'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result.find(u => u.id === '1')?.sort_order).toBe(1);
      expect(result.find(u => u.id === '2')?.sort_order).toBe(2);
      expect(result.find(u => u.id === '3')?.sort_order).toBe(3);
    });

    it('should be idempotent when called multiple times', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'B', sort_order: 1 },
        { id: '2', category: 'A', sort_order: 2 },
      ];
      const newCategoryOrder = ['A', 'B'];

      const result1 = calculateCategoryReorder(items, newCategoryOrder);
      const updatedItems = items.map(item => {
        const update = result1.find(u => u.id === item.id);
        return { ...item, sort_order: update?.sort_order || item.sort_order };
      });
      const result2 = calculateCategoryReorder(updatedItems, newCategoryOrder);

      expect(result2).toEqual([]);
    });

    it('should handle realistic mixed scenario with gaps in sort_order', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Expenses', sort_order: 1 },
        { id: '2', category: 'Expenses', sort_order: 5 },
        { id: '3', category: 'Expenses', sort_order: 10 },
        { id: '4', category: 'Income', sort_order: 2 },
        { id: '5', category: 'Income', sort_order: 8 },
        { id: '6', category: 'Uncategorized', sort_order: 15 },
      ];
      const newCategoryOrder = ['Income', 'Expenses', 'Uncategorized'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result.find(u => u.id === '4')?.sort_order).toBe(1);
      expect(result.find(u => u.id === '5')?.sort_order).toBe(2);
      expect(result.find(u => u.id === '1')?.sort_order).toBe(3);
      expect(result.find(u => u.id === '2')?.sort_order).toBe(4);
      expect(result.find(u => u.id === '3')?.sort_order).toBe(5);
      expect(result.find(u => u.id === '6')?.sort_order).toBe(6);
    });
  });

  describe('Realistic Budget Template Scenarios', () => {
    it('should move expense category before income', () => {
      const items: BudgetTemplateItem[] = [
        { id: 'salaries', category: 'Income', sort_order: 1 },
        { id: 'grants', category: 'Income', sort_order: 2 },
        { id: 'staff-costs', category: 'Expenses', sort_order: 3 },
        { id: 'equipment', category: 'Expenses', sort_order: 4 },
      ];
      const newCategoryOrder = ['Expenses', 'Income'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      expect(result).toContainEqual({ id: 'staff-costs', sort_order: 1 });
      expect(result).toContainEqual({ id: 'equipment', sort_order: 2 });
      expect(result).toContainEqual({ id: 'salaries', sort_order: 3 });
      expect(result).toContainEqual({ id: 'grants', sort_order: 4 });
    });

    it('should add categories to different positions with proper reordering', () => {
      const items: BudgetTemplateItem[] = [
        { id: '1', category: 'Other', sort_order: 1 },
        { id: '2', category: 'Personnel', sort_order: 2 },
        { id: '3', category: 'Personnel', sort_order: 3 },
        { id: '4', category: 'Travel', sort_order: 4 },
      ];
      const newCategoryOrder = ['Travel', 'Personnel', 'Equipment', 'Other'];

      const result = calculateCategoryReorder(items, newCategoryOrder);

      // 'Equipment' category has no items, so it's ignored
      // Order: Travel (item '4': 4→1), Personnel (items '2':2→2, '3':3→3), Other (item '1':1→4)
      expect(result.find(u => u.id === '4')?.sort_order).toBe(1);
      expect(result.find(u => u.id === '2')).toBeUndefined(); // stays at 2, not changed
      expect(result.find(u => u.id === '3')).toBeUndefined(); // stays at 3, not changed
      expect(result.find(u => u.id === '1')?.sort_order).toBe(4);
    });
  });
});
