import { addDays, differenceInDays, isWeekend, format } from "date-fns";
import {
  calculateEndDateByWorkingDays as _calculateEndDateByWorkingDays,
  countWorkingDays as _countWorkingDays,
  getNextWorkingDay as _getNextWorkingDay
} from "./workingDayCalculators";

export interface Activity {
  id?: string;
  sequence: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  completion_date?: string | null;
  completion_percentage: number;
  days_for_activity: number;
  status?: string | null;
  // Offset-based template support (workday offsets from project start)
  startOffset?: number;
  endOffset?: number;
  duration?: number;
  isMilestone?: boolean;
}

/**
 * Calculate end date based on start date and duration using calendar days
 * The start date counts as day 1, so end_date = start_date + (duration - 1)
 *
 * For working day calculations, use calculateEndDateWithWorkingDays instead
 */
export function calculateEndDate(startDate: Date, durationDays: number, skipWeekends = false): Date {
  // Use simple calendar day calculation: subtract 1 because start date is day 1
  return addDays(startDate, durationDays - 1);
}

/**
 * Validate that activity duration matches the formula: (endOffset - startOffset) + 1
 * Returns warning message if mismatch detected, null if valid
 */
export function validateActivityDuration(activity: Activity): string | null {
  if (activity.startOffset !== undefined && activity.endOffset !== undefined && activity.duration !== undefined) {
    const expectedDuration = (activity.endOffset - activity.startOffset) + 1;
    if (activity.duration !== expectedDuration) {
      return `Activity "${activity.name}" duration (${activity.duration}) does not match formula: (endOffset ${activity.endOffset} - startOffset ${activity.startOffset}) + 1 = ${expectedDuration}`;
    }
  }
  return null;
}

/**
 * Add N workdays to a date, skipping weekends
 * @param startDate - Starting date
 * @param workdays - Number of workdays to add
 * @returns Date after N workdays
 */
function addWorkdays(startDate: Date, workdays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < workdays) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Calculate end date using working days (async version)
 * Requires project calendar configuration
 *
 * @param projectId - Project UUID
 * @param startDate - Start date
 * @param workingDays - Number of working days
 * @returns Promise<Date> - End date after N working days
 */
export async function calculateEndDateWithWorkingDays(
  projectId: string,
  startDate: Date | string,
  workingDays: number
): Promise<Date> {
  return await _calculateEndDateByWorkingDays(projectId, startDate, workingDays);
}

/**
 * Count working days between two dates (async version)
 * Requires project calendar configuration
 *
 * @param projectId - Project UUID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Promise<number> - Number of working days
 */
export async function countWorkingDaysBetween(
  projectId: string,
  startDate: Date | string,
  endDate: Date | string
): Promise<number> {
  return await _countWorkingDays(projectId, startDate, endDate);
}

/**
 * Get next working day after a given date (async version)
 * Requires project calendar configuration
 *
 * @param projectId - Project UUID
 * @param date - Date to start from
 * @returns Promise<Date> - Next working day
 */
export async function getNextWorkingDayForProject(
  projectId: string,
  date: Date | string
): Promise<Date> {
  return await _getNextWorkingDay(projectId, date);
}

/**
 * Auto-schedule all activities sequentially from project start date
 * Supports two modes:
 * 1. Offset-based: Activities specify startOffset/endOffset as workday offsets from project start
 * 2. Duration-based (legacy): Activities use days_for_activity for sequential scheduling
 *
 * @param activities - Array of activities to schedule
 * @param projectStartDate - Project start date
 * @param skipWeekends - Whether to skip weekends (default: true)
 * @returns Activities with calculated start_date and end_date
 */
