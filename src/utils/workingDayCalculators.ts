/**
 * Working Day Calculation Utilities
 *
 * Provides functions to calculate working days for project scheduling,
 * considering project-specific calendars with holidays and non-working days.
 *
 * CRITICAL: These calculations must match the database trigger logic
 * in calculate_activity_end_date() to ensure consistency between
 * client-side and server-side date calculations.
 */

import { supabase } from '@/integrations/supabase/client';

// Cache for project calendar data to avoid repeated queries
const calendarCache = new Map<string, {
  enabled: boolean;
  defaultWorkingDays: string[];
  nonWorkingDates: Map<string, string>; // date -> reason
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Default working days (Mon-Fri) when calendar is not enabled
 */
const DEFAULT_WORKING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

/**
 * Day name mapping
 */
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Get project calendar configuration
 * @param projectId - Project UUID
 * @returns Calendar configuration with enabled flag, working days, and non-working dates
 */
async function getProjectCalendarConfig(projectId: string) {
  // Check cache first
  const cached = calendarCache.get(projectId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached;
  }

  try {
    // Query project calendar settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('calendar_enabled, calendar_default_working_days')
      .eq('id', projectId)
      .single() as any;

    if (projectError) {
      console.error('Error fetching project calendar settings:', projectError);
      // Fall back to disabled calendar
      return {
        enabled: false,
        defaultWorkingDays: DEFAULT_WORKING_DAYS,
        nonWorkingDates: new Map(),
        timestamp: Date.now()
      };
    }

    // Parse default working days
    const defaultWorkingDays = project.calendar_default_working_days
      ? project.calendar_default_working_days.split(',').map((d: string) => d.trim().toLowerCase())
      : DEFAULT_WORKING_DAYS;

    // If calendar not enabled, return early
    if (!project.calendar_enabled) {
      const config = {
        enabled: false,
        defaultWorkingDays,
        nonWorkingDates: new Map(),
        timestamp: Date.now()
      };
      calendarCache.set(projectId, config);
      return config;
    }

    // Query non-working dates from project_calendar table
    const { data: calendarEntries, error: calendarError } = await supabase
      .from('project_calendar')
      .select('calendar_date, is_working_day, reason')
      .eq('project_id', projectId) as any;

    if (calendarError) {
      console.error('Error fetching project calendar entries:', calendarError);
    }

    // Build non-working dates map
    const nonWorkingDates = new Map<string, string>();
    if (calendarEntries) {
      for (const entry of calendarEntries) {
        if (!entry.is_working_day) {
          nonWorkingDates.set(entry.calendar_date, entry.reason || 'Non-working day');
        }
      }
    }

    const config = {
      enabled: project.calendar_enabled,
      defaultWorkingDays,
      nonWorkingDates,
      timestamp: Date.now()
    };

    calendarCache.set(projectId, config);
    return config;
  } catch (error) {
    console.error('Error in getProjectCalendarConfig:', error);
    // Fall back to disabled calendar
    return {
      enabled: false,
      defaultWorkingDays: DEFAULT_WORKING_DAYS,
      nonWorkingDates: new Map(),
      timestamp: Date.now()
    };
  }
}

/**
 * Clear calendar cache for a specific project or all projects
 * @param projectId - Optional project UUID to clear specific cache
 */
export function clearCalendarCache(projectId?: string) {
  if (projectId) {
    calendarCache.delete(projectId);
  } else {
    calendarCache.clear();
  }
}

/**
 * Format date as YYYY-MM-DD string
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string or Date object to Date
 * @param date - Date string (YYYY-MM-DD) or Date object
 * @returns Date object
 */
function parseDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
}

/**
 * Check if a specific date is a working day for the project
 *
 * @param projectId - Project UUID
 * @param date - Date to check (Date object or YYYY-MM-DD string)
 * @returns Promise<boolean> - True if working day, false otherwise
 */
export async function isWorkingDay(
  projectId: string,
  date: Date | string
): Promise<boolean> {
  const config = await getProjectCalendarConfig(projectId);
  const checkDate = parseDate(date);
  const dateStr = formatDate(checkDate);

  // If calendar not enabled, use default Mon-Fri logic
  if (!config.enabled) {
    const dayOfWeek = checkDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    return config.defaultWorkingDays.includes(dayName);
  }

  // Check if date is explicitly marked as non-working
  if (config.nonWorkingDates.has(dateStr)) {
    return false;
  }

  // Check against default working days pattern
  const dayOfWeek = checkDate.getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  return config.defaultWorkingDays.includes(dayName);
}

/**
 * Get the next working day after a given date
 *
 * @param projectId - Project UUID
 * @param date - Starting date (Date object or YYYY-MM-DD string)
 * @returns Promise<Date> - Next working day
 */
