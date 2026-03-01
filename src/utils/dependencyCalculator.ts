interface Activity {
  id: string;
  sequence: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  days_for_activity: number;
  dependencies?: Array<{
    activityId: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
    lag: number;
  }>;
  early_start?: string | null;
  early_finish?: string | null;
  late_start?: string | null;
  late_finish?: string | null;
  float_days?: number;
  is_critical?: boolean;
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < Math.abs(days)) {
    result.setDate(result.getDate() + (days > 0 ? 1 : -1));
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

export function calculateDependencyDates(
  activities: Activity[],
  projectStartDate: Date
): Activity[] {
  const activityMap = new Map(activities.map(a => [a.id, { ...a }]));
  const calculated = new Set<string>();

  // Forward pass - calculate early start and early finish
  function calculateEarlyDates(activityId: string): void {
    if (calculated.has(activityId)) return;

    const activity = activityMap.get(activityId);
    if (!activity) return;

    let earlyStart = projectStartDate;

    // Calculate based on dependencies
    if (activity.dependencies && activity.dependencies.length > 0) {
      for (const dep of activity.dependencies) {
        // First calculate predecessor's dates
        calculateEarlyDates(dep.activityId);
        
        const predecessor = activityMap.get(dep.activityId);
        if (!predecessor) continue;

        const predStart = predecessor.early_start ? new Date(predecessor.early_start) : projectStartDate;
        const predFinish = predecessor.early_finish ? new Date(predecessor.early_finish) : 
          addBusinessDays(predStart, predecessor.days_for_activity);

        let depDate: Date;
        
        switch (dep.type) {
          case 'FS': // Finish-to-Start
            depDate = addBusinessDays(predFinish, dep.lag);
            break;
          case 'SS': // Start-to-Start
            depDate = addBusinessDays(predStart, dep.lag);
            break;
          case 'FF': // Finish-to-Finish
            depDate = addBusinessDays(predFinish, dep.lag - activity.days_for_activity);
            break;
          case 'SF': // Start-to-Finish
            depDate = addBusinessDays(predStart, dep.lag - activity.days_for_activity);
            break;
          default:
            depDate = predFinish;
        }

        if (depDate > earlyStart) {
          earlyStart = depDate;
        }
      }
    }

    const earlyFinish = addBusinessDays(earlyStart, activity.days_for_activity);
    
    activity.early_start = earlyStart.toISOString().split('T')[0];
    activity.early_finish = earlyFinish.toISOString().split('T')[0];
    activity.start_date = activity.early_start;
    activity.end_date = activity.early_finish;

    calculated.add(activityId);
  }

  // Calculate early dates for all activities
  activities.forEach(a => calculateEarlyDates(a.id));

  // Find project end date (latest early finish)
  let projectEndDate = projectStartDate;
  activityMap.forEach(activity => {
    if (activity.early_finish) {
      const finish = new Date(activity.early_finish);
      if (finish > projectEndDate) {
        projectEndDate = finish;
      }
    }
  });

  // Backward pass - calculate late start and late finish
  function calculateLateDates(activityId: string, projectEnd: Date): void {
    const activity = activityMap.get(activityId);
    if (!activity) return;

    // Find all successors (activities that depend on this one)
    const successors = Array.from(activityMap.values()).filter(
      a => a.dependencies?.some(d => d.activityId === activityId)
    );

    let lateFinish = projectEnd;

    if (successors.length > 0) {
      // Late finish is the earliest of successor's late starts
      for (const successor of successors) {
        const dep = successor.dependencies?.find(d => d.activityId === activityId);
        if (!dep) continue;

        const succLateStart = successor.late_start ? new Date(successor.late_start) : projectEnd;

        let depDate: Date;
        
        switch (dep.type) {
          case 'FS': // Finish-to-Start
            depDate = addBusinessDays(succLateStart, -dep.lag);
            break;
          case 'SS': // Start-to-Start
            depDate = addBusinessDays(succLateStart, -dep.lag + activity.days_for_activity);
            break;
          case 'FF': // Finish-to-Finish
            depDate = addBusinessDays(new Date(successor.late_finish || projectEnd), -dep.lag);
            break;
          case 'SF': // Start-to-Finish
            depDate = addBusinessDays(succLateStart, -dep.lag + activity.days_for_activity);
            break;
          default:
            depDate = succLateStart;
        }

        if (depDate < lateFinish) {
          lateFinish = depDate;
        }
      }
    }

    const lateStart = addBusinessDays(lateFinish, -activity.days_for_activity);

    activity.late_start = lateStart.toISOString().split('T')[0];
    activity.late_finish = lateFinish.toISOString().split('T')[0];
  }

  // Calculate late dates for all activities (in reverse order)
  const reversedActivities = [...activityMap.values()].reverse();
  reversedActivities.forEach(a => calculateLateDates(a.id, projectEndDate));

  // Calculate float and determine critical path
  activityMap.forEach(activity => {
    if (activity.early_start && activity.late_start) {
      const earlyStart = new Date(activity.early_start);
      const lateStart = new Date(activity.late_start);
      
      // Calculate business days between dates
      let floatDays = 0;
      const current = new Date(earlyStart);
      while (current < lateStart) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          floatDays++;
        }
      }
      
      activity.float_days = floatDays;
      activity.is_critical = floatDays === 0;
    }
  });

  return Array.from(activityMap.values()).sort((a, b) => a.sequence - b.sequence);
}

export function getDependencyLabel(type: 'FS' | 'SS' | 'FF' | 'SF', lag: number = 0): string {
  const typeLabel = type;
  const lagLabel = lag !== 0 ? ` ${lag > 0 ? '+' : ''}${lag}d` : '';
  return `${typeLabel}${lagLabel}`;
}

export function getCriticalPathActivities(activities: Activity[]): string[] {
  return activities.filter(a => a.is_critical).map(a => a.id);
}