export function calculateActivityDates(
  activities: Activity[],
  projectStartDate: Date,
  skipWeekends = true
): Activity[] {
  const sortedActivities = [...activities].sort((a, b) => a.sequence - b.sequence);
  
  // Detect mode: offset-based if first activity has startOffset field
  const isOffsetMode = sortedActivities.length > 0 && sortedActivities[0].startOffset !== undefined;

  if (isOffsetMode) {
    // Offset-based mode: Calculate dates from project start using workday offsets
    return sortedActivities.map((activity) => {
      // Validate duration formula
      const validationWarning = validateActivityDuration(activity);
      if (validationWarning) {
        console.warn(validationWarning);
      }

      // Calculate start date: project start + startOffset workdays
      let startDate = new Date(projectStartDate);
      if (activity.startOffset && activity.startOffset > 0) {
        startDate = addWorkdays(projectStartDate, activity.startOffset);
      }

      // Calculate end date: project start + endOffset workdays
      let endDate = new Date(projectStartDate);
      if (activity.endOffset && activity.endOffset > 0) {
        endDate = addWorkdays(projectStartDate, activity.endOffset);
      }

      // Detect milestone (startOffset === endOffset)
      const isMilestone = activity.startOffset === activity.endOffset;

      return {
        ...activity,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        isMilestone: isMilestone,
        days_for_activity: activity.duration || activity.days_for_activity,
      };
    });
  } else {
    // Duration-based mode (legacy): Sequential scheduling using days_for_activity
    let currentDate = new Date(projectStartDate);

    return sortedActivities.map((activity) => {
      // Skip weekends for start date if applicable
      if (skipWeekends) {
        while (isWeekend(currentDate)) {
          currentDate = addDays(currentDate, 1);
        }
      }

      const startDate = format(currentDate, "yyyy-MM-dd");
      const endDate = format(
        calculateEndDate(currentDate, activity.days_for_activity, skipWeekends),
        "yyyy-MM-dd"
      );

      // Next activity starts the day after this one ends
      currentDate = addDays(
        calculateEndDate(currentDate, activity.days_for_activity, skipWeekends),
        1
      );

      return {
        ...activity,
        start_date: startDate,
        end_date: endDate,
      };
    });
  }
}

/**
 * Determine activity status based on dates and completion
 */
export function getActivityStatus(activity: Activity): "completed" | "delayed" | "in_progress" | "not_started" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activity.completion_percentage === 100) {
    return "completed";
  }

  if (activity.status === 'in_progress') {
    return "in_progress";
  }

  if (!activity.start_date) {
    return "not_started";
  }

  const startDate = new Date(activity.start_date);
  startDate.setHours(0, 0, 0, 0);

  if (startDate > today) {
    return "not_started";
  }

  if (activity.end_date) {
    const endDate = new Date(activity.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < today && activity.completion_percentage < 100) {
      return "delayed";
    }
  }

  return "in_progress";
}

/**
 * Calculate overall project completion percentage (weighted by activity duration)
 */
export function calculateOverallProgress(activities: Activity[]): number {
  if (activities.length === 0) return 0;

  // Filter out parent activities to avoid double counting weighted progress
  const leafActivities = activities.filter(a => {
    // An activity is a leaf if no other activity has it as a phase_id (parent)
    return !activities.some(other => (other as any).phase_id === a.id);
  });

  const targetActivities = leafActivities.length > 0 ? leafActivities : activities;

  const totalDays = targetActivities.reduce((sum, a) => sum + a.days_for_activity, 0);
  const weightedCompletion = targetActivities.reduce(
    (sum, a) => {
      // Give a tiny bit of progress (1%) if it's explicitly marked as in_progress 
      // but completion is still 0, to show movement in the UI cards
      const effectiveProgress = (a.completion_percentage === 0 && a.status === 'in_progress') 
        ? 1 
        : a.completion_percentage;
      return sum + (effectiveProgress * a.days_for_activity) / 100;
    },
    0
  );

  return totalDays > 0 ? Math.round((weightedCompletion / totalDays) * 100) : 0;
}

/**
 * Calculate business days remaining until project end
 */
export function getDaysRemaining(endDate: Date, skipWeekends = true): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(endDate);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate < today) return 0;

  if (!skipWeekends) {
    return differenceInDays(targetDate, today);
  }

  let currentDate = new Date(today);
  let businessDays = 0;

  while (currentDate < targetDate) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      businessDays++;
    }
  }

  return businessDays;
}

/**
 * Calculate schedule health based on planned vs actual progress
 */