export async function getNextWorkingDay(
  projectId: string,
  date: Date | string
): Promise<Date> {
  const currentDate = new Date(parseDate(date));
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  // Limit search to 365 days to prevent infinite loops
  for (let i = 0; i < 365; i++) {
    if (await isWorkingDay(projectId, currentDate)) {
      return currentDate;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  throw new Error('Could not find next working day within 365 days');
}

/**
 * Get the previous working day before a given date
 *
 * @param projectId - Project UUID
 * @param date - Starting date (Date object or YYYY-MM-DD string)
 * @returns Promise<Date> - Previous working day
 */
export async function getPreviousWorkingDay(
  projectId: string,
  date: Date | string
): Promise<Date> {
  const currentDate = new Date(parseDate(date));
  currentDate.setDate(currentDate.getDate() - 1); // Start from previous day

  // Limit search to 365 days to prevent infinite loops
  for (let i = 0; i < 365; i++) {
    if (await isWorkingDay(projectId, currentDate)) {
      return currentDate;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  throw new Error('Could not find previous working day within 365 days');
}

/**
 * Count working days between two dates (inclusive of start, exclusive of end)
 *
 * @param projectId - Project UUID
 * @param startDate - Start date (Date object or YYYY-MM-DD string)
 * @param endDate - End date (Date object or YYYY-MM-DD string)
 * @returns Promise<number> - Number of working days
 */
export async function countWorkingDays(
  projectId: string,
  startDate: Date | string,
  endDate: Date | string
): Promise<number> {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  let count = 0;
  const currentDate = new Date(start);

  while (currentDate < end) {
    if (await isWorkingDay(projectId, currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

/**
 * Calculate end date given start date and number of working days
 *
 * CRITICAL: This function must produce identical results to the database
 * trigger calculate_activity_end_date() to ensure consistency.
 *
 * Algorithm:
 * 1. Start from the given start date
 * 2. Count only working days
 * 3. Stop when we've counted N working days
 * 4. Return the end date
 *
 * @param projectId - Project UUID
 * @param startDate - Start date (Date object or YYYY-MM-DD string)
 * @param workingDays - Number of working days to count
 * @returns Promise<Date> - End date after N working days
 */
export async function calculateEndDateByWorkingDays(
  projectId: string,
  startDate: Date | string,
  workingDays: number
): Promise<Date> {
  if (workingDays < 0) {
    throw new Error('Working days must be non-negative');
  }

  if (workingDays === 0) {
    return parseDate(startDate);
  }

  const currentDate = new Date(parseDate(startDate));
  let daysCount = 0;

  // CRITICAL: This logic must match the database trigger
  // Count working days starting from start_date
  while (daysCount < workingDays) {
    if (await isWorkingDay(projectId, currentDate)) {
      daysCount++;
      if (daysCount === workingDays) {
        return currentDate;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);

    // Safety check to prevent infinite loops
    if (daysCount === 0 && currentDate > new Date(parseDate(startDate).getTime() + 365 * 24 * 60 * 60 * 1000)) {
      throw new Error('Could not find enough working days within 365 days');
    }
  }

  return currentDate;
}

/**
 * Get all working days between two dates
 *
 * @param projectId - Project UUID
 * @param startDate - Start date (Date object or YYYY-MM-DD string)
 * @param endDate - End date (Date object or YYYY-MM-DD string)
 * @returns Promise<Date[]> - Array of working day dates
 */
export async function getWorkingDaysInRange(
  projectId: string,
  startDate: Date | string,
  endDate: Date | string
): Promise<Date[]> {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const workingDays: Date[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    if (await isWorkingDay(projectId, currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Validate if a date is a working day and return reason if not
 *
 * @param projectId - Project UUID
 * @param date - Date to validate (Date object or YYYY-MM-DD string)
 * @returns Promise<{ isWorking: boolean; reason?: string }> - Validation result
 */
export async function validateDateIsWorkingDay(
  projectId: string,
  date: Date | string
): Promise<{ isWorking: boolean; reason?: string }> {
  const config = await getProjectCalendarConfig(projectId);
  const checkDate = parseDate(date);
  const dateStr = formatDate(checkDate);

  // If calendar not enabled, use default Mon-Fri logic
  if (!config.enabled) {
    const dayOfWeek = checkDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const isWorking = config.defaultWorkingDays.includes(dayName);

    return {
      isWorking,
      reason: isWorking ? undefined : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} is not a working day`
    };
  }

  // Check if date is explicitly marked as non-working
  if (config.nonWorkingDates.has(dateStr)) {
    return {
      isWorking: false,
      reason: config.nonWorkingDates.get(dateStr)
    };
  }

  // Check against default working days pattern
  const dayOfWeek = checkDate.getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  const isWorking = config.defaultWorkingDays.includes(dayName);

  return {
    isWorking,
    reason: isWorking ? undefined : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} is not a working day`
  };
}
