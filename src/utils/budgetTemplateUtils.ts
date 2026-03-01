export interface BudgetTemplateItem {
  id: string;
  category?: string;
  sort_order?: number;
  [key: string]: any;
}

export interface ReorderUpdate {
  id: string;
  sort_order: number;
}

export const calculateCategoryReorder = (
  items: BudgetTemplateItem[],
  newCategoryOrder: string[]
): ReorderUpdate[] => {
  const itemsToUpdate: ReorderUpdate[] = [];
  let currentOrder = 1;

  newCategoryOrder.forEach((category) => {
    const categoryItems = items
      .filter((item) => (item.category || 'Uncategorized') === category)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    categoryItems.forEach((item) => {
      if (item.sort_order !== currentOrder) {
        itemsToUpdate.push({
          id: item.id,
          sort_order: currentOrder,
        });
      }
      currentOrder++;
    });
  });

  return itemsToUpdate;
};
