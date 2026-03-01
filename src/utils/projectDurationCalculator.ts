/**
 * Project Duration Calculator
 * 
 * Calculates construction duration in months from project data.
 * This is a pure function extracted for testability and to prevent regressions.
 * 
 * Priority order:
 * 1. total_duration (in days) - if available and > 0
 * 2. Calculated from start_date and end_date - if both dates are available
 * 3. Default: 1 month - if no duration information is available
 * 
 * @param project - Project object with duration information
 * @param isLoading - Whether project data is still loading
 * @returns Number of construction months (minimum 1)
 */

export interface ProjectDurationInput {
  total_duration?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  name?: string | null;
}

export interface ProjectDurationOptions {
  isLoading?: boolean;
  projectId?: string;
}

/**
 * Calculate construction months from project duration data
 * 
 * @param project - Project data with duration fields
 * @param options - Additional options (isLoading, projectId for logging)
 * @returns Number of construction months (minimum 1)
 */
export function calculateConstructionMonths(
  project: ProjectDurationInput | null | undefined,
  options: ProjectDurationOptions = {}
): number {
  const { isLoading = false, projectId } = options;

  // If project is still loading, return 0 to indicate duration is not yet known
  if (isLoading) {
    console.log('[calculateConstructionMonths] Project data still loading, returning 0');
    return 0;
  }

  // If no project data, default to 1 month
  if (!project) {
    console.warn('[calculateConstructionMonths] No project data after load, defaulting to 1 month', {
      projectId
    });
    return 1;
  }

  // Priority 1: Use total_duration (in days) if available
  if (project.total_duration && project.total_duration > 0) {
    const months = Math.max(1, Math.ceil(project.total_duration / 30));
    console.log('[calculateConstructionMonths] Using total_duration', {
      total_duration: project.total_duration,
      calculatedMonths: months,
      projectId
    });
    return months;
  }

  // Priority 2: Calculate from start_date and end_date if available
  if (project.start_date && project.end_date) {
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('[calculateConstructionMonths] Invalid dates, defaulting to 1 month', {
        start_date: project.start_date,
        end_date: project.end_date,
        projectId
      });
      return 1;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
    const months = Math.max(1, Math.ceil(diffDays / 30));
    
    console.log('[calculateConstructionMonths] Using start_date/end_date', {
      start_date: project.start_date,
      end_date: project.end_date,
      diffDays,
      calculatedMonths: months,
      projectId
    });
    return months;
  }

  // Fallback: default to 1 month
  console.warn('[calculateConstructionMonths] No duration data found, defaulting to 1 month', {
    hasTotalDuration: !!project.total_duration,
    hasStartDate: !!project.start_date,
    hasEndDate: !!project.end_date,
    projectName: project.name,
    projectId
  });
  return 1;
}
