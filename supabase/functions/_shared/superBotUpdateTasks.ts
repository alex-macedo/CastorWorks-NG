export const BULK_LIMIT = 100
export const OVERRIDE_PHRASE = 'override bulk update'

export type UpdateTasksUntilTodayResult =
  | { outcome: 'project_required' }
  | { outcome: 'project_not_found'; projectIdentifier: string }
  | { outcome: 'guardrail_blocked'; projectId: string; projectName: string; untilDate: string; attemptedCount: number }
  | { outcome: 'no_pending_tasks'; projectId: string; projectName: string; untilDate: string }
  | {
      outcome: 'updated'
      projectId: string
      projectName: string
      untilDate: string
      updatedCount: number
      taskIds: string[]
      completedStatusId: string | null
    }

type SupabaseLike = {
  from: (table: string) => any
}

const isUUID = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export const extractProjectIdentifier = (message: string): string | null => {
  const quoted = message.match(/["']([^"']+)["']/)
  if (quoted?.[1]) return quoted[1].trim()

  const pattern = /project\s+(.+?)(?:\s+until|\s+as\s+of|\s+today|$)/i
  const match = message.match(pattern)
  if (match?.[1]) return match[1].trim()

  return null
}

export async function executeUpdateTasksUntilToday(params: {
  supabase: SupabaseLike
  projectIdentifier?: string | null
  untilDate: string
  forceUpdate?: boolean
  overridePhrase?: string | null
}): Promise<UpdateTasksUntilTodayResult> {
  const projectIdentifier = String(params.projectIdentifier || '').trim()
  if (!projectIdentifier) {
    return { outcome: 'project_required' }
  }

  const projectQuery = isUUID(projectIdentifier)
    ? params.supabase.from('projects').select('id, name').eq('id', projectIdentifier).limit(1)
    : params.supabase.from('projects').select('id, name').ilike('name', `%${projectIdentifier}%`).limit(1)

  const { data: projectRows, error: projectError } = await projectQuery
  if (projectError) throw projectError

  const project = projectRows?.[0]
  if (!project) {
    return { outcome: 'project_not_found', projectIdentifier }
  }

  const { data: allCandidates, error: candidatesError } = await params.supabase
    .from('architect_tasks')
    .select('id, title, due_date, status, status_id')
    .eq('project_id', project.id)
    .lte('due_date', params.untilDate)
    .limit(300)

  if (candidatesError) throw candidatesError

  const candidates = (allCandidates || []).filter((task: Record<string, unknown>) => {
    const status = String(task.status || '').toLowerCase()
    return !['completed', 'done'].includes(status)
  })

  const effectiveForce = Boolean(params.forceUpdate)
  const effectiveOverride = String(params.overridePhrase || '').trim().toLowerCase()

  if (candidates.length > BULK_LIMIT && !effectiveForce && effectiveOverride !== OVERRIDE_PHRASE) {
    return {
      outcome: 'guardrail_blocked',
      projectId: String(project.id),
      projectName: String(project.name),
      untilDate: params.untilDate,
      attemptedCount: candidates.length,
    }
  }

  if (candidates.length === 0) {
    return {
      outcome: 'no_pending_tasks',
      projectId: String(project.id),
      projectName: String(project.name),
      untilDate: params.untilDate,
    }
  }

  const { data: statuses, error: statusesError } = await params.supabase
    .from('project_task_statuses')
    .select('id, is_completed')
    .eq('project_id', project.id)
    .eq('is_completed', true)
    .limit(1)

  if (statusesError) throw statusesError

  const completedStatusId = statuses?.[0]?.id ? String(statuses[0].id) : null
  const taskIds = candidates.map((task: Record<string, unknown>) => String(task.id))

  const updatePayload: Record<string, unknown> = {
    status: 'completed',
    updated_at: new Date().toISOString(),
  }

  if (completedStatusId) {
    updatePayload.status_id = completedStatusId
  }

  const { error: updateError } = await params.supabase
    .from('architect_tasks')
    .update(updatePayload)
    .in('id', taskIds)

  if (updateError) throw updateError

  return {
    outcome: 'updated',
    projectId: String(project.id),
    projectName: String(project.name),
    untilDate: params.untilDate,
    updatedCount: candidates.length,
    taskIds,
    completedStatusId,
  }
}
