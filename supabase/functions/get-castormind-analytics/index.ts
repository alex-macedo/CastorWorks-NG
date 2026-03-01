import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await authenticateRequest(req)
    const supabase = createServiceRoleClient()

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const days = Number(body?.days || 30)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)

    const role = String(roles?.[0]?.role || 'viewer')
    const allow = ['admin', 'project_manager', 'global_admin'].includes(role)
    if (!allow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: events, error } = await supabase
      .from('castormind_analytics_events')
      .select('event_at, intent, tool_name, status, duration_ms, role')
      .gte('event_at', since)
      .order('event_at', { ascending: false })
      .limit(2000)

    if (error) throw error
    const rows = events || []

    const requestFinishes = rows.filter(r => r.status)
    const totalRequests = requestFinishes.length
    const successCount = requestFinishes.filter(r => r.status === 'success').length
    const errorCount = requestFinishes.filter(r => r.status === 'error').length
    const blockedCount = requestFinishes.filter(r => r.status === 'guardrail_blocked').length
    const partialCount = requestFinishes.filter(r => r.status === 'partial_success').length

    const durations = requestFinishes
      .map(r => Number(r.duration_ms || 0))
      .filter(v => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b)

    const p95DurationMs = durations.length
      ? durations[Math.max(0, Math.floor(durations.length * 0.95) - 1)]
      : 0

    const byIntent: Record<string, number> = {}
    for (const row of requestFinishes) {
      const key = String(row.intent || 'unknown')
      byIntent[key] = (byIntent[key] || 0) + 1
    }

    const byTool: Record<string, number> = {}
    for (const row of rows) {
      if (!row.tool_name) continue
      const key = String(row.tool_name)
      byTool[key] = (byTool[key] || 0) + 1
    }

    return new Response(
      JSON.stringify({
        kpis: {
          totalRequests,
          successRate: totalRequests ? Number((successCount / totalRequests * 100).toFixed(2)) : 0,
          errorRate: totalRequests ? Number((errorCount / totalRequests * 100).toFixed(2)) : 0,
          guardrailBlocks: blockedCount,
          partialSuccess: partialCount,
          p95DurationMs,
        },
        topIntents: Object.entries(byIntent)
          .map(([intent, count]) => ({ intent, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        topTools: Object.entries(byTool)
          .map(([tool, count]) => ({ tool, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        recent: rows.slice(0, 30),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
