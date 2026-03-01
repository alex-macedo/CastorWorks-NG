import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageSquare,
  RefreshCcw,
  Search,
  Sparkles,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProjectPlanView } from '@/components/ProjectPhases/ProjectPlanView'
import { DelayDocumentationDialog } from '@/components/ProjectsTimeline/DelayDocumentationDialog'
import { BenchmarkTable } from '@/components/ProjectsTimeline/BenchmarkTable'
import { TimelineMilestone } from '@/components/ProjectsTimeline/TimelineMilestone'
import { TodayIndicator } from '@/components/ProjectsTimeline/TodayIndicator'
import { MilestoneCommentsThread } from '@/components/ProjectsTimeline/MilestoneCommentsThread'
import { DelayAnalyticsCard } from '@/components/ProjectsTimeline/DelayAnalyticsCard'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { ClientDefinitionsPanel } from '@/components/ProjectsTimeline/ClientDefinitionsPanel'
import { ClientDefinitionDialog } from '@/components/ProjectsTimeline/ClientDefinitionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useSearchParams } from 'react-router-dom'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useMilestoneDefinitions } from '@/hooks/useMilestoneDefinitions'
import { useProjectActivities } from '@/hooks/useProjectActivities'
import { useProjectPhases } from '@/hooks/useProjectPhases'
import { useProjectTimeline } from '@/hooks/useProjectTimeline'
import { useProjectWbsItems } from '@/hooks/useProjectWbsItems'
import { useSystemPreferences } from '@/hooks/useSystemPreferences'
import { 
  useClientDefinitions, 
  useDefinitionStatusCounts,
  useUpdateDefinition, 
  useAddFollowUp,
  useDeleteDefinition
} from '@/hooks/useClientDefinitions'
import { useGlobalMilestoneDependencies } from '@/hooks/useMilestoneDependencies'
import { MilestoneDependencyDialog } from '@/components/ProjectsTimeline/MilestoneDependencyDialog'
import { useProjects } from '@/hooks/useProjects'
import { useProjectBudget } from '@/hooks/useProjectBudget'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus'
import { getScheduleStatusTranslationKey, getStatusBadgeVariant } from '@/utils/badgeVariants'
import { ProjectScheduleStatusBadge } from '@/components/Projects/ProjectScheduleStatusBadge'
import type { 
  MilestoneData, 
  PhaseTimelineData, 
  TimelineStatus,
  MilestoneDependency 
} from '@/types/timeline'

type VisualMilestoneStatus =
  | 'planned'
  | 'on_track'
  | 'at_risk'
  | 'delayed'
  | 'not_started_overdue'
type TimeScale = 'month' | 'year'
type DetailsView = 'project' | 'phase'

interface GlobalPhaseItem extends PhaseTimelineData {
  projectName: string
}

interface GlobalMilestoneItem extends MilestoneData {
  projectId: string
}

interface TimelineTableRow {
  rowId: string
  projectId: string
  phaseId: string
  projectName: string
  phaseName: string
  startDate: Date
  actualStart: Date | null
  interval: number
  status: TimelineStatus
  milestoneId: string | null
}

interface GlobalProjectTimelineRow {
  projectId: string
  projectName: string
  phaseId: string
  phaseName: string
  phase: PhaseTimelineData
  scheduleStatus: ReturnType<typeof getProjectScheduleStatus>
  plannedDate: Date
  executedDate: Date
  executedStatus: VisualMilestoneStatus
  milestones: GlobalMilestoneItem[]
}

function mapMilestoneStatus(
  milestoneStatus: MilestoneData['status'],
  targetDate: Date,
  actualDate: Date | null
): VisualMilestoneStatus {
  if (milestoneStatus === 'delayed') return 'delayed'
  if (milestoneStatus === 'completed' && actualDate && actualDate > targetDate) return 'delayed'
  if (milestoneStatus === 'completed') return 'on_track'
  return 'planned'
}

function mapProjectScheduleStatusToMarkerStatus(
  scheduleStatus: ReturnType<typeof getProjectScheduleStatus>
): VisualMilestoneStatus {
  switch (scheduleStatus) {
    case 'on_schedule':
      return 'on_track'
    case 'at_risk':
      return 'at_risk'
    case 'delayed':
      return 'delayed'
    case 'not_started':
    default:
      return 'planned'
  }
}

function mapGlobalMilestoneStatus(milestone: GlobalMilestoneItem): VisualMilestoneStatus {
  const hasDefinition = Boolean(milestone.definition?.trim())

  if (milestone.status === 'completed' && hasDefinition) return 'on_track'
  if (!hasDefinition) return 'delayed'
  return mapMilestoneStatus(milestone.status, milestone.targetDate, milestone.actualDate)
}

function mapTimelineStatusToProjectPlanStatus(status: TimelineStatus): string {
  if (status === 'at_risk') return 'delayed'
  return status
}

function mapMilestoneStatusToProjectPlanStatus(status: MilestoneData['status']): string {
  if (status === 'completed') return 'completed'
  if (status === 'delayed') return 'delayed'
  return 'not_started'
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const messageValue =
      record.message ||
      record.error ||
      record.details ||
      record.hint ||
      record.statusText

    if (typeof messageValue === 'string' && messageValue.trim()) return messageValue

    try {
      return JSON.stringify(record)
    } catch {
      return 'Unknown error'
    }
  }

  if (typeof error === 'string' && error.trim()) return error
  return 'Unknown error'
}

