import { useMemo } from "react";

/**
 * Hook to handle complex filtering logic with multiple multi-select filters.
 * Implements AND logic between different filter categories and OR logic within categories.
 * 
 * @param items The array of items to filter
 * @param filterGroups An object where keys are item properties and values are arrays of selected values
 * @returns Filtered items
 */
export function useMultiFilter<T>(
  items: T[] | null | undefined,
  filterGroups: Record<string, string[] | undefined>
): T[] {
  return useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      // Every filter group must pass (AND logic between groups)
      return Object.entries(filterGroups).every(([key, selectedValues]) => {
        // If no values selected for this group, it passes
        if (!selectedValues || selectedValues.length === 0) {
          return true;
        }

        // Get the value from the item. Support nested properties like 'projects.name' or 'projects:name'
        const itemValue = key.split(/[.:]/).reduce((obj, part) => (obj as any)?.[part], item);

        // If the item value is an array, check for intersection
        if (Array.isArray(itemValue)) {
          return itemValue.some((val) => selectedValues.includes(String(val)));
        }

        // Otherwise check if the single value is in the selected list (OR logic within group)
        return selectedValues.includes(String(itemValue));
      });
    });
  }, [items, filterGroups]);
}

/**
 * Standardized filter state management helper
 */
export function createFilterGroup(
  currentFilters: Record<string, string[] | undefined>,
  key: string,
  values: string[]
) {
  const newFilters = { ...currentFilters, [key]: values };
  if (values.length === 0) {
    delete newFilters[key];
  }
  return newFilters;
}
