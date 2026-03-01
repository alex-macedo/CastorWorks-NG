import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isWithinInterval } from 'date-fns';

export type TimePeriod = 'month' | 'quarter' | 'year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeForPeriod(period: TimePeriod): DateRange {
  const now = new Date();
  
  switch (period) {
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'quarter':
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now)
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now)
      };
    case 'all':
      return {
        start: new Date(2000, 0, 1),
        end: now
      };
  }
}

export function filterByDateRange<T extends { created_at?: string | null; date?: string | null }>(
  items: T[],
  dateRange: DateRange
): T[] {
  return items.filter(item => {
    const itemDate = item.date || item.created_at;
    if (!itemDate) return false;
    
    const date = new Date(itemDate);
    return isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
  });
}

export function calculateTrend(current: number, previous: number): {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) {
    return { value: current, percentage: 0, direction: 'neutral' };
  }
  
  const difference = current - previous;
  const percentage = (difference / previous) * 100;
  const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral';
  
  return { value: difference, percentage, direction };
}

export function groupByMonth<T extends { created_at?: string | null; date?: string | null; amount?: number | string | null }>(
  items: T[],
  valueKey: keyof T = 'amount' as keyof T
): Array<{ month: string; value: number }> {
  const monthMap = new Map<string, number>();

  items.forEach(item => {
    const itemDate = item.date || item.created_at;
    if (!itemDate) return;

    const date = new Date(itemDate);
    // Use system locale for month formatting instead of hardcoded 'en-US'
    const locale = navigator.language || 'en-US';
    const monthKey = date.toLocaleString(locale, { month: 'short', year: 'numeric' });

    const value = Number(item[valueKey] || 0);
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + value);
  });

  return Array.from(monthMap.entries())
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
}