export function getScheduleHealth(
  activities: Activity[]
): { status: "on_track" | "at_risk" | "delayed"; variance: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPlannedProgress = 0;
  let totalActualProgress = 0;
  let totalDays = 0;

  activities.forEach((activity) => {
    if (!activity.start_date || !activity.end_date) return;

    const startDate = new Date(activity.start_date);
    const endDate = new Date(activity.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate && activity.status !== 'in_progress') return; // Not started yet

    const activityDuration = differenceInDays(endDate, startDate) || 1;
    const daysPassed = today < startDate ? 0 : Math.min(differenceInDays(today, startDate), activityDuration);
    const plannedProgress = Math.min((daysPassed / activityDuration) * 100, 100);

    totalPlannedProgress += plannedProgress * activity.days_for_activity;
    totalActualProgress += activity.completion_percentage * activity.days_for_activity;
    totalDays += activity.days_for_activity;
  });

  if (totalDays === 0) {
    return { status: "on_track", variance: 0 };
  }

  const avgPlanned = totalPlannedProgress / totalDays;
  const avgActual = totalActualProgress / totalDays;
  const variance = avgActual - avgPlanned;

  if (variance < -10) return { status: "delayed", variance };
  if (variance < -5) return { status: "at_risk", variance };
  return { status: "on_track", variance };
}

/**
 * Identify critical path activities (simplified version)
 * Activities with zero slack time that affect project end date
 */
export function calculateCriticalPath(activities: Activity[]): string[] {
  const sortedActivities = [...activities].sort((a, b) => a.sequence - b.sequence);
  const criticalActivityIds: string[] = [];

  sortedActivities.forEach((activity, index) => {
    if (!activity.id) return;

    // In a sequential schedule, all incomplete activities are potentially critical
    if (activity.completion_percentage < 100) {
      // Check if there are dependencies or if it's a long-duration activity
      if (activity.days_for_activity >= 10 || index < sortedActivities.length - 5) {
        criticalActivityIds.push(activity.id);
      }
    }
  });

  return criticalActivityIds;
}

/**
 * Calculate total project duration
 */
export function calculateTotalDuration(activities: Activity[]): number {
  return activities.reduce((sum, a) => sum + a.days_for_activity, 0);
}

/**
 * Get expected end date based on start date and activities
 */
export function calculateProjectEndDate(
  projectStartDate: Date,
  activities: Activity[],
  skipWeekends = true
): Date {
  const totalDays = calculateTotalDuration(activities);
  if (skipWeekends) {
    let currentDate = new Date(projectStartDate);
    let daysAdded = 0;
    
    // First day counts as day 1
    while (daysAdded < totalDays - 1) {
      currentDate = addDays(currentDate, 1);
      if (!isWeekend(currentDate)) {
        daysAdded++;
      }
    }
    return currentDate;
  }
  return calculateEndDate(projectStartDate, totalDays, skipWeekends);
}

/**
 * Calculate activity end date from start date and days_for_activity
 * This is used for client-side validation. The database trigger handles actual calculation.
 */
export function calculateActivityEndDate(startDate: string, daysForActivity: number, skipWeekends = true): string {
  const start = new Date(startDate);
  const endDate = calculateEndDate(start, daysForActivity, skipWeekends);
  return format(endDate, "yyyy-MM-dd");
}

/**
 * Sync phase dates with its activities
 * Phase start_date = first activity (sequence 1) start_date
 * Phase end_date = last activity end_date
 * Phase duration = sum of all activities' days_for_activity
 * 
 * Note: With database triggers, this is mainly for client-side preview/validation
 */
export function syncPhaseWithActivities(activities: Activity[]): {
  start_date: string | null;
  end_date: string | null;
  duration: number;
  progress_percentage: number;
} {
  if (!activities || activities.length === 0) {
    return {
      start_date: null,
      end_date: null,
      duration: 0,
      progress_percentage: 0,
    };
  }

  // Sort by sequence to find first and last
  const sortedActivities = [...activities].sort((a, b) => a.sequence - b.sequence);
  const firstActivity = sortedActivities[0];
  const lastActivity = sortedActivities[sortedActivities.length - 1];

  // Calculate total duration
  const duration = sortedActivities.reduce((sum, a) => sum + a.days_for_activity, 0);

  // Calculate weighted progress
  const totalDays = sortedActivities.reduce((sum, a) => sum + a.days_for_activity, 0);
  const weightedCompletion = sortedActivities.reduce(
    (sum, a) => sum + (a.completion_percentage * a.days_for_activity) / 100,
    0
  );
  const progress_percentage = totalDays > 0 ? Math.round((weightedCompletion / totalDays) * 100) : 0;

  return {
    start_date: firstActivity.start_date || null,
    end_date: lastActivity.end_date || null,
    duration,
    progress_percentage,
  };
}
