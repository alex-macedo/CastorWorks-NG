export interface BudgetItemLike {
  category?: string | null;
  budgeted_amount?: number | string | null;
  actual_amount?: number | string | null;
  description?: string | null;
}

export interface BudgetCategoryBreakdownItem {
  id: string;
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  description: string | null;
}

export function aggregateBudgetItemsByCategory(
  items: BudgetItemLike[],
  options?: { uncategorizedLabel?: string }
): BudgetCategoryBreakdownItem[] {
  const uncategorizedLabel = options?.uncategorizedLabel || 'Uncategorized';
  const buckets = new Map<
    string,
    { id: string; category: string; budgeted: number; actual: number; descriptions: Set<string> }
  >();

  for (const item of items) {
    const rawCategory = typeof item.category === 'string' ? item.category.trim() : '';
    const category = rawCategory || uncategorizedLabel;
    const key = rawCategory ? rawCategory.toLocaleLowerCase() : '__uncategorized__';

    const budgeted = Number(item.budgeted_amount || 0);
    const actual = Number(item.actual_amount || 0);
    const description = typeof item.description === 'string' ? item.description.trim() : '';

    const bucket = buckets.get(key) ?? {
      id: key,
      category,
      budgeted: 0,
      actual: 0,
      descriptions: new Set<string>(),
    };

    bucket.budgeted += budgeted;
    bucket.actual += actual;
    if (description) bucket.descriptions.add(description);

    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: bucket.id,
      category: bucket.category,
      budgeted_amount: bucket.budgeted,
      actual_amount: bucket.actual,
      description: bucket.descriptions.size === 1 ? Array.from(bucket.descriptions)[0] : null,
    }))
    .sort((a, b) => b.budgeted_amount - a.budgeted_amount);
}

