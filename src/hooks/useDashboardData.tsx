import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useProjectBudgetItems } from '@/hooks/useProjectBudgetItems';
import { getDateRangeForPeriod, filterByDateRange, calculateTrend, groupByMonth, TimePeriod } from '@/utils/dateFilters';
import { generateAllAlerts } from '@/utils/alertGenerators';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';

export interface DashboardFilters {
  period: TimePeriod;
  projectId?: string;
}

export function useDashboardData(filters: DashboardFilters) {
  const { projects: allProjects = [], isLoading: projectsLoading } = useProjects();
  const { financialEntries: allFinancialEntries = [], isLoading: entriesLoading } = useFinancialEntries();
  const { budgetItems: allBudgetItems = [] } = useProjectBudgetItems();
  
  // Calculate budget analysis per project without calling hooks in loops
  const budgetAnalysisMap = useMemo(() => {
    const map = new Map<string, { spent: number; budget: number; labor?: { spent: number; budget: number }; materials?: { spent: number; budget: number }; taxes?: { spent: number; budget: number } }>();
    
    allProjects.forEach(project => {
      // Filter entries for this project
      const projectEntries = allFinancialEntries.filter(e => e.project_id === project.id && e.entry_type === 'expense');
      const projectBudgetItems = allBudgetItems.filter(b => b.project_id === project.id);
      
      // Calculate totals
      const totalSpent = projectEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalBudget = projectBudgetItems.reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
      
      // Calculate by category
      const expensesByCategory = projectEntries.reduce((acc, entry) => {
        const category = entry.category || 'Other';
        acc[category] = (acc[category] || 0) + Number(entry.amount);
        return acc;
      }, {} as Record<string, number>);
      
      // Use partial matching for categories to support "Phase - Category" format
      const laborBudgets = projectBudgetItems.filter(b => b.category?.toLowerCase().includes('labor'));
      const materialsBudgets = projectBudgetItems.filter(b => b.category?.toLowerCase().includes('materials'));
      const taxesBudgets = projectBudgetItems.filter(b => b.category?.toLowerCase().includes('taxes') || b.category?.toLowerCase().includes('fees'));

      const laborBudget = laborBudgets.reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
      const materialsBudget = materialsBudgets.reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
      const taxesBudget = taxesBudgets.reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
      
      map.set(project.id, {
        spent: totalSpent,
        budget: totalBudget,
        labor: laborBudget > 0 ? { spent: expensesByCategory['Labor'] || 0, budget: laborBudget } : undefined,
        materials: materialsBudget > 0 ? { spent: expensesByCategory['Materials'] || 0, budget: materialsBudget } : undefined,
        taxes: taxesBudget > 0 ? { spent: expensesByCategory['Taxes & Fees'] || 0, budget: taxesBudget } : undefined
      });
    });
    
    return map;
  }, [allProjects, allFinancialEntries, allBudgetItems]);

  const dateRange = useMemo(() => getDateRangeForPeriod(filters.period), [filters.period]);

  // Filter projects
  const projects = useMemo(() => {
    let filtered = allProjects;
    if (filters.projectId) {
      filtered = filtered.filter(p => p.id === filters.projectId);
    }
    return filtered;
  }, [allProjects, filters.projectId]);

  // Filter financial entries by date and project
  const financialEntries = useMemo(() => {
    let filtered = filterByDateRange(allFinancialEntries, dateRange);
    if (filters.projectId) {
      filtered = filtered.filter(e => e.project_id === filters.projectId);
    }
    return filtered;
  }, [allFinancialEntries, dateRange, filters.projectId]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active');
    const completedProjects = projects.filter(p => p.status === 'completed');
    
    const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget_total || 0), 0);
    
    const expenses = financialEntries.filter(e => e.entry_type === 'expense');
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      activeProjects: activeProjects.length,
      totalBudget,
      totalSpent,
      budgetPercentage,
      completedProjects: completedProjects.length,
      completionRate: projects.length > 0 ? (completedProjects.length / projects.length) * 100 : 0
    };
  }, [projects, financialEntries]);

  // Budget overview by category
  const budgetByCategory = useMemo(() => {
    const categories = {
      labor: { spent: 0, budget: 0 },
      materials: { spent: 0, budget: 0 },
      taxes: { spent: 0, budget: 0 },
      other: { spent: 0, budget: 0 }
    };

    projects.forEach(project => {
      const analysis = budgetAnalysisMap.get(project.id);
      if (analysis) {
        categories.labor.spent += analysis.labor?.spent || 0;
        categories.labor.budget += analysis.labor?.budget || 0;
        categories.materials.spent += analysis.materials?.spent || 0;
        categories.materials.budget += analysis.materials?.budget || 0;
        categories.taxes.spent += analysis.taxes?.spent || 0;
        categories.taxes.budget += analysis.taxes?.budget || 0;
      }
    });

    // Calculate other as difference
    const totalCategoriesSpent = categories.labor.spent + categories.materials.spent + categories.taxes.spent;
    const totalCategoriesBudget = categories.labor.budget + categories.materials.budget + categories.taxes.budget;
    categories.other.spent = Math.max(0, kpis.totalSpent - totalCategoriesSpent);
    categories.other.budget = Math.max(0, kpis.totalBudget - totalCategoriesBudget);

    return categories;
  }, [projects, budgetAnalysisMap, kpis]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const expenses = financialEntries.filter(e => e.entry_type === 'expense');
    const monthlyData = groupByMonth(expenses);
    
    return monthlyData.map(item => ({
      month: item.month,
      total: item.value,
      labor: 0, // Would need category breakdown from entries
      materials: 0
    }));
  }, [financialEntries]);

  // Projects timeline data
  const projectsTimeline = useMemo(() => {
    const mapToTimelineStatus = (
      scheduleStatus: ReturnType<typeof getProjectScheduleStatus>
    ): 'on-track' | 'at-risk' | 'delayed' => {
      switch (scheduleStatus) {
        case 'delayed':
          return 'delayed'
        case 'at_risk':
          return 'at-risk'
        case 'not_started':
        case 'on_schedule':
        default:
          return 'on-track'
      }
    }

    return projects.map(project => {
      const analysis = budgetAnalysisMap.get(project.id);
      const budgetUsed = analysis && analysis.budget > 0 
        ? (analysis.spent / analysis.budget) * 100 
        : 0;
      const scheduleStatus = getProjectScheduleStatus(project as any)

      return {
        id: project.id,
        name: project.name || 'Unnamed Project',
        completion: Number((project as any).avg_progress || 0),
        status: mapToTimelineStatus(scheduleStatus),
        budgetUsed
      };
    });
  }, [projects, budgetAnalysisMap]);

  // Generate alerts
  const alerts = useMemo(() => {
    return generateAllAlerts(projects, budgetAnalysisMap);
  }, [projects, budgetAnalysisMap]);

  // Chart data
  const charts = useMemo(() => ({
    budgetStatus: {
      spent: kpis.totalSpent,
      remaining: Math.max(0, kpis.totalBudget - kpis.totalSpent),
      percentage: kpis.budgetPercentage
    },
    expenseByCategory: [
      { name: 'Labor', value: budgetByCategory.labor.spent, color: '#3b82f6' },
      { name: 'Materials', value: budgetByCategory.materials.spent, color: '#22c55e' },
      { name: 'Taxes', value: budgetByCategory.taxes.spent, color: '#f59e0b' },
      { name: 'Other', value: budgetByCategory.other.spent, color: '#3b82f6' }
    ].filter(item => item.value > 0),
    monthlyTrend,
    projectsTimeline
  }), [kpis, budgetByCategory, monthlyTrend, projectsTimeline]);

  return {
    kpis,
    budgetByCategory,
    charts,
    alerts,
    projects,
    budgetAnalysisMap,
    isLoading: projectsLoading || entriesLoading
  };
}
