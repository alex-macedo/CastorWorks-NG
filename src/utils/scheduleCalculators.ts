import { differenceInDays, addDays, isWeekend } from "date-fns";

/**
 * Parses a date string consistently across the application, avoiding timezone shifts.
 * Standardizes on local date interpretation for YYYY-MM-DD strings.
 */
export const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day);
};

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export const formatDateLocal = (date: Date | null | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets the next working day after a given date string.
 * Skips weekends (Saturday and Sunday) to align with calculateEndDateFromBusinessDays.
 */
export const getNextWorkDay = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  let next = addDays(date, 1);
  while (isWeekend(next)) {
    next = addDays(next, 1);
  }
  return formatDateLocal(next);
};

/**
 * Gets the previous working day before a given date string.
 */
export const getPreviousWorkDay = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  let prev = addDays(date, -1);
  while (isWeekend(prev)) {
    prev = addDays(prev, -1);
  }
  return formatDateLocal(prev);
};

/**
 * Ensures a date falls on a working day. If weekend, adjusts to nearest work day.
 */
export const ensureWorkingDay = (dateStr: string, asStartDate = true): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  if (!isWeekend(date)) return dateStr;
  return asStartDate ? getNextWorkDay(dateStr) : getPreviousWorkDay(dateStr);
};

/**
 * Calculates inclusive duration between two dates (calendar days).
 */
