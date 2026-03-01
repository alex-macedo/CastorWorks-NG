import { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  projectId?: string;
  projectName?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function generateBudgetAlerts(
  projects: Project[],
  budgetAnalysis: Map<string, { spent: number; budget: number }>
): Alert[] {
  const alerts: Alert[] = [];
  
  projects.forEach(project => {
    const analysis = budgetAnalysis.get(project.id);
    if (!analysis) return;
    
    const percentUsed = analysis.budget > 0 ? (analysis.spent / analysis.budget) * 100 : 0;
    
    if (percentUsed > 100) {
      alerts.push({
        id: `budget-over-${project.id}`,
        type: 'error',
        title: 'Budget Exceeded',
        message: `${project.name} is ${(percentUsed - 100).toFixed(1)}% over budget`,
        projectId: project.id,
        projectName: project.name || '',
        action: {
          label: 'View Project',
          href: `/project/${project.id}`
        }
      });
    } else if (percentUsed > 90) {
      alerts.push({
        id: `budget-warning-${project.id}`,
        type: 'warning',
        title: 'Budget Alert',
        message: `${project.name} has used ${percentUsed.toFixed(1)}% of budget`,
        projectId: project.id,
        projectName: project.name || '',
        action: {
          label: 'View Project',
          href: `/project/${project.id}`
        }
      });
    }
  });
  
  return alerts;
}

export function generateScheduleAlerts(projects: Project[]): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  
  projects.forEach(project => {
    if (!project.end_date) return;
    
    const endDate = new Date(project.end_date);
    const progress = Number((project as any).avg_progress || 0);
    
    // Calculate expected progress based on timeline
    const startDate = project.start_date ? new Date(project.start_date) : today;
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
    
    if (progress < expectedProgress - 15) {
      const daysBehind = Math.round(((expectedProgress - progress) / 100) * totalDays);
      alerts.push({
        id: `schedule-${project.id}`,
        type: 'warning',
        title: 'Schedule Delay',
        message: `${project.name} is approximately ${daysBehind} days behind schedule`,
        projectId: project.id,
        projectName: project.name || '',
        action: {
          label: 'View Schedule',
          href: `/schedule/${project.id}`
        }
      });
    }
  });
  
  return alerts;
}

export function generateDataQualityAlerts(projects: Project[]): Alert[] {
  const alerts: Alert[] = [];
  
  projects.forEach(project => {
    if (!project.budget_total || Number(project.budget_total) === 0) {
      alerts.push({
        id: `no-budget-${project.id}`,
        type: 'info',
        title: 'Missing Budget',
        message: `${project.name} has no budget defined`,
        projectId: project.id,
        projectName: project.name || '',
        action: {
          label: 'Add Budget',
          href: `/project/${project.id}`
        }
      });
    }
  });
  
  return alerts;
}

export function generateAllAlerts(
  projects: Project[],
  budgetAnalysis: Map<string, { spent: number; budget: number }>
): Alert[] {
  return [
    ...generateBudgetAlerts(projects, budgetAnalysis),
    ...generateScheduleAlerts(projects),
    ...generateDataQualityAlerts(projects)
  ].sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });
}
