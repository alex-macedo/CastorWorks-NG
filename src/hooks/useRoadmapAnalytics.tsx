import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, eachWeekOfInterval, format, differenceInDays } from 'date-fns';

export const useRoadmapAnalytics = () => {
  return useQuery({
    queryKey: ['roadmap_analytics'],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate metrics
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      // Features delivered per week
      const completedItems = items?.filter(item => item.status === 'done' && item.completed_at) || [];
      const recentCompleted = completedItems.filter(item => new Date(item.completed_at!) >= threeMonthsAgo);

      const weeklyData = calculateWeeklyDelivery(recentCompleted, threeMonthsAgo, now);

      // Average time from backlog to done
      const averageCompletionTime = calculateAverageCompletionTime(completedItems);

      // Category breakdown
      const categoryBreakdown = calculateCategoryBreakdown(items || []);

      // Status distribution
      const statusDistribution = calculateStatusDistribution(items || []);

      // Priority breakdown
      const priorityBreakdown = calculatePriorityBreakdown(items || []);

      // Effort breakdown
      const effortBreakdown = calculateEffortBreakdown(items || []);

      // Velocity trend (items completed per week over time)
      const velocityTrend = calculateVelocityTrend(completedItems, threeMonthsAgo, now);

      return {
        totalItems: items?.length || 0,
        completedItems: completedItems.length,
        inProgressItems: items?.filter(i => i.status === 'in_progress').length || 0,
        backlogItems: items?.filter(i => i.status === 'backlog').length || 0,
        averageCompletionTime,
        weeklyData,
        categoryBreakdown,
        statusDistribution,
        priorityBreakdown,
        effortBreakdown,
        velocityTrend,
      };
    },
  });
};

function calculateWeeklyDelivery(items: any[], startDate: Date, endDate: Date) {
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
  
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const count = items.filter(item => {
      const completedDate = new Date(item.completed_at!);
      return completedDate >= weekStart && completedDate <= weekEnd;
    }).length;

    return {
      week: format(weekStart, 'MMM dd'),
      count,
      weekStart: weekStart.toISOString(),
    };
  });
}

function calculateAverageCompletionTime(completedItems: any[]) {
  if (completedItems.length === 0) return 0;

  const times = completedItems
    .filter(item => item.completed_at && item.created_at)
    .map(item => {
      const created = new Date(item.created_at);
      const completed = new Date(item.completed_at!);
      return differenceInDays(completed, created);
    });

  if (times.length === 0) return 0;

  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
}

function calculateCategoryBreakdown(items: any[]) {
  const breakdown: Record<string, number> = {};
  
  items.forEach(item => {
    breakdown[item.category] = (breakdown[item.category] || 0) + 1;
  });

  return Object.entries(breakdown).map(([name, value]) => ({
    name,
    value,
  }));
}

function calculateStatusDistribution(items: any[]) {
  const distribution: Record<string, number> = {};
  
  items.forEach(item => {
    distribution[item.status] = (distribution[item.status] || 0) + 1;
  });

  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
  }));
}

function calculatePriorityBreakdown(items: any[]) {
  const breakdown: Record<string, number> = {};
  
  items.forEach(item => {
    breakdown[item.priority] = (breakdown[item.priority] || 0) + 1;
  });

  return Object.entries(breakdown).map(([name, value]) => ({
    name,
    value,
  }));
}

function calculateEffortBreakdown(items: any[]) {
  const breakdown: Record<string, number> = {};
  
  items.forEach(item => {
    breakdown[item.estimated_effort] = (breakdown[item.estimated_effort] || 0) + 1;
  });

  return Object.entries(breakdown).map(([name, value]) => ({
    name,
    value,
  }));
}

function calculateVelocityTrend(completedItems: any[], startDate: Date, endDate: Date) {
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
  
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const count = completedItems.filter(item => {
      const completedDate = new Date(item.completed_at!);
      return completedDate >= weekStart && completedDate <= weekEnd;
    }).length;

    return {
      week: format(weekStart, 'MMM dd'),
      velocity: count,
    };
  });
}
