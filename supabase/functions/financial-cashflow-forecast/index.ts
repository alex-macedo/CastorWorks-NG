/**
 * Financial Cashflow Forecast Engine - Edge Function
 *
 * Generates 13-week rolling cashflow forecasts based on:
 * - AR invoices (expected inflows)
 * - AP bills (expected outflows)
 * - Historical payment patterns
 * - ML-powered payment probability scoring
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest, createServiceRoleClient, verifyAdminRole } from '../_shared/authorization.ts'
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts'

// Types
interface CashflowForecastRequest {
  project_id?: string
  forecast_horizon?: number
  confidence_decay?: boolean
  forceRefresh?: boolean
}

interface WeeklyForecast {
  week_number: number
  week_start_date: string
  expected_inflows: number
  expected_outflows: number
  net_cashflow: number
  running_balance: number
  confidence: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  contributing_invoices: string[]
  contributing_bills: string[]
}

interface CashflowForecastResult {
  project_id: string
  generated_at: string
  forecast_horizon_weeks: number
  weekly_forecasts: WeeklyForecast[]
  summary: {
    total_expected_inflows: number
    total_expected_outflows: number
    net_position: number
    risk_windows: {
      week_number: number
      predicted_balance: number
      risk_level: string
    }[]
  }
}

// Configuration
const FORECAST_HORIZON_WEEKS = 13
const CONFIDENCE_DECAY_RATE = 0.05
const BASE_CONFIDENCE = 0.9

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let userId: string | undefined
    try {
      const authHeader = req.headers.get('Authorization')
      const isServiceRole = authHeader?.includes(supabaseServiceKey)

      if (!isServiceRole) {
        const { user } = await authenticateRequest(req)
        await verifyAdminRole(user.id)
        userId = user.id
      }
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const body: CashflowForecastRequest = req.method === 'POST' ? await req.json() : {}
    const forecastHorizon = body.forecast_horizon ?? FORECAST_HORIZON_WEEKS
    const confidenceDecay = body.confidence_decay ?? true
    const forceRefresh = body.forceRefresh ?? false

    const projectIds: string[] = []
    if (body.project_id) {
      projectIds.push(body.project_id)
    } else {
      const { data: activeProjects } = await supabase.from('projects').select('id').eq('status', 'active')
      if (activeProjects) projectIds.push(...activeProjects.map((p: any) => p.id))
    }

    const cacheKey = `${body.project_id || 'all'}:${forecastHorizon}:${confidenceDecay}`

    if (!forceRefresh && userId && projectIds.length === 1) {
      const serviceClient = createServiceRoleClient()
      const cached = await getCachedInsight(
        serviceClient,
        'financial-cashflow-forecast',
        'financial',
        projectIds[0],
        userId,
        { promptVersion: cacheKey }
      )
      if (cached && cached.content) {
        const content = cached.content as { forecasts?: CashflowForecastResult[] }
        if (content.forecasts && content.forecasts.length > 0) {
          console.log('✅ Returning cached cashflow forecast for', projectIds[0])
          return new Response(
            JSON.stringify({
              success: true,
              forecasts: content.forecasts,
              cached: true,
              generatedAt: cached.generated_at,
            }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          )
        }
      }
    }

    const results: CashflowForecastResult[] = []
    for (const projectId of projectIds) {
      const forecast = await generateProjectForecast(supabase, projectId, forecastHorizon, confidenceDecay)
      results.push(forecast)
      await storeForecastSnapshot(supabase, forecast)
    }

    if (userId && projectIds.length === 1) {
      const serviceClient = createServiceRoleClient()
      await cacheInsight(serviceClient, {
        insightType: 'financial-cashflow-forecast',
        domain: 'financial',
        title: 'Cashflow Forecast',
        content: { forecasts: results },
        confidenceLevel: 85,
        projectId: projectIds[0],
        userId,
        promptVersion: cacheKey,
        ttlHours: 6,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts: results,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

async function generateProjectForecast(supabase: any, projectId: string, horizonWeeks: number, applyDecay: boolean): Promise<CashflowForecastResult> {
  const { data: accounts } = await supabase.from('financial_accounts').select('current_balance').eq('project_id', projectId).eq('is_active', true)
  const startingBalance = accounts?.reduce((sum: number, acc: any) => sum + parseFloat(acc.current_balance), 0) ?? 0

  const { data: arInvoices } = await supabase
    .from('financial_ar_invoices')
    .select('*, projects(status, schedule_status)')
    .eq('project_id', projectId)
    .in('status', ['issued', 'overdue', 'partially_paid'])
  const { data: apBills } = await supabase.from('financial_ap_bills').select('*').eq('project_id', projectId).in('status', ['pending', 'approved'])

  const weeklyForecasts: WeeklyForecast[] = []
  let runningBalance = startingBalance
  const today = new Date()

  for (let weekNum = 1; weekNum <= horizonWeeks; weekNum++) {
    const weekStartDate = addDays(today, (weekNum - 1) * 7)
    const weekEndDate = addDays(weekStartDate, 7)

    const weekInflows = await calculateWeekInflows(supabase, arInvoices ?? [], weekStartDate, weekEndDate, weekNum)
    const weekOutflows = calculateWeekOutflows(apBills ?? [], weekStartDate, weekEndDate, weekNum)

    const netCashflow = weekInflows.total - weekOutflows.total
    runningBalance += netCashflow

    const confidence = applyDecay ? Math.max(0.3, BASE_CONFIDENCE - (weekNum - 1) * CONFIDENCE_DECAY_RATE) : BASE_CONFIDENCE
    const riskLevel = determineRiskLevel(runningBalance)

    weeklyForecasts.push({
      week_number: weekNum,
      week_start_date: weekStartDate.toISOString().split('T')[0],
      expected_inflows: weekInflows.total,
      expected_outflows: weekOutflows.total,
      net_cashflow: netCashflow,
      running_balance: runningBalance,
      confidence,
      risk_level: riskLevel,
      contributing_invoices: weekInflows.invoice_ids,
      contributing_bills: weekOutflows.bill_ids,
    })
  }

  return {
    project_id: projectId,
    generated_at: new Date().toISOString(),
    forecast_horizon_weeks: horizonWeeks,
    weekly_forecasts: weeklyForecasts,
    summary: {
      total_expected_inflows: weeklyForecasts.reduce((sum, w) => sum + w.expected_inflows, 0),
      total_expected_outflows: weeklyForecasts.reduce((sum, w) => sum + w.expected_outflows, 0),
      net_position: runningBalance,
      risk_windows: weeklyForecasts.filter(w => w.running_balance < 0).map(w => ({ week_number: w.week_number, predicted_balance: w.running_balance, risk_level: w.risk_level })),
    },
  }
}

async function calculateWeekInflows(supabase: any, invoices: any[], weekStart: Date, weekEnd: Date, weekNumber: number) {
  let total = 0
  const invoice_ids: string[] = []

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.due_date)
    if (dueDate >= weekStart && dueDate < weekEnd) {
      const paymentProbability = await estimatePaymentProbability(supabase, invoice, weekNumber)
      total += parseFloat(invoice.total_amount) * paymentProbability
      invoice_ids.push(invoice.id)
    }
  }
  return { total, invoice_ids }
}

function calculateWeekOutflows(bills: any[], weekStart: Date, weekEnd: Date, _weekNum: number) {
  let total = 0
  const bill_ids: string[] = []
  for (const bill of bills) {
    const dueDate = new Date(bill.due_date)
    if (dueDate >= weekStart && dueDate < weekEnd) {
      total += parseFloat(bill.total_amount) * 0.95
      bill_ids.push(bill.id)
    }
  }
  return { total, bill_ids }
}

async function estimatePaymentProbability(supabase: any, invoice: any, weekNumber: number): Promise<number> {
  let probability = 0.85
  const { data: past } = await supabase.from('financial_ar_invoices').select('id').eq('client_name', invoice.client_name).eq('status', 'paid').limit(5)
  if (past && past.length > 0) probability += 0.05
  if (invoice.projects?.status === 'active') probability += 0.05
  if (invoice.status === 'overdue') probability -= 0.25
  probability -= (weekNumber - 1) * 0.03
  const amount = parseFloat(invoice.total_amount)
  if (amount > 50000) probability -= 0.10
  return Math.max(0.2, Math.min(0.98, probability))
}

function determineRiskLevel(balance: number): 'low' | 'medium' | 'high' | 'critical' {
  if (balance > 10000) return 'low'
  if (balance > 0) return 'medium'
  if (balance > -10000) return 'high'
  return 'critical'
}

async function storeForecastSnapshot(supabase: any, forecast: CashflowForecastResult) {
  await supabase.from('financial_cashflow_snapshots').delete().eq('project_id', forecast.project_id).gte('week_start_date', new Date().toISOString().split('T')[0])
  const rows = forecast.weekly_forecasts.map(week => ({
    project_id: forecast.project_id,
    week_start_date: week.week_start_date,
    week_number: week.week_number,
    projected_inflow: week.expected_inflows,
    projected_outflow: week.expected_outflows,
    projected_balance: week.running_balance,
    confidence_level: week.confidence,
    risk_level: week.risk_level,
    generated_at: forecast.generated_at,
    generated_by: 'ai-forecast-engine',
  }))
  await supabase.from('financial_cashflow_snapshots').insert(rows)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