const MilestoneDependencyArrows = ({
  dependencies,
  positions,
}: {
  dependencies: MilestoneDependency[]
  positions: Map<string, { x: number; y: number }>
}) => {
  if (dependencies.length === 0) return null

  return (
    <svg
      className='pointer-events-none absolute inset-0 z-0 w-full h-full'
    >
      <defs>
        <marker id='arrowhead' markerWidth='10' markerHeight='7' refX='9' refY='3.5' orient='auto'>
          <polygon
            points='0 0, 10 3.5, 0 7'
            fill='currentColor'
            className='text-slate-400 dark:text-slate-600'
          />
        </marker>
      </defs>
      {dependencies.map((dep) => {
        const from = positions.get(dep.predecessorId)
        const to = positions.get(dep.successorId)

        if (!from || !to) return null

        // Simple orthogonal-style path or straight line
        // For construction timelines, straight lines with small offset are often clearer
        return (
          <line
            key={dep.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke='currentColor'
            strokeWidth='1'
            strokeDasharray={dep.lagDays !== 0 ? '4 2' : 'none'}
            className='text-slate-400/40 dark:text-slate-600/40'
            markerEnd='url(#arrowhead)'
          />
        )
      })}
    </svg>
  )
}

function pickCurrentProjectPhase(phases: PhaseTimelineData[]): PhaseTimelineData | null {
  if (phases.length === 0) return null

  return (
    phases.find((phase) => ['in_progress', 'at_risk', 'delayed'].includes(phase.status)) ??
    phases.find((phase) => phase.status !== 'completed') ??
    phases[phases.length - 1] ??
    null
  )
}

function getPhaseStatusForToday(phase: PhaseTimelineData): { status: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const phaseStart = new Date(phase.startDate)
  phaseStart.setHours(0, 0, 0, 0)

  // Not started phases should be gray until planned start, and red only when overdue.
  if (phase.status === 'not_started') {
    if (phaseStart > today) {
      return { status: 'timeline.status.not_started', color: 'border-slate-500/40 bg-slate-500/10 text-slate-300' }
    }

    return { status: 'timeline.status.delayed', color: 'border-red-500/40 bg-red-500/10 text-red-300' }
  }
  
  // If phase is in progress
  if (phase.status === 'in_progress') {
    // Check if any tasks are delayed (using interval < 0 as indicator)
    if (phase.interval < 0) {
      return { status: 'timeline.status.attention', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' }
    } else {
      return { status: 'timeline.status.in_progress', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' }
    }
  }
  
  // Default status based on existing status
  switch (phase.status) {
    case 'completed':
      return { status: 'timeline.status.completed', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' }
    case 'delayed':
    case 'at_risk':
      return { status: 'timeline.status.attention', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' }
    default:
      return { status: 'timeline.status.not_started', color: 'border-slate-500/40 bg-slate-500/10 text-slate-300' }
  }
}

export default function ProjectsTimelinePage() {
  const { t } = useLocalization()
  const { data: systemPreferences } = useSystemPreferences()
  const { timelineData, isLoading, error, recalculateForecast, refetch } = useProjectTimeline()
  const { projects: projectsFromUseProjects = [], updateProject } = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdFromUrl)
  const [isProjectSelectionInitialized, setIsProjectSelectionInitialized] = useState(false)
  const [selectedPhaseName, setSelectedPhaseName] = useState<string>('all')
  const [detailsView, setDetailsView] = useState<DetailsView>('project')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [timeScale, setTimeScale] = useState<TimeScale>('month')
  const [showRightPanel, setShowRightPanel] = useState(true)
  const globalTimelineCardRef = useRef<HTMLDivElement | null>(null)
  const [globalTimelineCardHeight, setGlobalTimelineCardHeight] = useState<number>(0)
  const [delayDialogState, setDelayDialogState] = useState<{
    open: boolean
    milestoneId: string
    milestoneName: string
    projectId: string
  }>({ open: false, milestoneId: '', milestoneName: '', projectId: '' })

  const [sidebarTab, setSidebarTab] = useState<'deadlines' | 'definitions'>('deadlines')
  const [benchmarkSectionExpanded, setBenchmarkSectionExpanded] = useState(false)
  const [analyticsSectionExpanded, setAnalyticsSectionExpanded] = useState(false)
  const [selectedDetailsSectionExpanded, setSelectedDetailsSectionExpanded] = useState(false)
  const [dependencyDialogState, setDependencyDialogState] = useState<{
    open: boolean
    milestone: GlobalMilestoneItem | null
  }>({ open: false, milestone: null })

  useLayoutEffect(() => {
    const node = globalTimelineCardRef.current
    if (!node) return

    const updateHeight = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height)
      setGlobalTimelineCardHeight((previousHeight) =>
        previousHeight === nextHeight ? previousHeight : nextHeight
      )
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const allProjects = useMemo(() => timelineData ?? [], [timelineData])
  const projectIds = useMemo(() => allProjects.map((project) => project.id), [allProjects])

  const { data: globalMilestoneDependencies = [] } = useGlobalMilestoneDependencies(projectIds)

  // Use useProjects as primary so dropdown matches project-phases exactly; enrich with timeline data when available
  const projectsForDropdown = useMemo(() => {
    const timelineById = new Map(allProjects.map((p) => [p.id, p]))
    const result: any[] = []
    for (const p of projectsFromUseProjects) {
      if (!p?.id) continue
      const enriched = timelineById.get(p.id) ?? {
        id: p.id,
        name: p.name,
        phases: [],
        plannedEndDate: (p as any).end_date ? new Date((p as any).end_date) : new Date(),
        adjustedForecast: null,
        status: ((p as any).status as string) || 'not_started',
      }
      result.push(enriched)
    }
    for (const p of allProjects) {
      if (p?.id && !result.some((r) => r.id === p.id)) result.push(p)
    }
    if (projectIdFromUrl && !result.some((r) => r.id === projectIdFromUrl)) {
      result.unshift({ id: projectIdFromUrl, name: `Project ${projectIdFromUrl.slice(0, 8)}…`, phases: [] } as any)
    }
    return result
  }, [allProjects, projectsFromUseProjects, projectIdFromUrl])

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    if (!normalizedSearch) return projectsForDropdown
    return projectsForDropdown.filter((project) => project.name.toLowerCase().includes(normalizedSearch))
  }, [projectsForDropdown, searchQuery])

  useEffect(() => {
    if (isProjectSelectionInitialized) return

    // When user navigates with ?projectId=..., always honor it (fixes wrong phases when project not in timeline list)
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl)
      setIsProjectSelectionInitialized(true)
      return
    }

    if (allProjects.length === 0) return

    setSelectedProjectId(allProjects[0].id)
    setIsProjectSelectionInitialized(true)
  }, [allProjects, isProjectSelectionInitialized, projectIdFromUrl])

  // Keep URL in sync when we have projectIdFromUrl on mount (avoids losing it during auth/hydration)
  useEffect(() => {
    if (projectIdFromUrl && !searchParams.get('projectId')) {
      const next = new URLSearchParams(searchParams)
      next.set('projectId', projectIdFromUrl)
      setSearchParams(next, { replace: true })
    }
  }, [projectIdFromUrl, searchParams, setSearchParams])

  useEffect(() => {
    if (!isProjectSelectionInitialized) return
    // Never overwrite when user explicitly navigated to a project via URL
    if (projectIdFromUrl && selectedProjectId === projectIdFromUrl) return
    // Never overwrite when user's selection is a valid option in the current dropdown
    if (selectedProjectId && filteredProjects.some((p) => p.id === selectedProjectId)) return

    if (filteredProjects.length === 0) {
      if (selectedProjectId !== null && !projectIdFromUrl) setSelectedProjectId(null)
      return
    }

    const isProjectInList = projectsForDropdown.some((project) => project.id === selectedProjectId)
    if (!selectedProjectId || !isProjectInList) {
      if (projectIdFromUrl && projectsForDropdown.some((p) => p.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl)
      } else {
        setSelectedProjectId(filteredProjects[0].id)
      }
      return
    }

    if (!filteredProjects.some((project) => project.id === selectedProjectId)) {
      if (projectIdFromUrl && filteredProjects.some((p) => p.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl)
      } else {
        setSelectedProjectId(filteredProjects[0].id)
      }
    }
  }, [projectsForDropdown, filteredProjects, isProjectSelectionInitialized, selectedProjectId, projectIdFromUrl])

  useEffect(() => {
    if (!isProjectSelectionInitialized || !selectedProjectId) return
    if (projectIdFromUrl === selectedProjectId) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('projectId', selectedProjectId)
    setSearchParams(nextSearchParams, { replace: true })
  }, [
    isProjectSelectionInitialized,
    projectIdFromUrl,
    searchParams,
    selectedProjectId,
    setSearchParams,
  ])

  const selectedProject = useMemo(
    () =>
      allProjects.find((project) => project.id === selectedProjectId) ??
      projectsForDropdown.find((project) => project.id === selectedProjectId) ??
      null,
    [allProjects, projectsForDropdown, selectedProjectId]
  )

  // Calculate project area and cost for benchmarks
  // Note: Using project metadata or defaults
  const projectAreaM2 = (selectedProject as any)?.estimated_area_m2 || (selectedProject as any)?.area_m2 || 0
  const projectTotalCost = (selectedProject as any)?.total_budget || (selectedProject as any)?.budget_total || 0

  const selectedProjectScheduleStatus = useMemo(() => {
    if (!selectedProject) return null

    return getProjectScheduleStatus({
      schedule_status: (selectedProject as any).schedule_status ?? selectedProject.scheduleStatus,
      scheduleStatus: selectedProject.scheduleStatus,
      status: selectedProject.status,
    })
  }, [selectedProject])

  // Prioritize dropdown selection (selectedProjectId) so changing the selector updates the display.
  // Fall back to projectIdFromUrl only for initial URL-driven load before user has interacted.
  const effectiveProjectId = selectedProjectId || projectIdFromUrl

  // Resolve the raw project record (from useProjects) so ProjectPlanView can use the DB start_date
  const selectedProjectRecord = useMemo(
    () => (effectiveProjectId ? projectsFromUseProjects.find((p) => p?.id === effectiveProjectId) ?? null : null),
    [effectiveProjectId, projectsFromUseProjects]
  )

  const { phases: legacyProjectPhases } = useProjectPhases(effectiveProjectId || undefined)
  const { activities: legacyProjectActivities } = useProjectActivities(effectiveProjectId || undefined)
  const { wbsItems, phases: wbsProjectPhases } = useProjectWbsItems(effectiveProjectId || undefined)

  const {
    data: definitions = [],
    isLoading: isDefinitionsLoading,
  } = useClientDefinitions(selectedProjectId || undefined)

  const { data: definitionCounts } = useDefinitionStatusCounts(selectedProjectId || undefined)

  const highImpactCount = useMemo(
    () => definitions.filter((d) => d.impactScore >= 50).length,
    [definitions]
  )

  const updateDefinitionStatus = useUpdateDefinition()
  const logDefinitionFollowUp = useAddFollowUp()

  const [definitionDialogState, setDefinitionDialogState] = useState<{
    open: boolean
    definitionId?: string
    projectId: string
  }>({ open: false, projectId: '' })

  const wbsChildrenAsActivities = useMemo(() => {
    if (!wbsItems || !wbsProjectPhases) return []

    return wbsItems
      .filter((item) => item.item_type !== 'phase')
      .map((item, index) => ({
        id: item.id,
        project_id: item.project_id,
        phase_id: item.parent_id,
        sequence: item.sort_order || index + 1,
        name: item.name,
        description: item.description || null,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        days_for_activity: item.duration || item.standard_duration_days || 0,
        completion_percentage: item.progress_percentage || 0,
        completion_date: null,
        dependencies: [],
        is_critical: false,
        status: item.status || 'pending',
        metadata: {
          wbs_code: item.wbs_code,
          item_type: item.item_type,
          code_path: item.code_path,
          isWbsItem: true,
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
      }))
  }, [wbsItems, wbsProjectPhases])

  const isWbsProject = Boolean(wbsItems && wbsItems.length > 0)

  const rawProjectPlanPhases = useMemo(
    () => (isWbsProject ? wbsProjectPhases || [] : legacyProjectPhases || []),
    [isWbsProject, legacyProjectPhases, wbsProjectPhases]
  )

  const rawProjectPlanActivities = useMemo(
    () => (isWbsProject ? wbsChildrenAsActivities : legacyProjectActivities || []),
    [isWbsProject, legacyProjectActivities, wbsChildrenAsActivities]
  )

  // Defensive filter: only show phases/activities for the selected project to prevent wrong-project data display
  const projectPlanPhases = useMemo(() => {
    if (!effectiveProjectId) return []
    return rawProjectPlanPhases.filter((p: { project_id?: string }) => (p?.project_id ?? '') === effectiveProjectId)
  }, [effectiveProjectId, rawProjectPlanPhases])

  const projectPlanActivities = useMemo(() => {
    if (!effectiveProjectId) return []
    const allowedPhaseIds = new Set(projectPlanPhases.map((p: { id?: string }) => p.id))
    return rawProjectPlanActivities.filter((a: { project_id?: string; phase_id?: string }) => {
      if ((a?.project_id ?? '') === effectiveProjectId) return true
      return a?.phase_id ? allowedPhaseIds.has(a.phase_id) : false
    })
  }, [effectiveProjectId, rawProjectPlanActivities, projectPlanPhases])

  useEffect(() => {
    setDetailsView('project')
  }, [selectedProjectId])

  const {
    milestones = [],
    isLoading: isMilestonesLoading,
    addComment,
  } = useMilestoneDefinitions(selectedProject?.id)


  const {
    data: globalMilestones = [],
    isLoading: isGlobalMilestonesLoading,
    refetch: refetchGlobalMilestones,
  } = useQuery({
    queryKey: ['timeline-global-milestones', projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('project_milestone_definitions')
        .select(
          'id, project_id, phase_id, milestone_name, target_date, actual_date, status, definition_text, justification_text, comments'
        )
        .in('project_id', projectIds)

      if (queryError) {
        console.error('Failed to load global milestones', queryError)
        return [] as GlobalMilestoneItem[]
      }

      return (
        data?.map((milestone) => ({
          id: milestone.id,
          projectId: milestone.project_id,
          phaseId: milestone.phase_id,
          name: milestone.milestone_name,
          targetDate: new Date(milestone.target_date),
          actualDate: milestone.actual_date ? new Date(milestone.actual_date) : null,
          status: milestone.status as MilestoneData['status'],
          definition: milestone.definition_text,
          justification: milestone.justification_text,
          hasComments: Array.isArray(milestone.comments) && milestone.comments.length > 0,
        })) ?? []
      )
    },
    staleTime: 1000 * 60 * 2,
  })

  const allPhases = useMemo<GlobalPhaseItem[]>(
    () =>
      allProjects.flatMap((project) =>
        project.phases.map((phase) => ({
          ...phase,
          projectName: project.name,
        }))
      ),
    [allProjects]
  )

  const projectNameById = useMemo(
    () => Object.fromEntries(allProjects.map((project) => [project.id, project.name])) as Record<string, string>,
    [allProjects]
  )

  const phaseNameById = useMemo(
    () => Object.fromEntries(allPhases.map((phase) => [phase.id, phase.phaseName])) as Record<string, string>,
    [allPhases]
  )

  const projectNameByMilestoneId = useMemo(
    () =>
      Object.fromEntries(
        globalMilestones.map((milestone) => [milestone.id, projectNameById[milestone.projectId] ?? ''])
      ) as Record<string, string>,
    [globalMilestones, projectNameById]
  )

  const globalTimelineRows = useMemo<GlobalProjectTimelineRow[]>(() => {
    return filteredProjects
      .map((project) => {
        const phase = pickCurrentProjectPhase(project.phases)
        if (!phase) return null
        const scheduleStatus = getProjectScheduleStatus(project as any)

        const rowMilestones = globalMilestones
          .filter(
            (milestone) =>
              milestone.projectId === project.id &&
              (!milestone.phaseId || milestone.phaseId === phase.id)
          )
          .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())

        return {
          projectId: project.id,
          projectName: project.name,
          phaseId: phase.id,
          phaseName: phase.phaseName,
          phase: phase, // Include the actual phase data
          scheduleStatus,
          plannedDate: phase.plannedEndDate,
          executedDate: phase.actualEndDate ?? phase.adjustedForecast ?? phase.plannedEndDate,
          executedStatus: mapProjectScheduleStatusToMarkerStatus(scheduleStatus),
          milestones: rowMilestones,
        }
      })
      .filter((row): row is GlobalProjectTimelineRow => row !== null)
  }, [filteredProjects, globalMilestones])

  const globalMilestonesByPhase = useMemo(() => {
    const grouped = new Map<string, GlobalMilestoneItem[]>()

    globalMilestones.forEach((milestone) => {
      if (!milestone.phaseId) return
      const current = grouped.get(milestone.phaseId) ?? []
      current.push(milestone)
      grouped.set(milestone.phaseId, current)
    })

    return grouped
  }, [globalMilestones])

  const globalPhaseActualStartMap = useMemo(() => {
    const actualStartByPhase = new Map<string, Date>()

    globalMilestones.forEach((milestone) => {
      if (!milestone.phaseId || !milestone.actualDate) return
      const current = actualStartByPhase.get(milestone.phaseId)

      if (!current || milestone.actualDate < current) {
        actualStartByPhase.set(milestone.phaseId, milestone.actualDate)
      }
    })

    return actualStartByPhase
  }, [globalMilestones])

  const earliestPhaseStartDate = useMemo(() => {
    if (projectPlanPhases.length === 0) return null

    return projectPlanPhases.reduce((earliest: Date | null, phase: any) => {
      const sd = phase.start_date ? new Date(phase.start_date) : null
      if (!sd || Number.isNaN(sd.getTime())) return earliest
      if (!earliest) return sd
      return sd < earliest ? sd : earliest
    }, null)
  }, [projectPlanPhases])

  const phaseNameOptions = useMemo(() => {
    const uniquePhaseNames = new Set<string>()
    allPhases.forEach((phase) => uniquePhaseNames.add(phase.phaseName))
    return [...uniquePhaseNames].sort((a, b) => a.localeCompare(b))
  }, [allPhases])

  useEffect(() => {
    if (phaseNameOptions.length === 0) {
      setSelectedPhaseName('all')
      return
    }

    if (selectedPhaseName === 'all') return
    if (!phaseNameOptions.includes(selectedPhaseName)) {
      setSelectedPhaseName(phaseNameOptions[0])
    }
  }, [phaseNameOptions, selectedPhaseName])

  const tableRows = useMemo<TimelineTableRow[]>(() => {
    if (detailsView !== 'phase') return []

    return allPhases
      .filter((phase) => selectedPhaseName === 'all' || phase.phaseName === selectedPhaseName)
      .map((phase) => {
        const phaseMilestones = globalMilestonesByPhase.get(phase.id) ?? []
        return {
          rowId: `${phase.projectId}-${phase.id}`,
          projectId: phase.projectId,
          phaseId: phase.id,
          projectName: phase.projectName,
          phaseName: phase.phaseName,
          startDate: phase.startDate,
          actualStart: globalPhaseActualStartMap.get(phase.id) ?? null,
          interval: phase.interval,
          status: phase.status,
          milestoneId: phaseMilestones[0]?.id ?? null,
        }
      })
  }, [
    allPhases,
    detailsView,
    globalMilestonesByPhase,
    globalPhaseActualStartMap,
    selectedPhaseName,
  ])

  const rowMilestonesByRowId = useMemo(() => {
    const grouped = new Map<string, GlobalMilestoneItem[]>()

    tableRows.forEach((row) => {
      const rowMilestones = globalMilestones
        .filter(
          (milestone) => milestone.phaseId === row.phaseId && milestone.projectId === row.projectId
        )
        .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
      grouped.set(row.rowId, rowMilestones)
    })

    return grouped
  }, [globalMilestones, tableRows])

  const phaseLookupByProjectAndPhase = useMemo(() => {
    return new Map(allPhases.map((phase) => [`${phase.projectId}:${phase.id}`, phase]))
  }, [allPhases])

  const phaseComparisonPlanPhases = useMemo(() => {
    if (detailsView !== 'phase') return []

    return tableRows.map((row, index) => {
      const phaseRef = phaseLookupByProjectAndPhase.get(`${row.projectId}:${row.phaseId}`)
      const startDate = phaseRef?.startDate ?? row.startDate
      const endDate = phaseRef?.plannedEndDate ?? row.actualStart ?? row.startDate
      const duration = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1)

      return {
        id: row.phaseId,
        project_id: row.projectId,
        phase_name: `${row.projectName} - ${row.phaseName}`,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        duration,
        progress_percentage: phaseRef?.progress ?? 0,
        status: mapTimelineStatusToProjectPlanStatus(row.status),
        sort_order: index + 1,
      }
    })
  }, [detailsView, phaseLookupByProjectAndPhase, tableRows])

  const phaseComparisonPlanActivities = useMemo(() => {
    if (detailsView !== 'phase') return []

    return tableRows.flatMap((row) => {
      const rowMilestones = rowMilestonesByRowId.get(row.rowId) ?? []

      return rowMilestones.map((milestone, index) => {
        const endDate = milestone.actualDate ?? milestone.targetDate
        const duration = Math.max(1, differenceInCalendarDays(endDate, milestone.targetDate) + 1)
        const completionPercentage =
          milestone.status === 'completed' ? 100 : milestone.status === 'delayed' ? 50 : 0

        return {
          id: milestone.id,
          project_id: row.projectId,
          phase_id: row.phaseId,
          name: milestone.name,
          sequence: index + 1,
          start_date: format(milestone.targetDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          days_for_activity: duration,
          completion_percentage: completionPercentage,
          status: mapMilestoneStatusToProjectPlanStatus(milestone.status),
          dependencies: [],
        }
      })
    })
  }, [detailsView, rowMilestonesByRowId, tableRows])

  const completedPhases = useMemo(
    () =>
      projectPlanPhases.filter((phase: any) => phase.status === 'completed' || (phase.progress_percentage ?? 0) >= 100)
        .length,
    [projectPlanPhases]
  )

  const delayedDaysAccumulated = useMemo(() => {
    // Calculate delay from phase dates: negative interval = behind schedule
    let totalDelay = 0
    for (const phase of projectPlanPhases) {
      const p = phase as any
      const endDate = p.end_date ? new Date(p.end_date) : null
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (!endDate) continue
      // Phase is delayed if it's past end_date and not completed
      if (p.status !== 'completed' && endDate < today) {
        totalDelay += differenceInCalendarDays(today, endDate)
      }
    }
    return totalDelay
  }, [projectPlanPhases])

  const pendingDefinitions = useMemo(
    () => milestones.filter((milestone) => !milestone.definition || !milestone.justification).length,
    [milestones]
  )

  const nextMilestone = useMemo(() => {
    const upcoming = [...milestones]
      .filter((milestone) => milestone.status !== 'completed')
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())

    return upcoming[0] ?? milestones[0] ?? null
  }, [milestones])

  const panelMilestones = useMemo(
    () => [...globalMilestones].sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime()),
    [globalMilestones]
  )

  const recentGlobalActivity = useMemo(
    () =>
      globalMilestones
        .filter((milestone) => milestone.actualDate || milestone.hasComments)
        .sort((a, b) => {
          const aDate = (a.actualDate ?? a.targetDate).getTime()
          const bDate = (b.actualDate ?? b.targetDate).getTime()
          return bDate - aDate
        })
        .slice(0, 8),
    [globalMilestones]
  )

  const phaseSummaryGroups = useMemo(() => {
    // Group by project and always render centralized project schedule status.
    const grouped = new Map<string, { projectName: string; phases: GlobalPhaseItem[] }>()

    allPhases.forEach((phase) => {
      const current = grouped.get(phase.projectId) ?? {
        projectName: phase.projectName,
        phases: [],
      }
      current.phases.push(phase)
      grouped.set(phase.projectId, current)
    })

    return Array.from(grouped.entries())
      .map(([projectId, group]) => {
        const currentPhase = pickCurrentProjectPhase(group.phases)
        const scheduleStatus = getProjectScheduleStatus(
          projectsForDropdown.find((project) => project.id === projectId) as any
        )

        return {
          projectId,
          projectName: group.projectName,
          phaseName: currentPhase?.phaseName || t('timeline.deadlines.noDeadlines'),
          scheduleStatus,
        }
      })
      .slice(0, 8)
  }, [allPhases, projectsForDropdown, t])

  useEffect(() => {
    if (panelMilestones.length === 0) {
      setSelectedMilestoneId(null)
      return
    }

    const hasCurrent = panelMilestones.some((milestone) => milestone.id === selectedMilestoneId)
    if (!selectedMilestoneId || !hasCurrent) {
      setSelectedMilestoneId(panelMilestones[0].id)
    }
  }, [panelMilestones, selectedMilestoneId])

  const globalTimelineBounds = useMemo(() => {
    const today = new Date()
    const forcedStart = startOfWeek(addDays(today, -30), { weekStartsOn: 1 })
    const minimumEnd = endOfWeek(addDays(today, 90), { weekStartsOn: 1 })

    if (globalTimelineRows.length === 0) {
      return {
        start: forcedStart,
        end: minimumEnd,
      }
    }

    const endCandidates: Date[] = [today]

    globalTimelineRows.forEach((row) => {
      endCandidates.push(row.plannedDate)
      endCandidates.push(row.executedDate)

      row.milestones.forEach((milestone) => {
        endCandidates.push(milestone.actualDate ?? milestone.targetDate)
      })
    })

    const latest = new Date(Math.max(...endCandidates.map((date) => date.getTime())))
    const adjustedEnd = new Date(Math.max(latest.getTime(), minimumEnd.getTime()))

    return {
      start: forcedStart,
      end: endOfWeek(adjustedEnd, { weekStartsOn: 1 }),
    }
  }, [globalTimelineRows])

  const globalTotalDays = useMemo(
    () =>
      Math.max(
        1,
        differenceInCalendarDays(globalTimelineBounds.end, globalTimelineBounds.start) + 1
      ),
    [globalTimelineBounds.end, globalTimelineBounds.start]
  )

  const globalTimelineWidth = useMemo(
    () => Math.max(1020, Math.round(globalTotalDays * (timeScale === 'month' ? 2.4 : 1.4))),
    [globalTotalDays, timeScale]
  )

  const globalTicks = useMemo(() => {
    if (timeScale === 'year') {
      return eachYearOfInterval({
        start: startOfYear(globalTimelineBounds.start),
        end: endOfYear(globalTimelineBounds.end),
      })
    }

    return eachMonthOfInterval({
      start: startOfMonth(globalTimelineBounds.start),
      end: endOfMonth(globalTimelineBounds.end),
    })
  }, [globalTimelineBounds.end, globalTimelineBounds.start, timeScale])

  const getGlobalXPosition = useCallback((date: Date) => {
    const clamped = new Date(
      Math.max(
        globalTimelineBounds.start.getTime(),
        Math.min(date.getTime(), globalTimelineBounds.end.getTime())
      )
    )
    const offset = differenceInCalendarDays(clamped, globalTimelineBounds.start)
    return (offset / globalTotalDays) * globalTimelineWidth
  }, [globalTimelineBounds, globalTotalDays, globalTimelineWidth])
  const timelineLabelWidth = 252
  const timelineLaneLabelColumnWidth = 56
  const timelineLaneLabelColumnLeft = timelineLabelWidth - timelineLaneLabelColumnWidth - 8
  const timelineProjectNameWidth = timelineLaneLabelColumnLeft - 16
  const timelineFirstLaneY = 62
  const timelineLaneGap = 16
  const timelineProjectRowHeight = 40
  const timelineCanvasWidth = timelineLabelWidth + globalTimelineWidth + 24
  const timelineCanvasHeight = Math.max(
    220,
    timelineFirstLaneY + globalTimelineRows.length * timelineProjectRowHeight + 26
  )
  const globalTodayX = timelineLabelWidth + getGlobalXPosition(new Date())
  const globalMinus30X = timelineLabelWidth + getGlobalXPosition(addDays(new Date(), -30))

  const getPlannedLaneY = useCallback((index: number) => timelineFirstLaneY + index * timelineProjectRowHeight, [timelineFirstLaneY, timelineProjectRowHeight])
  const getExecutedLaneY = useCallback((index: number) => getPlannedLaneY(index) + timelineLaneGap, [getPlannedLaneY, timelineLaneGap])

  const milestonePositionsMap = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()

    globalTimelineRows.forEach((row, rowIndex) => {
      const executedY = getExecutedLaneY(rowIndex)

      row.milestones.forEach((milestone) => {
        const x = timelineLabelWidth + getGlobalXPosition(milestone.targetDate)
        positions.set(milestone.id, { x, y: executedY })
      })
    })

    return positions
  }, [globalTimelineRows, getGlobalXPosition, timelineLabelWidth, getExecutedLaneY])

  const handleRecalculateForecast = async () => {
    if (!selectedProject) return
    setIsRecalculating(true)

    try {
      await recalculateForecast({ projectId: selectedProject.id, forceRefresh: true })
      toast.success(t('timeline.forecast.recalculate'))
    } catch (recalculationError) {
      const message = getReadableErrorMessage(recalculationError)
      toast.error(t('timeline.error', { error: message }))
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleDocumentDelay = useCallback(
    (milestoneId: string, milestoneName: string) => {
      const milestone = globalMilestones.find((m) => m.id === milestoneId)
      const projectId = milestone?.projectId ?? selectedProjectId ?? ''
      setDelayDialogState({ open: true, milestoneId, milestoneName, projectId })
    },
    [globalMilestones, selectedProjectId]
  )

  if (isLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='text-muted-foreground'>{t('timeline.loadingProjects')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <div className='text-destructive'>
          {t('timeline.error', { error: getReadableErrorMessage(error) })}
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col text-[13px] leading-normal'>
      <div className='px-6 py-4'>
        <SidebarHeaderShell>
          <div className='space-y-3'>
            <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
              <div className='min-w-0 flex-1'>
                <h1 className='text-2xl font-semibold'>{t('timeline.title')}</h1>
                <p className='mt-1 text-sm text-muted-foreground'>{t('timeline.description')}</p>

                <div className='mt-3 flex min-w-0 items-center gap-2'>
                  <Badge className='!rounded-full border-white/20 bg-white/10 text-foreground backdrop-blur-sm dark:text-white/90'>
                    {t('timeline.summary.categoryLabel')}
                  </Badge>
                  {selectedProject && (
                    <Badge className='!rounded-full border-white/20 bg-white/10 text-cyan-300 backdrop-blur-sm dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200'>
                      {t('timeline.summary.phaseCountLabel', {
                        count: selectedProject.phases.length,
                      })}
                    </Badge>
                  )}
                  {selectedProject && (
                    <ProjectScheduleStatusBadge
                      status={selectedProjectScheduleStatus || 'not_started'}
                      className='min-w-0'
                      showTimezoneBadge={false}
                      statusBadgeClassName='!rounded-full !border-white/20 !bg-white/10 !text-inherit backdrop-blur-sm dark:!text-white/90'
                    />
                  )}
                </div>
                <div className='mt-2'>
                  <Badge className='h-6 !rounded-full border-white/20 bg-white/10 px-2 text-[10px] font-medium backdrop-blur-sm dark:text-white/80'>
                    {t('common:scheduleStatus.timezoneChip', {
                      timezone: systemPreferences?.system_time_zone || 'America/New_York',
                    })}
                  </Badge>
                </div>
              </div>

              <div className='flex w-full flex-col items-end gap-2 xl:w-auto'>
                <div className='flex w-full items-center justify-end gap-2 overflow-x-auto'>
                  <div className='relative w-[250px] shrink-0'>
                    <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t('common.search', 'Search')}
                      className='h-8 !rounded-full border-white/20 bg-white/10 pl-9 text-xs text-foreground backdrop-blur-sm placeholder:text-muted-foreground dark:text-white'
                      data-testid='timeline-search'
                    />
                  </div>

                  <Button
                    type='button'
                    variant='ghost'
                    onClick={handleRecalculateForecast}
                    disabled={!selectedProject || isRecalculating}
                    className='h-8 shrink-0 gap-2 px-3 text-xs !rounded-full border border-white/20 bg-white/10 font-medium backdrop-blur-sm dark:text-white hover:bg-white/20 hover:border-white/30'
                    data-testid='timeline-recalculate-forecast'
                  >
                    <RefreshCcw className={cn('h-3.5 w-3.5', isRecalculating && 'animate-spin')} />
                    {isRecalculating
                      ? t('timeline.forecast.recalculating')
                      : t('timeline.forecast.recalculate')}
                  </Button>

                  <div className='flex h-8 items-center gap-2 !rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm'>
                    <Switch
                      id='auto-cascade'
                      checked={selectedProject?.autoCascade ?? false}
                      onCheckedChange={async (checked) => {
                        if (!selectedProjectId) return
                        try {
                          await updateProject.mutateAsync({
                            id: selectedProjectId,
                            auto_cascade: checked,
                            silent: true
                          })
                          toast.success(checked ? t('timeline.forecast.autoCascadeEnabled') : t('timeline.forecast.autoCascadeDisabled'))
                          refetch()
                        } catch (err) {
                          toast.error(t('timeline.forecast.updateSettingsError'))
                        }
                      }}
                    />
                    <Label 
                      htmlFor='auto-cascade' 
                      className='cursor-pointer whitespace-nowrap text-xs font-semibold text-white'
                    >
                      {t('timeline.forecast.autoCascade', 'Auto-cascade')}
                    </Label>
                  </div>

                  <Select
                    value={selectedProjectId ?? 'all'}
                    onValueChange={(projectId) =>
                      setSelectedProjectId(projectId === 'all' ? null : projectId)
                    }
                    disabled={filteredProjects.length === 0}
                  >
                    <SelectTrigger
                      className='h-8 w-[270px] shrink-0 !rounded-full border-white/20 bg-white/10 text-xs backdrop-blur-sm dark:text-white'
                      data-testid='timeline-project-select'
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>{t('timeline.filters.allProjects')}</SelectItem>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex flex-wrap items-start justify-end gap-5 text-[11px]'>
                  <div className='text-right'>
                    <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                      {t('timeline.table.plannedStart')}
                    </p>
                    <p className='text-[11px] font-semibold text-right'>
                      {earliestPhaseStartDate ? format(earliestPhaseStartDate, 'dd/MM/yyyy') : '--'}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                      {t('timeline.forecast.planned')}
                    </p>
                    <p className='text-[11px] font-semibold text-right'>
                      {selectedProject ? format(selectedProject.plannedEndDate, 'dd MMM yyyy') : '--'}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                      {t('timeline.forecast.adjusted')}
                    </p>
                    <p className='text-[11px] font-semibold text-right text-amber-600 dark:text-amber-300'>
                      {selectedProject?.adjustedForecast
                        ? format(selectedProject.adjustedForecast, 'dd MMM yyyy')
                        : t('timeline.forecast.noForecast')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarHeaderShell>
      </div>

      <div className='flex min-h-0 flex-1 px-4 pb-4 pt-2'>
        <div className='min-h-0 flex-1 space-y-4 overflow-auto'>
          <div className='grid gap-3 lg:grid-cols-2 2xl:grid-cols-5'>
            <Card className='border-border bg-card text-card-foreground'>
              <CardContent className='space-y-2 p-3'>
                <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                  {t('timeline.summary.completedPhases')}
                </p>
                <p className='text-xl font-semibold text-emerald-600 dark:text-emerald-300'>
                  {completedPhases}/{projectPlanPhases.length || 0}
                </p>
                <div className='h-1.5 rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full bg-emerald-500'
                    style={{
                      width:
                        projectPlanPhases.length > 0
                          ? `${(completedPhases / projectPlanPhases.length) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='border-border bg-card text-card-foreground'>
              <CardContent className='space-y-1.5 p-3'>
                <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                  {t('timeline.summary.nextMilestone')}
                </p>
                <p className='text-base font-semibold text-sky-600 dark:text-sky-300'>
                  {nextMilestone?.name ?? '--'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {nextMilestone
                    ? `${t('timeline.deadlines.deadline')}: ${format(nextMilestone.targetDate, 'dd/MM/yyyy')}`
                    : t('timeline.deadlines.noDeadlines')}
                </p>
              </CardContent>
            </Card>

            <Card className='border-border bg-card text-card-foreground'>
              <CardContent className='space-y-1.5 p-3'>
                <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                  {t('timeline.summary.overallStatus')}
                </p>
                {selectedProjectScheduleStatus ? (
                  <div>
                    <Badge
                      variant={getStatusBadgeVariant(selectedProjectScheduleStatus)}
                      className='text-xs'
                    >
                      {t(getScheduleStatusTranslationKey(selectedProjectScheduleStatus))}
                    </Badge>
                  </div>
                ) : (
                  <p className='text-base font-semibold text-muted-foreground'>--</p>
                )}
                <p className='text-xs text-muted-foreground'>
                  {t('timeline.summary.delayedDays', { days: delayedDaysAccumulated })}
                </p>
              </CardContent>
            </Card>

            <Card className='border-border bg-card text-card-foreground'>
              <CardContent className='space-y-1.5 p-3'>
                <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                  {t('timeline.summary.definitions')}
                </p>
                <p className='text-base font-semibold'>
                  {pendingDefinitions} {t('timeline.summary.pending')}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {Math.max(0, milestones.length - pendingDefinitions)}{' '}
                  {t('timeline.summary.completed')}
                </p>
              </CardContent>
            </Card>

            <Card className='border-border bg-card text-card-foreground'>
              <CardContent className='space-y-1.5 p-3'>
                <p className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                  {t('timeline.summary.clientDecisions')}
                </p>
                <p className='text-base font-semibold'>
                  {(definitionCounts?.overdue ?? 0) > 0 ? (
                    <span className='text-amber-600 dark:text-amber-300'>
                      {definitionCounts.overdue} {t('timeline.summary.clientOverdue')}
                    </span>
                  ) : (
                    t('timeline.clientDefinitions.totalDefinitions', {
                      count: definitionCounts?.total ?? 0,
                    })
                  )}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {definitionCounts?.completed ?? 0} {t('timeline.summary.completed')}
                  {highImpactCount > 0 && (
                    <span className='ml-1 text-amber-600 dark:text-amber-400'>
                      · {highImpactCount} {t('timeline.summary.highImpact')}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {nextMilestone && (
            <Card className='border-sky-300/60 bg-sky-50/80 dark:border-sky-800/70 dark:bg-sky-950/20'>
              <CardContent className='flex flex-wrap items-center gap-2 p-3 text-sm'>
                <Sparkles className='h-4 w-4 text-sky-600 dark:text-sky-300' />
                <span className='font-medium text-sky-700 dark:text-sky-300'>
                  {t('timeline.banner.nextMilestone')}
                </span>
                <span>
                  {nextMilestone.name} — {format(nextMilestone.targetDate, 'dd/MM/yyyy')}
                </span>
              </CardContent>
            </Card>
          )}

          <div
            className={cn(
              'grid gap-4',
              showRightPanel ? 'xl:grid-cols-[minmax(0,1fr)_319px] xl:items-stretch' : 'grid-cols-1'
            )}
          >
          <div ref={globalTimelineCardRef} className='min-h-0'>
          <Card className='border-border bg-card text-card-foreground'>
            <CardHeader className='pb-2'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <CardTitle className='text-base'>{t('timeline.global.title')}</CardTitle>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {t('timeline.global.subtitle', { count: globalTimelineRows.length })}
                  </p>
                </div>

                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='glass-style-dark'
                    size='sm'
                    className='h-7 px-3 text-xs !rounded-full'
                    onClick={() => setShowRightPanel((prev) => !prev)}
                  >
                    {showRightPanel
                      ? t('timeline.sidebar.hideUpcomingDefinitions')
                      : t('timeline.sidebar.viewUpcomingDefinitions')}
                  </Button>
                  <div className='inline-flex items-center rounded-full border border-white/20 bg-white/5 p-1 backdrop-blur-sm'>
                    <Button
                      type='button'
                      size='sm'
                      variant={timeScale === 'month' ? 'glass-style-dark' : 'ghost'}
                      className='h-7 px-3 text-xs !rounded-full'
                      onClick={() => setTimeScale('month')}
                    >
                      {t('timeline.global.month')}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant={timeScale === 'year' ? 'glass-style-dark' : 'ghost'}
                      className='h-7 px-3 text-xs !rounded-full'
                      onClick={() => setTimeScale('year')}
                    >
                      {t('timeline.global.year')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className='overflow-x-auto rounded-lg border border-border bg-background/50'>
                <div
                  className='relative'
                  data-testid='project-timeline-canvas'
                  style={{
                    width: timelineCanvasWidth,
                    minWidth: timelineCanvasWidth,
                    height: timelineCanvasHeight,
                  }}
                >
                  <div
                    className='sticky left-0 top-0 z-30 h-full border-r border-border bg-card/95 backdrop-blur-sm'
                    style={{ width: timelineLabelWidth }}
                  >
                    <div
                      className='absolute bottom-0 top-0 w-px bg-border/70'
                      style={{ left: timelineLaneLabelColumnLeft - 6 }}
                    />
                    {globalTimelineRows.map((row, rowIndex) => {
                      const plannedY = getPlannedLaneY(rowIndex)
                      const executedY = getExecutedLaneY(rowIndex)

                      return (
                        <div key={`sticky-row-${row.projectId}`}>
                          <div
                            className='absolute left-3 truncate text-xs font-medium text-foreground'
                            style={{ top: plannedY - 10, width: timelineProjectNameWidth }}
                            title={row.projectName}
                          >
                            {row.projectName}
                          </div>

                          <div
                            className='absolute text-[10px] text-muted-foreground'
                            style={{ left: timelineLaneLabelColumnLeft, top: plannedY - 6 }}
                          >
                            {t('timeline.global.planned')}
                          </div>
                          <div
                            className='absolute text-[10px] text-muted-foreground'
                            style={{ left: timelineLaneLabelColumnLeft, top: executedY - 6 }}
                          >
                            {t('timeline.global.executed')}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <TodayIndicator left={globalTodayX} />
                  <div
                    className='absolute top-0 z-10 h-full w-px bg-cyan-500/80'
                    style={{ left: globalMinus30X }}
                  />
                  <div
                    className='absolute top-2 z-20 -translate-x-1/2 text-[10px] font-medium text-cyan-600 dark:text-cyan-300'
                    style={{ left: globalMinus30X }}
                  >
                    {t('timeline.today.minus30')}
                  </div>

                   {globalTicks.map((tick) => {
                     const left = timelineLabelWidth + getGlobalXPosition(tick)
                     return (
                       <div key={tick.toISOString()}>
                         <div
                           className='absolute top-0 h-full w-px bg-border'
                           style={{ left }}
                         />
                         <div
                           className='absolute top-2 -translate-x-1/2 text-[11px] font-medium text-muted-foreground'
                           style={{ left }}
                         >
                           {format(tick, timeScale === 'month' ? 'MMM/yy' : 'yyyy')}
                         </div>
                       </div>
                     )
                   })}

                   <MilestoneDependencyArrows
                     dependencies={globalMilestoneDependencies}
                     positions={milestonePositionsMap}
                   />

                  {globalTimelineRows.map((row, rowIndex) => {
                    const plannedY = getPlannedLaneY(rowIndex)
                    const executedY = getExecutedLaneY(rowIndex)

                    const plannedLeft = timelineLabelWidth + getGlobalXPosition(row.plannedDate)
                    const executedLeft = timelineLabelWidth + getGlobalXPosition(row.executedDate)

                    return (
                      <div key={`global-row-${row.projectId}`}>
                        <div
                          className='absolute h-[4px] rounded-full bg-sky-500/45'
                          style={{
                            left: timelineLabelWidth,
                            width: globalTimelineWidth,
                            top: plannedY,
                          }}
                        />
                        <div
                          className='absolute h-[4px] rounded-full bg-emerald-500/40'
                          style={{
                            left: timelineLabelWidth,
                            width: globalTimelineWidth,
                            top: executedY,
                          }}
                        />

                        <TimelineMilestone
                          left={plannedLeft}
                          top={plannedY}
                          label={`${row.projectName} · ${row.phaseName} - ${t('timeline.global.planned')}`}
                          date={row.plannedDate}
                          status='planned'
                          shape='circle'
                          dataTestId={`timeline-circle-planned-${row.projectId}-${row.phaseId}`}
                        />

                        <TimelineMilestone
                          left={executedLeft}
                          top={executedY}
                          label={`${row.projectName} · ${row.phaseName} - Status: ${row.executedStatus}`}
                          date={row.executedDate}
                          status={row.executedStatus}
                          shape='circle'
                          dataTestId={`timeline-circle-executed-${row.projectId}-${row.phaseId}`}
                        />

                        {row.milestones.map((milestone) => (
                          <TimelineMilestone
                            key={`global-milestone-${milestone.id}`}
                            left={timelineLabelWidth + getGlobalXPosition(milestone.targetDate)}
                            adjustedLeft={milestone.adjustedTargetDate ? timelineLabelWidth + getGlobalXPosition(milestone.adjustedTargetDate) : undefined}
                            top={executedY}
                            label={`${row.projectName} · ${milestone.name}`}
                            date={milestone.targetDate}
                            adjustedDate={milestone.adjustedTargetDate}
                            status={mapGlobalMilestoneStatus(milestone)}
                            shape='diamond'
                            dataTestId={`deadline-milestone-${milestone.id}`}
                            onClick={() => setSelectedMilestoneId(milestone.id)}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className='mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
                  {t('timeline.status.completed')} ({t('timeline.legend.onSchedule')})
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-amber-500' />
                  {t('timeline.status.attention')} ({t('timeline.legend.delayedTasks')})
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-red-500' />
                  {t('timeline.status.delayed')} ({t('timeline.legend.overdue')})
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-slate-400' />
                  {t('timeline.status.not_started')} ({t('timeline.legend.planned')})
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-400' />
                  {t('timeline.legend.definitionPending')}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rotate-45 rounded-[2px] bg-emerald-500' />
                  {t('timeline.legend.definitionCompleted')}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-purple-500' />
                  {t('timeline.legend.aiForecast')}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-0.5 w-4 bg-emerald-500' />
                  {t('timeline.today.indicator')}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='h-0.5 w-4 bg-cyan-500' />
                  {t('timeline.today.minus30')}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {showRightPanel && (
            <div
              className='min-h-0 overflow-hidden'
              style={globalTimelineCardHeight > 0 ? { height: `${globalTimelineCardHeight}px` } : undefined}
            >
              <Tabs
                value={sidebarTab}
                onValueChange={(val) => setSidebarTab(val as 'deadlines' | 'definitions')}
                className='flex h-full min-h-0 flex-col'
              >
                <div className='px-2 pt-1 pb-2'>
                  <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value='deadlines' className='text-xs'>
                      {t('timeline.sidebar.overview')}
                    </TabsTrigger>
                    <TabsTrigger value='definitions' className='text-xs'>
                      {t('timeline.clientDefinitions.title')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {sidebarTab === 'deadlines' && (
                  <Card className='flex h-full min-h-0 flex-col border-border bg-card text-card-foreground shadow-lg dark:border-slate-600/80 dark:bg-slate-900/95' data-testid='deadlines-panel'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='flex items-center gap-2 text-sm'>
                        <Sparkles className='h-4 w-4 text-rose-500' />
                        {t('timeline.sidebar.upcomingDefinitions')}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className='min-h-0 flex-1 overflow-hidden p-3 pt-0'>
                      <div className='h-full overflow-y-auto pr-1'>
                        <div className='space-y-3'>
                          <div className='rounded-lg border border-border bg-muted/20 p-2.5 dark:border-slate-600/80 dark:bg-slate-900/70'>
                            <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                              {t('timeline.sidebar.upcomingTasks')}
                            </p>
                            {isGlobalMilestonesLoading || isMilestonesLoading || addComment.isPending ? (
                              <p className='text-xs text-muted-foreground'>{t('timeline.loadingProjects')}</p>
                            ) : panelMilestones.length === 0 ? (
                              <p className='text-xs text-muted-foreground'>{t('timeline.deadlines.noDeadlines')}</p>
                            ) : (
                              <div className='space-y-1.5'>
                                {panelMilestones.map((milestone) => (
                                  <button
                                    key={milestone.id}
                                    type='button'
                                    onClick={() => setSelectedMilestoneId(milestone.id)}
                                    className={cn(
                                      'w-full rounded-md border p-2 text-left transition-colors',
                                      'border-border bg-background/80 hover:bg-muted/60 dark:border-slate-600/80 dark:bg-slate-950/70 dark:hover:bg-slate-800/70',
                                      milestone.id === selectedMilestoneId && 'border-sky-500/40 bg-sky-500/10'
                                    )}
                                  >
                                    <div className='flex items-start justify-between gap-2'>
                                      <div className='min-w-0'>
                                        <p className='truncate text-xs font-medium'>{milestone.name}</p>
                                        <p className='truncate text-[10px] text-muted-foreground'>
                                          {(projectNameByMilestoneId[milestone.id] || t('timeline.filters.allProjects'))}
                                        </p>
                                      </div>
                                      <Badge
                                        className={cn(
                                          'border px-1.5 py-0 text-[10px]',
                                          mapGlobalMilestoneStatus(milestone) === 'on_track' &&
                                            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
                                          mapGlobalMilestoneStatus(milestone) === 'delayed' &&
                                            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
                                          mapGlobalMilestoneStatus(milestone) === 'planned' &&
                                            'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300'
                                        )}
                                      >
                                        {t(`timeline.milestones.${milestone.status}`)}
                                      </Badge>
                                    </div>
                                    <div className='mt-1.5 flex items-center justify-between gap-2'>
                                      <p className='text-[10px] text-muted-foreground'>
                                        {t('timeline.deadlines.deadline')} {format(milestone.targetDate, 'dd/MM/yyyy')}
                                      </p>
                                      <div className='flex items-center gap-0.5'>
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='icon'
                                          className='h-5 w-5 text-slate-400 hover:bg-slate-500/10 hover:text-slate-300'
                                          title={t('timeline.comments.title')}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            setSelectedMilestoneId(milestone.id)
                                          }}
                                        >
                                          <MessageSquare className='h-3 w-3' />
                                        </Button>
                                        <Button
                                          type='button'
                                          variant='ghost'
                                          size='icon'
                                          className='h-5 w-5 text-slate-400 hover:bg-slate-500/10 hover:text-slate-300'
                                          title={t('timeline.dependencies.title')}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            setDependencyDialogState({
                                              open: true,
                                              milestone,
                                            })
                                          }}
                                        >
                                          <Link2 className='h-3 w-3' />
                                        </Button>
                                        {milestone.status === 'delayed' && (
                                          <Button
                                            type='button'
                                            variant='ghost'
                                            size='icon'
                                            className='h-5 w-5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                                            title={t('timeline.delays.addDelay')}
                                            data-testid={`sidebar-delay-${milestone.id}`}
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              handleDocumentDelay(milestone.id, milestone.name)
                                            }}
                                          >
                                            <AlertTriangle className='h-3 w-3' />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className='rounded-lg border border-border bg-muted/20 p-2.5 dark:border-slate-600/80 dark:bg-slate-900/70'>
                            <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                              {t('timeline.sidebar.phaseSummary')}
                            </p>
                            {phaseSummaryGroups.length === 0 ? (
                              <p className='text-xs text-muted-foreground'>{t('timeline.noProjects')}</p>
                            ) : (
                              <div className='space-y-2'>
                                {phaseSummaryGroups.map((group) => (
                                  <div key={group.projectId} className='space-y-1'>
                                    <p className='truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                                      {group.projectName}
                                    </p>
                                    <div className='flex items-center justify-between gap-2 text-xs'>
                                      <span className='truncate pl-2'>{group.phaseName}</span>
                                      <Badge variant={getStatusBadgeVariant(group.scheduleStatus)} className='px-1.5 py-0 text-[10px]'>
                                        {t(getScheduleStatusTranslationKey(group.scheduleStatus))}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {selectedMilestoneId && (
                            <div className='rounded-lg border border-border bg-muted/20 p-2.5 dark:border-slate-600/80 dark:bg-slate-900/70'>
                              <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                                {t('timeline.comments.title')}
                              </p>
                              <ScrollArea className='h-64 w-full'>
                                <MilestoneCommentsThread milestoneId={selectedMilestoneId} />
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {sidebarTab === 'definitions' && (
                  <ClientDefinitionsPanel
                    definitions={definitions}
                    isLoading={isDefinitionsLoading}
                    onLogFollowUp={(id, note) => logDefinitionFollowUp.mutate({ definitionId: id, note })}
                    onUpdateStatus={(id, status) => updateDefinitionStatus.mutate({ definitionId: id, status })}
                    onAddDefinition={
                      selectedProjectId
                        ? () => setDefinitionDialogState({ open: true, projectId: selectedProjectId })
                        : undefined
                    }
                    onSelectDefinition={(id) =>
                      setDefinitionDialogState({
                        open: true,
                        definitionId: id,
                        projectId: selectedProjectId ?? effectiveProjectId ?? '',
                      })
                    }
                    className='h-full min-h-0'
                  />
                )}
              </Tabs>
            </div>
          )}
          </div>

          <div className='space-y-4'>
            <Collapsible
              open={benchmarkSectionExpanded}
              onOpenChange={setBenchmarkSectionExpanded}
            >
              <Card className='border-border bg-card text-card-foreground'>
                <CardHeader className='pb-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <CardTitle className='text-sm'>
                      {t('timeline.benchmark.title')}
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 gap-1.5 px-3 text-xs'
                      >
                        {benchmarkSectionExpanded ? (
                          <>
                            <ChevronUp className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.collapse')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.expand')}
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className='pt-0'>
                    <div className='max-h-[480px] w-full overflow-auto'>
                      <BenchmarkTable 
                        showComparison={!!selectedProjectId}
                        currentProjectAreaM2={projectAreaM2 > 0 ? projectAreaM2 : undefined}
                        currentProjectTotalCost={projectTotalCost > 0 ? projectTotalCost : undefined}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Collapsible
              open={analyticsSectionExpanded}
              onOpenChange={setAnalyticsSectionExpanded}
            >
              <Card className='border-border bg-card text-card-foreground'>
                <CardHeader className='pb-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <CardTitle className='text-sm'>
                      {t('timeline.analytics.title')}
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 gap-1.5 px-3 text-xs'
                      >
                        {analyticsSectionExpanded ? (
                          <>
                            <ChevronUp className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.collapse')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.expand')}
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className='pt-0'>
                    <DelayAnalyticsCard
                      projectId={selectedProjectId}
                      className='w-full'
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          <Collapsible
            open={selectedDetailsSectionExpanded}
            onOpenChange={setSelectedDetailsSectionExpanded}
          >
            <Card className='border-border bg-card text-card-foreground'>
              <CardHeader className='pb-2'>
                <div className='flex flex-col gap-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <CardTitle className='text-sm'>{t('timeline.sections.selectedDetails')}</CardTitle>
                      <div className='inline-flex rounded-md border border-border bg-muted/40 p-1'>
                      <Button
                        type='button'
                        size='sm'
                        variant={detailsView === 'project' ? 'default' : 'ghost'}
                        className='h-7 px-3 text-xs'
                        onClick={() => setDetailsView('project')}
                      >
                        {t('timeline.sections.projectView')}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={detailsView === 'phase' ? 'default' : 'ghost'}
                        className='h-7 px-3 text-xs'
                        onClick={() => setDetailsView('phase')}
                      >
                        {t('timeline.sections.phaseView')}
                      </Button>
                    </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 gap-1.5 px-3 text-xs'
                      >
                        {selectedDetailsSectionExpanded ? (
                          <>
                            <ChevronUp className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.collapse')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className='h-3.5 w-3.5' />
                            {t('timeline.benchmark.expand')}
                          </>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
                    {detailsView === 'phase' && (
                      <Select value={selectedPhaseName} onValueChange={setSelectedPhaseName}>
                        <SelectTrigger className='h-8 w-full border-border bg-background text-xs sm:w-[320px]'>
                          <SelectValue placeholder={t('timeline.sections.compareByPhase')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>{t('timeline.sections.allPhases')}</SelectItem>
                          {phaseNameOptions.map((phaseName) => (
                            <SelectItem key={phaseName} value={phaseName}>
                              {phaseName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent>
              {detailsView === 'project' && effectiveProjectId ? (
                <ProjectPlanView
                  key={effectiveProjectId}
                  projectId={effectiveProjectId}
                  canEdit
                  projectBudget={0}
                  project={selectedProjectRecord as any}
                  phases={projectPlanPhases}
                  activities={projectPlanActivities}
                />
              ) : (
                <ProjectPlanView
                  key={`phase-comparison-${selectedPhaseName}`}
                  projectId={selectedProjectId ?? allProjects[0]?.id ?? 'phase-comparison'}
                  canEdit={false}
                  projectBudget={0}
                  phases={phaseComparisonPlanPhases}
                  activities={phaseComparisonPlanActivities}
                />
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      <DelayDocumentationDialog
        open={delayDialogState.open}
        onOpenChange={(open) =>
          setDelayDialogState((prev) => ({ ...prev, open }))
        }
        milestoneId={delayDialogState.milestoneId}
        milestoneName={delayDialogState.milestoneName}
        projectId={delayDialogState.projectId}
      />

      <ClientDefinitionDialog
        open={definitionDialogState.open}
        onOpenChange={(open) =>
          setDefinitionDialogState((prev) => ({ ...prev, open }))
        }
        definitionId={definitionDialogState.definitionId}
        projectId={definitionDialogState.projectId}
      />

      {dependencyDialogState.milestone && (
        <MilestoneDependencyDialog
          open={dependencyDialogState.open}
          onOpenChange={(open) => setDependencyDialogState((prev) => ({ ...prev, open }))}
          milestone={dependencyDialogState.milestone}
          allMilestones={globalMilestones.filter((m) => m.projectId === dependencyDialogState.milestone?.projectId)}
          projectId={dependencyDialogState.milestone.projectId}
        />
      )}

    </div>
  )
}
