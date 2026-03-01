import { describe, expect, it } from 'vitest';

import { aggregateBudgetItemsByCategory } from '@/utils/budgetAggregation';

describe('aggregateBudgetItemsByCategory', () => {
  it('deduplicates categories and sums amounts', () => {
    const aggregated = aggregateBudgetItemsByCategory(
      [
        { category: 'Materials', budgeted_amount: 100, actual_amount: 40, description: 'Bulk order' },
        { category: ' materials ', budgeted_amount: 50, actual_amount: 10, description: 'Bulk order' },
        { category: 'Labor', budgeted_amount: 80, actual_amount: 20, description: 'Contractors' },
        { category: null, budgeted_amount: 30, actual_amount: 0, description: 'Misc' },
      ],
      { uncategorizedLabel: 'Other' }
    );

    expect(aggregated).toHaveLength(3);
    expect(aggregated.map((row) => row.category)).toEqual(['Materials', 'Labor', 'Other']);

    expect(aggregated[0]).toMatchObject({
      id: 'materials',
      budgeted_amount: 150,
      actual_amount: 50,
      description: 'Bulk order',
    });
  });

  it('clears description when multiple distinct descriptions exist within a category', () => {
    const aggregated = aggregateBudgetItemsByCategory([
      { category: 'Permits', budgeted_amount: 100, actual_amount: 0, description: 'City fees' },
      { category: 'permits', budgeted_amount: 50, actual_amount: 10, description: 'Inspection fees' },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].description).toBeNull();
  });
});

