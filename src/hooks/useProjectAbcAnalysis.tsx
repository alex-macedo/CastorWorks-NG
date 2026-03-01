import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AbcItem {
  name: string;
  cost: number;
}

export const useProjectAbcAnalysis = (projectId?: string): AbcItem[] => {
  const { data } = useQuery({
    queryKey: ['project-abc-analysis', projectId],
    queryFn: async (): Promise<AbcItem[]> => {
      if (!projectId) {
        return [];
      }

      // Get expense data grouped by category for ABC analysis
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

      // Convert to array, sort by cost descending, and take top 15
      const result: AbcItem[] = Object.entries(categoryTotals)
        .map(([name, cost]) => ({
          name,
          cost: Math.round((cost as number) * 100) / 100, // Round to 2 decimal places
        }))
        .sort((a, b) => b.cost - a.cost) // Sort by cost descending
        .slice(0, 15); // Take top 15 categories

      return result;
    },
    enabled: !!projectId,
  });

  return data || [];
};