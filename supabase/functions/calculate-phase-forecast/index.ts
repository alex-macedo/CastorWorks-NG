/**
 * Calculate Phase Forecast - Edge Function
 *
 * Recalculates adjusted phase end dates based on delivery velocity and
 * writes the result back to project_phases.adjusted_end_date.
 *
 * Includes:
 * - Access verification with has_project_access
 * - Cache lookup in ai_insights
 * - Recovery check (recent generated result in the last 10 minutes)
 * - Project context injection in response payload
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  authenticateRequest,
  createServiceRoleClient,
  verifyProjectAccess,
} from '../_shared/authorization.ts'
import { cacheInsight, getCachedInsight } from '../_shared/aiCache.ts'
import { createErrorResponse } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ForecastRequest {
  projectId?: string
  phaseId?: string
  forceRefresh?: boolean
}

interface PhaseRow {
  id: string
  project_id: string
  phase_name: string
  start_date: string | null
  end_date: string | null
  budget_allocated?: number | null
  adjusted_end_date?: string | null
  completion_date?: string | null
  progress_percentage: number | null
  status: string | null
  updated_at?: string | null
}

interface PhaseForecastResult {
  phaseId: string
  phaseName: string
  adjustedEndDate: string
  velocity: number
  estimatedRemainingDays: number
  riskBufferDays: number
  intervalDays: number
  status: 'on_track' | 'delayed' | 'ahead'
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function clampProgress(value: number | null): number {
  if (!value) return 0
  return Math.max(0, Math.min(100, value))
}

function calculatePhaseForecast(phase: PhaseRow): PhaseForecastResult | null {
  if (!phase.start_date || !phase.end_date) return null

  const today = new Date()
  const startDate = new Date(phase.start_date)
  const plannedEndDate = new Date(phase.end_date)
  const progress = clampProgress(phase.progress_percentage)

  if (progress >= 100) {
    const completedDate = phase.completion_date ? new Date(phase.completion_date) : today
    const intervalDays = Math.round(
      (plannedEndDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      phaseId: phase.id,
      phaseName: phase.phase_name,
      adjustedEndDate: toIsoDate(completedDate),
      velocity: 100,
      estimatedRemainingDays: 0,
      riskBufferDays: 0,
      intervalDays,
      status: intervalDays < 0 ? 'delayed' : intervalDays > 0 ? 'ahead' : 'on_track',
    }
  }

  const daysElapsed = Math.max(
    1,
    Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  )
  const plannedDuration = Math.max(
    1,
    Math.floor((plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  )

  const velocity = progress > 0 ? progress / daysElapsed : 0
  const remainingPercent = Math.max(0, 100 - progress)
  const estimatedRemainingDays =
    velocity > 0 ? Math.ceil(remainingPercent / velocity) : plannedDuration
  const riskBufferDays = Math.ceil(Math.max(1, estimatedRemainingDays * 0.1))
  const adjustedDate = new Date(today)
  adjustedDate.setDate(today.getDate() + estimatedRemainingDays + riskBufferDays)

  const intervalDays = Math.round(
    (plannedEndDate.getTime() - adjustedDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    phaseId: phase.id,
    phaseName: phase.phase_name,
    adjustedEndDate: toIsoDate(adjustedDate),
    velocity: Number(velocity.toFixed(4)),
    estimatedRemainingDays,
    riskBufferDays,
    intervalDays,
    status: intervalDays < 0 ? 'delayed' : intervalDays > 0 ? 'ahead' : 'on_track',
  }
}

function buildPromptVersion(phases: PhaseRow[]): string {
  const fingerprint = phases
    .map(
      (phase) =>
        `${phase.id}:${phase.progress_percentage ?? 0}:${phase.updated_at ?? ''}:${
          phase.end_date ?? ''
        }`
    )
    .join('|')

  return fingerprint || 'no-phases'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user } = await authenticateRequest(req)
    const supabase = createServiceRoleClient()

    const body = (await req.json()) as ForecastRequest
    const projectId = body.projectId
    const phaseId = body.phaseId
    const forceRefresh = body.forceRefresh ?? false

    if (!projectId && !phaseId) {
      return new Response(
        JSON.stringify({ error: 'projectId or phaseId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let phases: PhaseRow[] = []
    let resolvedProjectId = projectId

    if (phaseId) {
      const { data: phase, error: phaseError } = await supabase
        .from('project_phases')
        .select(
          'id, project_id, phase_name, start_date, end_date, budget_allocated, adjusted_end_date, completion_date, progress_percentage, status, updated_at'
        )
        .eq('id', phaseId)
        .single()

      if (phaseError || !phase) {
        return new Response(JSON.stringify({ error: 'Phase not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      resolvedProjectId = phase.project_id
      phases = [phase as PhaseRow]
    } else if (projectId) {
      const { data: phaseRows, error: phasesError } = await supabase
        .from('project_phases')
        .select(
          'id, project_id, phase_name, start_date, end_date, budget_allocated, adjusted_end_date, completion_date, progress_percentage, status, updated_at'
        )
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (phasesError) throw phasesError
      phases = (phaseRows as PhaseRow[]) ?? []
    }

    await verifyProjectAccess(user.id, resolvedProjectId, supabase)

    if (!resolvedProjectId) {
      return new Response(JSON.stringify({ error: 'Unable to resolve projectId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: projectContext } = await supabase
      .from('projects')
      .select('id, name, status, total_area, manager')
      .eq('id', resolvedProjectId)
      .single()

    const totalBudgetAllocated = phases.reduce(
      (sum, phase: any) => sum + Number(phase.budget_allocated || 0),
      0
    )

    const promptVersion = buildPromptVersion(phases)

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'calculate-phase-forecast',
        'timeline',
        resolvedProjectId,
        user.id,
        { promptVersion }
      )

      if (cached && cached.content) {
        return new Response(
          JSON.stringify({
            success: true,
            ...cached.content,
            cached: true,
            generatedAt: cached.generated_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: recoveryCache } = await supabase
        .from('ai_insights')
        .select('content, generated_at')
        .eq('insight_type', 'calculate-phase-forecast')
        .eq('domain', 'timeline')
        .eq('project_id', resolvedProjectId)
        .eq('is_active', true)
        .gte('generated_at', tenMinutesAgo)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recoveryCache?.content) {
        return new Response(
          JSON.stringify({
            success: true,
            ...recoveryCache.content,
            cached: true,
            recovery: true,
            generatedAt: recoveryCache.generated_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const results = phases
      .map((phase) => calculatePhaseForecast(phase))
      .filter((result): result is PhaseForecastResult => Boolean(result))

    for (const result of results) {
      const { error: updateError } = await supabase
        .from('project_phases')
        .update({ adjusted_end_date: result.adjustedEndDate })
        .eq('id', result.phaseId)

      if (updateError) throw updateError
    }

    const adjustedProjectEndDate =
      results.length > 0
        ? results
            .map((result) => new Date(result.adjustedEndDate))
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : null

    const payload = {
      projectId: resolvedProjectId,
      phaseId: phaseId ?? null,
      context: {
        status: projectContext?.status ?? null,
        totalArea: projectContext?.total_area ?? null,
        manager: projectContext?.manager ?? null,
        budgetAllocated: totalBudgetAllocated,
      },
      projectAdjustedEndDate: adjustedProjectEndDate ? toIsoDate(adjustedProjectEndDate) : null,
      results,
    }

    await cacheInsight(supabase, {
      insightType: 'calculate-phase-forecast',
      domain: 'timeline',
      title: `Timeline forecast for ${projectContext?.name ?? 'project'}`,
      content: payload,
      confidenceLevel: 82,
      projectId: resolvedProjectId,
      userId: user.id,
      promptVersion,
      ttlHours: 6,
    })

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        generatedAt: new Date().toISOString(),
        ...payload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return createErrorResponse(error, corsHeaders)
  }
})
