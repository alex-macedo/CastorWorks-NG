/**
 * Weekly Financial & Project Reporting Engine
 *
 * Generates automated weekly summaries for project stakeholders using:
 * - Cashflow forecast data
 * - Recent financial entries
 * - Project task progress
 * - CastorMind AI narrative generation
 *
 * Uses ai_insights cache (6h TTL) plus recovery check (generated_reports, 10min).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAICompletion } from '../_shared/aiProviderClient.ts'
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts'
import { authenticateRequest, verifyProjectAccess } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** ISO week start (Monday) for cache key */
function getWeekStartKey(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().split('T')[0]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let user
  try {
    const auth = await authenticateRequest(req)
    user = auth.user
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { project_id, forceRefresh } = await req.json()

    // Verify project access
    try {
      await verifyProjectAccess(user.id, project_id, supabase)
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Weekly Report] Request for project: ${project_id}`)

    const promptVersion = getWeekStartKey()

    // 1. Check ai_insights cache (6h TTL)
    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'generate-weekly-reports',
        'reports',
        project_id,
        undefined,
        { promptVersion }
      )
      if (cached && cached.content) {
        const c = cached.content as { report_id?: string; summary?: string }
        if (c.summary) {
          console.log(`[Weekly Report] Cache HIT for project: ${project_id}`)
          return new Response(
            JSON.stringify({
              success: true,
              report_id: c.report_id ?? null,
              summary: c.summary,
              cached: true,
              generatedAt: cached.generated_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }
    }

    // 2. Recovery: recent report in last 10 minutes (gateway timeout recovery)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString()
    const { data: existingReport } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('project_id', project_id)
      .eq('generated_by', 'ai-reporting-engine')
      .gte('generated_at', tenMinutesAgo)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingReport && !forceRefresh) {
      console.log(`[Weekly Report] Returning recent existing report for project: ${project_id}`)
      return new Response(
        JSON.stringify({
          success: true,
          report_id: existingReport.id,
          summary: (existingReport.configuration as Record<string, unknown>)?.summary || '',
          cached: true,
          generatedAt: existingReport.generated_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 1. Fetch Project Info
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // 2. Fetch Latest Forecast
    const { data: forecast } = await supabase
      .from('financial_cashflow_snapshots')
      .select('*')
      .eq('project_id', project_id)
      .order('week_start_date', { ascending: true })
      .limit(4)

    // 3. Fetch Recent Financial Activity (Last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentEntries } = await supabase
      .from('project_financial_entries')
      .select('*')
      .eq('project_id', project_id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])

    // 4. Fetch Recent Tasks Progress
    const { data: recentTasks } = await supabase
      .from('office_tasks')
      .select('*')
      .eq('status', 'completed')
      .gte('updated_at', sevenDaysAgo.toISOString())

    // 5. Generate AI Summary
    const prompt = `
      Project: ${project?.name || 'Unknown Project'}
      Current Status: ${project?.status || 'Unknown Status'}
      
      Financial Data (Last 7 Days):
      - Invoices Issued: ${recentEntries?.filter((e: any) => e.entry_type === 'income').length || 0}
      - Bills Recorded: ${recentEntries?.filter((e: any) => e.entry_type === 'expense').length || 0}
      - Total Spent: ${recentEntries?.filter((e: any) => e.entry_type === 'expense').reduce((s: number, e: any) => s + Number(e.amount), 0) || 0} BRL
      
      Cashflow Forecast (Next 4 Weeks):
      ${forecast?.map((f: any) => `Week ${f.week_number}: Bal ${f.projected_balance} BRL (${f.risk_level} risk)`).join('\n') || 'No forecast available.'}
      
      Recent Accomplishments:
      ${recentTasks?.map((t: any) => `- ${t.title}`).join('\n') || 'No tasks completed this week.'}
      
      Generate a professional weekly executive summary for the project owner. 
      Include a "Financial Health" section, a "Progress Update" section, and "Upcoming Risks" if any.
      Keep it concise and actionable.
    `

    console.log(`[Weekly Report] Calling AI Provider...`)

    const aiResponse = await getAICompletion({
      prompt,
      systemMessage: "You are CastorMind AI, the expert financial advisor for CastorWorks. Your goal is to provide clear, data-driven project insights.",
      maxTokens: 1000,
    })

    const reportContent = aiResponse.content

    // 6. Store Report
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .insert({
        project_id,
        report_type: 'weekly_summary',
        report_name: `Weekly Summary - ${new Date().toLocaleDateString()}`,
        configuration: {
          summary: reportContent,
          metrics: {
            recent_spend: recentEntries?.filter((e: any) => e.entry_type === 'expense').reduce((s: number, e: any) => s + Number(e.amount), 0) || 0,
            tasks_completed: recentTasks?.length || 0,
            risk_level: forecast?.[0]?.risk_level || 'unknown'
          }
        },
        generated_by: 'ai-reporting-engine'
      })
      .select()
      .single()

    if (reportError) throw reportError

    // Store in ai_insights cache (6h TTL)
    await cacheInsight(supabase, {
      insightType: 'generate-weekly-reports',
      domain: 'reports',
      title: 'Weekly Summary',
      content: { report_id: report.id, summary: reportContent },
      confidenceLevel: 85,
      projectId: project_id,
      promptVersion,
      ttlHours: 6,
    })

    console.log(`[Weekly Report] Report generated and stored: ${report.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        summary: reportContent,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('[Weekly Report] Error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
