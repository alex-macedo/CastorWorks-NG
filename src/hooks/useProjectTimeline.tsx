import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import type { ProjectTimelineData, PhaseTimelineData, TimelineStatus } from '@/types/timeline'
import { getProjectScheduleStatus, useCentralScheduleStatus } from '@/types/projectScheduleStatus'

/**
 * Custom hook to fetch and manage project timeline data
 * @param projectId - Optional project ID to filter by single project
 * @returns Timeline data with phases, milestones, and interval calculations
 */
export const useProjectTimeline = (projectId?: string) => {
  // Fetch timeline data for a single project or all projects
  const { data: timelineData, isLoading, error, refetch } = useQuery({
    queryKey: ['project-timeline', projectId],
    queryFn: async () => {
      const buildQuery = (includeEnhancedFields: boolean, includeAutoCascade: boolean) => {
        const phaseFields = includeEnhancedFields
          ? `
            id,
            phase_name,
            start_date,
            end_date,
            adjusted_end_date,
            completion_date,
            status,
            progress_percentage,
            is_milestone,
            budget_allocated,
            sort_order
          `
          : `
            id,
            phase_name,
            start_date,
            end_date,
            status,
            progress_percentage,
            budget_allocated,
            sort_order
          `

        const projectFields = includeAutoCascade
          ? `
            id,
            name,
            start_date,
            end_date,
            status,
            schedule_status,
            auto_cascade
          `
          : `
            id,
            name,
            start_date,
            end_date,
            status,
            schedule_status
          `

        let query = supabase
          .from('projects')
          .select(`
            ${projectFields},
            project_phases!project_phases_project_id_fkey (
              ${phaseFields}
            )
          `)
          .order('created_at', { ascending: false })

        if (projectId) {
          query = query.eq('id', projectId)
        }

        return query
      }

      const attempts = [
        { includeEnhancedFields: true, includeAutoCascade: true },
        { includeEnhancedFields: true, includeAutoCascade: false },
        { includeEnhancedFields: false, includeAutoCascade: false },
      ]

      let data: Awaited<ReturnType<typeof buildQuery>>['data'] = null
      let lastError: unknown = null

      for (const attempt of attempts) {
        const result = await buildQuery(attempt.includeEnhancedFields, attempt.includeAutoCascade)
        if (!result.error) {
          data = result.data
          lastError = null
          break
        }

        lastError = result.error
      }

      if (lastError) {
        throw toTimelineError(lastError, 'Failed to load timeline data')
      }

      // Transform to ProjectTimelineData format with interval calculations
      const transformedData = data?.map(project => {
        const phases = project.project_phases
          ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(phase => {
            const plannedEnd = phase.end_date ? new Date(phase.end_date) : new Date()
            const adjustedEnd = phase.adjusted_end_date ? new Date(phase.adjusted_end_date) : null
            const actualEnd = phase.completion_date ? new Date(phase.completion_date) : null

            // Calculate interval: positive = ahead, negative = behind
            const interval = actualEnd
              ? differenceInCalendarDays(plannedEnd, actualEnd)
              : adjustedEnd
                ? differenceInCalendarDays(plannedEnd, adjustedEnd)
                : 0

            return {
              id: phase.id,
              projectId: project.id,
              phaseName: phase.phase_name,
              startDate: phase.start_date ? new Date(phase.start_date) : new Date(),
              plannedEndDate: plannedEnd,
              actualEndDate: actualEnd,
              adjustedForecast: adjustedEnd,
              status: mapPhaseStatus(phase.status, phase.progress_percentage, interval),
              progress: phase.progress_percentage || 0,
              isMilestone: phase.is_milestone || false,
              budgetAllocated: phase.budget_allocated || 0,
              budgetSpent: 0, // Will be populated from project_budgets in future enhancement
              interval,
            } as PhaseTimelineData
          }) || []

        // Calculate project adjusted forecast from phases
        const phasesWithForecast = phases.filter(p => p.adjustedForecast)
        const latestForecast = phasesWithForecast.length > 0
          ? new Date(Math.max(...phasesWithForecast.map(p => p.adjustedForecast!.getTime())))
          : null

        const rawProject = project as Record<string, unknown>
        const autoCascade =
          typeof rawProject.auto_cascade === 'boolean' ? rawProject.auto_cascade : false

        return {
          id: project.id,
          name: project.name,
          startDate: project.start_date ? new Date(project.start_date) : new Date(),
          plannedEndDate: project.end_date ? new Date(project.end_date) : new Date(),
          adjustedForecast: latestForecast,
          status: mapProjectStatus(project.schedule_status, project.status),
          scheduleStatus: getProjectScheduleStatus({
            schedule_status: project.schedule_status,
            status: project.status,
          }),
          autoCascade,
          progress: calculateProjectProgress(phases),
          phases,
          milestones: [], // Populated by useMilestoneDefinitions
        } as ProjectTimelineData
      }) || []

      return transformedData
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const recalculateForecast = useCallback(
    async (options?: { projectId?: string; phaseId?: string; forceRefresh?: boolean }) => {
      const targetProjectId = options?.projectId ?? projectId
      if (!targetProjectId && !options?.phaseId) {
        throw new Error('projectId or phaseId is required to recalculate forecast')
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        'calculate-phase-forecast',
        {
          body: {
            projectId: targetProjectId,
            phaseId: options?.phaseId,
            forceRefresh: options?.forceRefresh ?? true,
          },
        }
      )

      if (invokeError) {
        throw toTimelineError(invokeError, 'Failed to recalculate timeline forecast')
      }

      await refetch()
      return data
    },
    [projectId, refetch]
  )

  return {
    timelineData,
    isLoading,
    error,
    refetch,
    recalculateForecast,
  }
}

function toTimelineError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const messageValue =
      record.message ||
      record.error ||
      record.details ||
      record.hint ||
      record.statusText

    if (typeof messageValue === 'string' && messageValue.trim().length > 0) {
      return new Error(messageValue)
    }

    try {
      return new Error(JSON.stringify(record))
    } catch {
      return new Error(fallbackMessage)
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error)
  }

  return new Error(fallbackMessage)
}

/**
 * Map database project status to TimelineStatus
 */
function mapProjectStatus(
  dbScheduleStatus: string | null | undefined,
  dbLifecycleStatus: string
): TimelineStatus {
  if (useCentralScheduleStatus) {
    const scheduleStatus = getProjectScheduleStatus({
      schedule_status: dbScheduleStatus,
      status: dbLifecycleStatus,
    })

    switch (scheduleStatus) {
      case 'not_started':
        return 'not_started'
      case 'at_risk':
        return 'at_risk'
      case 'delayed':
        return 'delayed'
      case 'on_schedule':
      default:
        return 'in_progress'
    }
  }

  const dbStatus = dbLifecycleStatus
  switch (dbStatus) {
    case 'active':
      return 'in_progress'
    case 'completed':
      return 'completed'
    case 'on_hold':
      return 'delayed'
    case 'planning':
      return 'not_started'
    case 'cancelled':
      return 'not_started'
    default:
      return 'not_started'
  }
}

/**
 * Map phase status to TimelineStatus based on progress and interval
 */
function mapPhaseStatus(
  dbStatus: string | null,
  progress: number | null,
  interval: number
): TimelineStatus {
  const progressPct = progress || 0

  // Completed
  if (progressPct === 100) return 'completed'

  // Delayed (more than 5 days behind)
  if (interval < -5) return 'delayed'

  // At risk (behind schedule but not severely)
  if (interval < 0) return 'at_risk'

  // In progress
  if (dbStatus === 'in_progress' || dbStatus === 'in-progress' || progressPct > 0) {
    return 'in_progress'
  }

  // Not started
  return 'not_started'
}

/**
 * Calculate overall project progress from phases
 */
function calculateProjectProgress(phases: PhaseTimelineData[]): number {
  if (!phases || phases.length === 0) return 0

  const totalProgress = phases.reduce((sum, p) => sum + p.progress, 0)
  return Math.round(totalProgress / phases.length)
}
