import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { MilestoneStatus, TimelineStatus } from '@/types/timeline'

/**
 * Analytics data types for timeline insights
 */
export interface TimelineAnalytics {
  milestoneStats: MilestoneStats
  delayStats: DelayStats
  phaseStats: PhaseStats
  engagementStats: EngagementStats
  performanceTrends: PerformanceTrend[]
}

export interface MilestoneStats {
  total: number
  completed: number
  pending: number
  delayed: number
  completionRate: number
  onTimeCompletionRate: number
}

export interface DelayStats {
  totalDelays: number
  averageDelayDays: number
  totalDelayDays: number
  mostCommonCause: string
  delaysByPhase: Record<string, number>
}

export interface PhaseStats {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  delayed: number
  averageDuration: number
}

export interface EngagementStats {
  totalComments: number
  milestonesWithComments: number
  averageCommentsPerMilestone: number
  mostActiveMilestone: string | null
}

export interface PerformanceTrend {
  period: string
  completionRate: number
  averageDelay: number
  milestonesCompleted: number
}

/**
 * Custom hook to fetch timeline analytics for a project
 * @param projectId - Project ID to fetch analytics for
 * @returns Analytics data with loading states
 */
export const useTimelineAnalytics = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['timeline-analytics', projectId],
    queryFn: async () => {
      if (!projectId) return null

      // Fetch all necessary data in parallel
      const [
        milestonesResult,
        phasesResult,
        delaysResult,
        commentsResult
      ] = await Promise.all([
        // Milestones data
        supabase
          .from('project_milestone_definitions')
          .select(`
            id,
            milestone_name,
            target_date,
            actual_date,
            status,
            phase_id,
            project_phases!inner(
              phase_name
            )
          `)
          .eq('project_id', projectId),
        
        // Phases data
        supabase
          .from('project_phases')
          .select(`
            id,
            phase_name,
            start_date,
            planned_end_date,
            actual_end_date,
            status
          `)
          .eq('project_id', projectId),
        
        // Delays data
        supabase
          .from('milestone_delays')
          .select(`
            delay_days,
            root_cause,
            milestone_id,
            project_milestone_definitions!inner(
              milestone_name,
              phase_id,
              project_phases!inner(
                phase_name
              )
            )
          `)
          .eq('project_id', projectId),
        
        // Comments data - need to join through milestone_definitions since comments don't have project_id
        supabase
          .from('milestone_comments')
          .select(`
            milestone_id,
            content,
            created_at,
            project_milestone_definitions!inner(project_id)
          `)
          .eq('project_milestone_definitions.project_id', projectId)
      ])

      if (milestonesResult.error) throw milestonesResult.error
      if (phasesResult.error) throw phasesResult.error
      if (delaysResult.error) throw delaysResult.error
      if (commentsResult.error) throw commentsResult.error

      const milestones = milestonesResult.data || []
      const phases = phasesResult.data || []
      const delays = delaysResult.data || []
      const comments = commentsResult.data || []

      // Calculate milestone statistics
      const milestoneStats: MilestoneStats = {
        total: milestones.length,
        completed: milestones.filter(m => m.status === 'completed').length,
        pending: milestones.filter(m => m.status === 'pending').length,
        delayed: milestones.filter(m => m.status === 'delayed').length,
        completionRate: milestones.length > 0 
          ? (milestones.filter(m => m.status === 'completed').length / milestones.length) * 100 
          : 0,
        onTimeCompletionRate: milestones.length > 0
          ? (milestones.filter(m => {
              if (m.status !== 'completed' || !m.actual_date) return false
              const actual = new Date(m.actual_date)
              const target = new Date(m.target_date)
              return actual <= target
            }).length / 
             milestones.filter(m => m.status === 'completed').length) * 100
          : 0
      }

      // Calculate delay statistics
      const totalDelayDays = delays.reduce((sum, delay) => sum + delay.delay_days, 0)
      const delaysByPhase = delays.reduce((acc, delay) => {
        const phaseName = delay.project_milestone_definitions?.project_phases?.phase_name || 'Unknown'
        acc[phaseName] = (acc[phaseName] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const causeFrequency = delays.reduce((acc, delay) => {
        acc[delay.root_cause] = (acc[delay.root_cause] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const mostCommonCause = Object.keys(causeFrequency).length > 0
        ? Object.keys(causeFrequency).reduce((a, b) => causeFrequency[a] > causeFrequency[b] ? a : b)
        : null

      const delayStats: DelayStats = {
        totalDelays: delays.length,
        averageDelayDays: delays.length > 0 ? totalDelayDays / delays.length : 0,
        totalDelayDays,
        mostCommonCause: mostCommonCause || 'N/A',
        delaysByPhase
      }

      // Calculate phase statistics
      const phaseStats: PhaseStats = {
        total: phases.length,
        completed: phases.filter(p => p.status === 'completed').length,
        inProgress: phases.filter(p => p.status === 'in_progress').length,
        notStarted: phases.filter(p => p.status === 'not_started').length,
        delayed: phases.filter(p => p.status === 'delayed').length,
        averageDuration: phases.length > 0
          ? phases.reduce((sum, phase) => {
              const start = new Date(phase.start_date)
              const end = phase.actual_end_date ? new Date(phase.actual_end_date) : new Date(phase.planned_end_date)
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            }, 0) / phases.length
          : 0
      }

      // Calculate engagement statistics
      const milestonesWithComments = new Set(comments.map(c => c.milestone_id)).size
      const commentsByMilestone = comments.reduce((acc, comment) => {
        acc[comment.milestone_id] = (acc[comment.milestone_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const mostActiveMilestoneId = Object.keys(commentsByMilestone).length > 0
        ? Object.keys(commentsByMilestone).reduce((a, b) => commentsByMilestone[a] > commentsByMilestone[b] ? a : b)
        : null
      
      const mostActiveMilestone = mostActiveMilestoneId
        ? milestones.find(m => m.id === mostActiveMilestoneId)?.milestone_name || null
        : null

      const engagementStats: EngagementStats = {
        totalComments: comments.length,
        milestonesWithComments,
        averageCommentsPerMilestone: milestones.length > 0 ? comments.length / milestones.length : 0,
        mostActiveMilestone
      }

      // Calculate performance trends (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const recentMilestones = milestones.filter(m => 
        new Date(m.target_date) >= sixMonthsAgo
      )
      
      const performanceTrends: PerformanceTrend[] = []
      for (let i = 5; i >= 0; i--) {
        const periodDate = new Date()
        periodDate.setMonth(periodDate.getMonth() - i)
        const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
        const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
        
        const periodMilestones = milestones.filter(m => {
          const targetDate = new Date(m.target_date)
          return targetDate >= periodStart && targetDate <= periodEnd
        })
        
        const completedInPeriod = periodMilestones.filter(m => m.status === 'completed')
        const delayedInPeriod = completedInPeriod.filter(m => {
          if (!m.actual_date) return false
          const actual = new Date(m.actual_date)
          const target = new Date(m.target_date)
          return actual > target
        })
        
        const totalDelayInPeriod = delayedInPeriod.reduce((sum, m) => {
          if (m.actual_date && m.target_date) {
            const actual = new Date(m.actual_date)
            const target = new Date(m.target_date)
            return sum + Math.ceil((actual.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
          }
          return sum
        }, 0)
        
        performanceTrends.push({
          period: periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          completionRate: periodMilestones.length > 0 ? (completedInPeriod.length / periodMilestones.length) * 100 : 0,
          averageDelay: delayedInPeriod.length > 0 ? totalDelayInPeriod / delayedInPeriod.length : 0,
          milestonesCompleted: completedInPeriod.length
        })
      }

      return {
        milestoneStats,
        delayStats,
        phaseStats,
        engagementStats,
        performanceTrends
      } as TimelineAnalytics
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