export const calculateCalendarDuration = (startDate: string | Date | null, endDate: string | Date | null): number => {
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : endDate;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Calculates end date based on start date and business days duration.
 * Skips Saturday and Sunday.
 */
export const calculateEndDateFromBusinessDays = (startDate: string | Date, businessDays: number): string => {
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : startDate;
  if (!start || isNaN(start.getTime())) return "";
  if (businessDays <= 0) return formatDateLocal(start);

  let remainingDays = businessDays;
  let current = new Date(start);
  
  // If start date is a weekend, move to next Monday
  while (isWeekend(current)) {
    current = addDays(current, 1);
  }

  // Count business days
  while (remainingDays > 1) {
    current = addDays(current, 1);
    if (!isWeekend(current)) {
      remainingDays--;
    }
  }

  return formatDateLocal(current);
};

/**
 * Calculates number of business days between two dates (inclusive).
 * Skips Saturday and Sunday.
 */
export const calculateBusinessDays = (startDate: string | Date, endDate: string | Date): number => {
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : endDate;
  
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (!isWeekend(current)) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
};

/**
 * Sequentially schedules items based on an anchor start date.
 * If an item is missing dates, they are filled based on the cursor.
 */
export const scheduleItems = <T extends ScheduleItem>(items: T[], anchorStartDate: string): T[] => {
  let currentCursor = ensureWorkingDay(anchorStartDate, true);
  
  return items.map(item => {
    const rawStart = item.start_date || currentCursor;
    const startDate = ensureWorkingDay(rawStart, true);
    const duration = item.days_for_activity || item.duration || 1;
    const endDate = item.end_date ? ensureWorkingDay(item.end_date, false) : calculateEndDateFromBusinessDays(startDate, duration);
    
    currentCursor = getNextWorkDay(endDate);
    
    return {
      ...item,
      start_date: startDate,
      end_date: endDate,
      duration: duration
    };
  });
};

export interface ScheduleItem {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  duration?: number | null;
  days_for_activity?: number | null;
  completion_percentage?: number | null;
  progress_percentage?: number | null;
  status?: string | null;
  phase_id?: string | null;
  parent_id?: string | null;
}

/**
 * Aggregates child items to calculate parent summary (dates, duration, progress, status).
 */
export const calculateParentSummary = (children: ScheduleItem[]) => {
  if (!children || children.length === 0) {
    return {
      startDate: null,
      endDate: null,
      duration: 0,
      progress: 0,
      status: 'not_started'
    };
  }

  const startDates = children
    .map(c => parseLocalDate(c.start_date))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  const endDates = children
    .map(c => parseLocalDate(c.end_date))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  const minStart = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
  const maxEnd = endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null;

  // Duration is sum of activity days_for_activity
  const totalDuration = children.reduce((sum, child) => {
    return sum + (child.days_for_activity || child.duration || 0);
  }, 0);

  // Weighted progress
  let weightedProgress = 0;
  if (totalDuration > 0) {
    const totalProgressDays = children.reduce((sum, child) => {
      const progress = (child.completion_percentage !== undefined ? child.completion_percentage : child.progress_percentage) || 0;
      const duration = (child.days_for_activity || child.duration || 0);
      return sum + (progress * duration);
    }, 0);
    weightedProgress = Math.round(totalProgressDays / totalDuration);
  } else {
    // Fallback to simple average if no duration
    const totalProgress = children.reduce((sum, child) => {
      return sum + ((child.completion_percentage !== undefined ? child.completion_percentage : child.progress_percentage) || 0);
    }, 0);
    weightedProgress = Math.round(totalProgress / children.length);
  }

  // Calculate parent status based on children
  let parentStatus = 'not_started';
  const allCompleted = children.every(c => (c.completion_percentage !== undefined ? c.completion_percentage : c.progress_percentage) === 100);
  const anyInProgress = children.some(c => {
    const progress = (c.completion_percentage !== undefined ? c.completion_percentage : c.progress_percentage) || 0;
    return (progress > 0 && progress < 100) || c.status === 'in_progress';
  });
  // Phase has started if any task has progress or is completed (fixes phase stuck on "Not Started" when some tasks done)
  const anyStarted = children.some(c => {
    const progress = (c.completion_percentage !== undefined ? c.completion_percentage : c.progress_percentage) || 0;
    return progress > 0 || c.status === 'completed' || c.status === 'in_progress';
  });
  const anyDelayed = children.some(c => {
    const progress = (c.completion_percentage !== undefined ? c.completion_percentage : c.progress_percentage) || 0;
    const end = parseLocalDate(c.end_date);
    return end && end < new Date() && progress < 100;
  });

  if (allCompleted) parentStatus = 'completed';
  else if (anyInProgress || anyStarted) parentStatus = 'in_progress';
  else if (anyDelayed) parentStatus = 'delayed';

  return {
    startDate: minStart,
    endDate: maxEnd,
    duration: totalDuration,
    progress: weightedProgress,
    status: parentStatus
  };
};

/**
 * Main scheduling engine for CastorWorks.
 * Ensures consistent calculation of dates across List, Gantt, and Summary cards.
 */
export const performProjectScheduling = (
  projectStart: string,
  phases: any[],
  activities: any[]
) => {
  const scheduledActivities: any[] = [];
  const scheduledPhases: any[] = [];
  let phaseCursor = ensureWorkingDay(projectStart, true);

  // Sort phases by order
  const sortedPhases = [...phases].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  sortedPhases.forEach((phase, phaseIndex) => {
    // Only root-level activities for this phase
    const phaseRootActivities = activities
      .filter(a => a.phase_id === phase.id)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    // Force sequential scheduling: all phases use working-day-adjusted cursor (project start or next work day after prior phase)
    const initialAnchor = phaseCursor;

    const scheduleRecursive = (items: any[], allItems: any[], anchorDate: string, isFirstPhaseRoot: boolean): any[] => {
      let cursor = ensureWorkingDay(anchorDate, true);
      const scheduled: any[] = [];
      
      items.forEach((item, itemIdx) => {
        // Force first activity of first phase to start on anchor
        const rawStart = (isFirstPhaseRoot && itemIdx === 0) ? cursor : (item.start_date || cursor);
        const start = ensureWorkingDay(rawStart, true);
        const duration = item.days_for_activity || item.duration || (item as any).duration_days || 1;
        
        const children = allItems.filter(a => a.phase_id === item.id);
        let finalEnd: string | null;
        
        if (children.length > 0) {
          const scheduledChildren = scheduleRecursive(
            children.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
            allItems,
            start,
            false
          );
          const summary = calculateParentSummary(scheduledChildren);
          finalEnd = summary.endDate ? formatDateLocal(summary.endDate) : (item.end_date ? ensureWorkingDay(item.end_date, false) : calculateEndDateFromBusinessDays(start, duration));
          
          const scheduledParent = {
            ...item,
            start_date: start,
            end_date: finalEnd,
            duration: calculateBusinessDays(start, finalEnd),
            status: item.status
          };
          scheduled.push(scheduledParent);
          scheduled.push(...scheduledChildren);
        } else {
          finalEnd = item.end_date ? ensureWorkingDay(item.end_date, false) : calculateEndDateFromBusinessDays(start, duration);
          scheduled.push({
            ...item,
            start_date: start,
            end_date: finalEnd,
            duration: duration,
            status: item.status
          });
        }
        
        cursor = getNextWorkDay(finalEnd);
      });
      
      return scheduled;
    };

    const scheduledPhaseActivities = scheduleRecursive(phaseRootActivities, activities, initialAnchor, phaseIndex === 0);
    scheduledActivities.push(...scheduledPhaseActivities);
    
    const phaseSummary = calculateParentSummary(scheduledPhaseActivities);
    const fallbackStart = phase.start_date ? ensureWorkingDay(phase.start_date, true) : phaseCursor;
    const pStart = (phaseIndex === 0 && !phase.start_date) 
      ? (phaseSummary.startDate ? formatDateLocal(phaseSummary.startDate) : initialAnchor)
      : (phaseSummary.startDate ? formatDateLocal(phaseSummary.startDate) : fallbackStart);
    const pEnd = phaseSummary.endDate ? formatDateLocal(phaseSummary.endDate) : calculateEndDateFromBusinessDays(pStart, phase.duration || 1);
    
    scheduledPhases.push({
      ...phase,
      start_date: pStart,
      end_date: pEnd,
      duration: phaseSummary.duration || phase.duration || 1,
      // When phase has child activities, derive progress/status from children; otherwise use stored values
      progress_percentage: scheduledPhaseActivities.length > 0
        ? phaseSummary.progress
        : (phase.progress_percentage ?? 0),
      status: scheduledPhaseActivities.length > 0
        ? (phaseSummary.status || phase.status)
        : (phase.status ?? phaseSummary.status)
    });
    
    phaseCursor = getNextWorkDay(pEnd);
  });

  // Handle unassigned activities (sequential at the end)
  const assignedIds = new Set(scheduledActivities.map(a => a.id));
  const unassigned = activities.filter(a => !assignedIds.has(a.id));
  if (unassigned.length > 0) {
    const scheduledUnassigned = scheduleItems(unassigned, phaseCursor || ensureWorkingDay(projectStart, true));
    scheduledActivities.push(...scheduledUnassigned);
  }

  return { phases: scheduledPhases, activities: scheduledActivities };
};

/**
 * Calculates status for a schedule item based on current date, progress, and date range.
 */
export const calculateScheduleStatus = (item: ScheduleItem): 'completed' | 'in_progress' | 'not_started' | 'delayed' | 'at_risk' => {
  const now = new Date();
  const progress = (item.completion_percentage !== undefined ? item.completion_percentage : item.progress_percentage) || 0;
  const startDate = parseLocalDate(item.start_date);
  const endDate = parseLocalDate(item.end_date);

  if (progress === 100) {
    return 'completed';
  }
  
  if (endDate && endDate < now && progress < 100) {
    return 'delayed';
  }

  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    
    if (progress > 0 && expectedProgress > progress + 20) {
      return 'at_risk';
    }
    if (progress > 0 || (startDate <= now && now <= endDate)) {
      return 'in_progress';
    }
  } else if (progress > 0) {
    return 'in_progress';
  }

  return 'not_started';
};

