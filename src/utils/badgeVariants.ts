/**
 * Converts a status string (snake_case from DB) to a common translation key (camelCase).
 * Uses nsSeparator so t() resolves to root-level key in common namespace.
 * e.g. "on_hold" -> "common:onHold", "not_started" -> "common:notStarted"
 */
export function getStatusTranslationKey(status: string | null | undefined): string {
  if (!status) return 'common:pending';
  const camelCaseStatus = status.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return `common:${camelCaseStatus}`;
}

export function getScheduleStatusTranslationKey(status: string | null | undefined): string {
  if (!status) return 'common:scheduleStatus.notStarted'

  const normalized = status.toLowerCase().replace(/-/g, '_')
  switch (normalized) {
    case 'not_started':
      return 'common:scheduleStatus.notStarted'
    case 'on_schedule':
      return 'common:scheduleStatus.onSchedule'
    case 'at_risk':
      return 'common:scheduleStatus.atRisk'
    case 'delayed':
      return 'common:scheduleStatus.delayed'
    default:
      return 'common:scheduleStatus.notStarted'
  }
}

/**
 * Maps project/status strings to Badge variant names
 * Used for consistent status badge styling across the application
 */
export function getStatusBadgeVariant(status: string | null | undefined): 
  | "default" 
  | "secondary" 
  | "destructive" 
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "active"
  | "paused"
  | "delayed"
  | "completed"
  | "on-hold" {
  if (!status) return 'default';
  
  const normalizedStatus = status.toLowerCase().replace(/[_-]/g, '-');
  
  switch (normalizedStatus) {
    case 'on-schedule':
    case 'on_schedule':
    case 'on-track':
    case 'on_track':
      return 'success';
    case 'active':
    case 'in-progress':
    case 'in_progress':
      return 'active';
    case 'not-started':
    case 'not_started':
      return 'info';
    case 'paused':
    case 'on-hold':
    case 'on_hold':
      return 'paused';
    case 'delayed':
      return 'destructive';
    case 'at-risk':
    case 'at_risk':
      return 'delayed';
    case 'completed':
    case 'finished':
      return 'completed';
    case 'pending':
    case 'waiting':
      return 'info';
    default:
      return 'default';
  }
}
