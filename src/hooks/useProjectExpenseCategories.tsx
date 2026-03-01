import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

// Color palette for expense categories
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export const useProjectExpenseCategories = (projectId?: string): ExpenseCategory[] => {
  const { data } = useQuery({
    queryKey: ['project-expense-categories', projectId],
    queryFn: async (): Promise<ExpenseCategory[]> => {
      if (!projectId) {
        return [];
      }

      // Get expense data grouped by category
      const { data: expenses } = await supabase
        .from('project_financial_entries')
        .select('category, amount')
        .eq('project_id', projectId)
        .eq('entry_type', 'expense');

      if (!expenses || expenses.length === 0) {
        return [];
      }

      // Group by category and sum amounts
      const categoryTotals = expenses.reduce((acc, entry) => {
        const category = entry.category || 'OUTROS'; // Default to 'OUTROS' if no category
        const amount = Number(entry.amount) || 0;

        if (acc[category]) {
          acc[category] += amount;
        } else {
          acc[category] = amount;
        }

        return acc;
      }, {} as Record<string, number>);

      // Convert to array format with colors, sorted by amount descending
      const result: ExpenseCategory[] = Object.entries(categoryTotals)
        .map(([name, value], index) => ({
          name,
          value: value as number,
          color: COLORS[index % COLORS.length], // Assign colors sequentially
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending

      return result;
    },
    enabled: !!projectId,
  });

  return data || [];
};