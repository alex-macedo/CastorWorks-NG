export type ProjectScheduleStatus = 'not_started' | 'on_schedule' | 'at_risk' | 'delayed'

// Centralized schedule status is always enabled.
export const useCentralScheduleStatus = true

const SCHEDULE_STATUSES: ProjectScheduleStatus[] = [
  'not_started',
  'on_schedule',
  'at_risk',
  'delayed',
]

export const isProjectScheduleStatus = (value: unknown): value is ProjectScheduleStatus =>
  typeof value === 'string' && SCHEDULE_STATUSES.includes(value as ProjectScheduleStatus)

export const getProjectScheduleStatus = (project: {
  schedule_status?: string | null
  scheduleStatus?: string | null
  status?: string | null
}): ProjectScheduleStatus => {
  if (isProjectScheduleStatus(project.schedule_status)) {
    return project.schedule_status
  }

  if (isProjectScheduleStatus(project.scheduleStatus)) {
    return project.scheduleStatus
  }

  return 'not_started'
}
