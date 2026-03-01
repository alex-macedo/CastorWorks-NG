import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/useProjects';

interface MonthlyTrend {
  month: string; // Format: "YYYY-MM"
  total: number;
  labor: number;
  materials: number;
}

// Helper function to check if category is labor-related
const isLaborCategory = (category: string): boolean => {
  const laborCategories = ['MÃO-DE-OBRA', 'LABOR', 'LABOUR', 'MANPOWER', 'PERSONNEL'];
  return laborCategories.some(laborCat =>
    category.toUpperCase().includes(laborCat)
  );
};

// Helper function to check if category is materials-related
const isMaterialsCategory = (category: string): boolean => {
  const materialsCategories = ['MATERIAIS', 'MATERIALS', 'SUPPLIES', 'EQUIPMENT', 'EQUIPAMENTOS'];
  return materialsCategories.some(materialCat =>
    category.toUpperCase().includes(materialCat)
  );
};

// Helper function to generate month range between two dates
const generateMonthRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: string[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

export const useProjectMonthlyTrends = (projectId?: string): MonthlyTrend[] => {
  const { project } = useProject(projectId);

  const { data } = useQuery({
    queryKey: ['project-monthly-trends', projectId, project?.start_date],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      if (!projectId || !project?.start_date) {
        return [];
      }

      const projectStartDate = project.start_date;
      const currentDate = new Date().toISOString().split('T')[0]; // Today's date

      // Get financial entries from project start to now
      const { data: expenses } = await supabase
        .from('project_financial_entries')
        .select('category, amount, date')
        .eq('project_id', projectId)
        .eq('entry_type', 'expense')
        .gte('date', projectStartDate)
        .lte('date', currentDate)
        .order('date', { ascending: true });

      if (!expenses || expenses.length === 0) {
        // Return empty months if no data
        const months = generateMonthRange(projectStartDate, currentDate);
        return months.map(month => ({
          month,
          total: 0,
          labor: 0,
          materials: 0,
        }));
      }

      // Group expenses by month and category
      const monthlyData = expenses.reduce((acc, entry) => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(entry.amount) || 0;
        const category = entry.category || 'OUTROS';

        if (!acc[monthKey]) {
          acc[monthKey] = {
            total: 0,
            labor: 0,
            materials: 0,
            other: 0,
          };
        }

        acc[monthKey].total += amount;

        // Categorize the expense
        if (isLaborCategory(category)) {
          acc[monthKey].labor += amount;
        } else if (isMaterialsCategory(category)) {
          acc[monthKey].materials += amount;
        } else {
          // Add to materials as catch-all (since charts show labor vs materials)
          acc[monthKey].materials += amount;
        }

        return acc;
      }, {} as Record<string, { total: number; labor: number; materials: number; other: number }>);

      // Generate complete month range and fill gaps
      const allMonths = generateMonthRange(projectStartDate, currentDate);

      return allMonths.map(month => {
        const monthData = monthlyData[month] || { total: 0, labor: 0, materials: 0, other: 0 };
        return {
          month,
          total: Math.round(monthData.total * 100) / 100,
          labor: Math.round(monthData.labor * 100) / 100,
          materials: Math.round(monthData.materials * 100) / 100,
        };
      });
    },
    enabled: !!projectId && !!project?.start_date,
  });

  return data || [];
};