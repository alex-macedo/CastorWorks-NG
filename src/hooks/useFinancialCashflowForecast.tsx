import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useMemo, useCallback } from 'react'
import type {
  FinancialCashflowSnapshot,
  CashflowForecast,
  CashflowWeekProjection,
  CashflowRiskWindow,
  RiskLevel,
} from '@/types/finance'

const TABLE = 'financial_cashflow_snapshots'
const QUERY_KEY = 'financial_cashflow_forecast'

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

function getWeekLabel(date: Date): string {
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

function getWeekStartDate(weeksFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + weeksFromNow * 7)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function buildFallbackForecast(
  inflows: number[],
  outflows: number[],
  startingBalance: number
): CashflowForecast {
  const weeks: CashflowWeekProjection[] = []
  let balance = startingBalance

  for (let i = 0; i < 13; i++) {
    const start = getWeekStartDate(i)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const avgInflow = inflows.length > 0
      ? inflows.reduce((s, v) => s + v, 0) / inflows.length
      : 0
    const avgOutflow = outflows.length > 0
      ? outflows.reduce((s, v) => s + v, 0) / outflows.length
      : 0

    const decay = Math.max(0.5, 1 - i * 0.03)
    const projectedInflow = avgInflow * decay
    const projectedOutflow = avgOutflow * decay
    balance += projectedInflow - projectedOutflow

    const riskLevel: RiskLevel = balance < 0
      ? 'critical'
      : balance < startingBalance * 0.1
        ? 'high'
        : balance < startingBalance * 0.3
          ? 'medium'
          : 'low'

    weeks.push({
      weekLabel: getWeekLabel(start),
      weekNumber: i + 1,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      projectedInflow,
      projectedOutflow,
      projectedBalance: balance,
      confidence: Math.max(30, 90 - i * 5),
      riskLevel,
    })
  }

  const lowestBalance = Math.min(...weeks.map(w => w.projectedBalance))
  const lowestWeek = weeks.findIndex(w => w.projectedBalance === lowestBalance)

  const riskWindows: CashflowRiskWindow[] = []
  let currentRisk: CashflowRiskWindow | null = null

  for (const week of weeks) {
    if (week.riskLevel === 'high' || week.riskLevel === 'critical') {
      if (!currentRisk) {
        currentRisk = {
          startWeek: week.weekNumber,
          endWeek: week.weekNumber,
          riskLevel: week.riskLevel,
          description: week.riskLevel === 'critical'
            ? 'Projected negative balance'
            : 'Low cash reserves',
          projectedShortfall: Math.min(0, week.projectedBalance),
          suggestedActions: [
            'Accelerate receivables collection',
            'Defer non-critical payments',
            'Review upcoming commitments',
          ],
        }
      } else {
        currentRisk.endWeek = week.weekNumber
        if (week.riskLevel === 'critical') currentRisk.riskLevel = 'critical'
        currentRisk.projectedShortfall = Math.min(
          currentRisk.projectedShortfall,
          week.projectedBalance
        )
      }
    } else if (currentRisk) {
      riskWindows.push(currentRisk)
      currentRisk = null
    }
  }
  if (currentRisk) riskWindows.push(currentRisk)

  return {
    weeks,
    currentBalance: startingBalance,
    lowestProjectedBalance: lowestBalance,
    lowestBalanceWeek: lowestWeek + 1,
    totalProjectedInflow: weeks.reduce((s, w) => s + w.projectedInflow, 0),
    totalProjectedOutflow: weeks.reduce((s, w) => s + w.projectedOutflow, 0),
    riskWindows,
  }
}

export const useFinancialCashflowForecast = (projectId?: string) => {
  const queryClient = useQueryClient()

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: [QUERY_KEY, 'snapshots', projectId],
    queryFn: async () => {
      let query = supabase
        .from(TABLE)
        .select('*')
        .gte('week_start_date', new Date().toISOString().split('T')[0])
        .order('week_start_date', { ascending: true })
        .order('week_number', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return (data ?? []) as FinancialCashflowSnapshot[]
    },
  })

  const { data: recentEntries, isLoading: entriesLoading } = useQuery({
    queryKey: [QUERY_KEY, 'entries', projectId],
    queryFn: async () => {
      const thirteenWeeksAgo = new Date()
      thirteenWeeksAgo.setDate(thirteenWeeksAgo.getDate() - 91)

      let query = supabase
        .from('project_financial_entries')
        .select('amount, entry_type, date')
        .gte('date', thirteenWeeksAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const forecast = useMemo<CashflowForecast>(() => {
    if (snapshots && snapshots.length > 0) {
      const weeks: CashflowWeekProjection[] = snapshots.map(s => {
        const start = new Date(s.week_start_date)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)

        return {
          weekLabel: getWeekLabel(start),
          weekNumber: s.week_number,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          projectedInflow: s.projected_inflow,
          projectedOutflow: s.projected_outflow,
          projectedBalance: s.projected_balance,
          actualInflow: s.actual_inflow ?? undefined,
          actualOutflow: s.actual_outflow ?? undefined,
          actualBalance: s.actual_balance ?? undefined,
          confidence: s.confidence_level,
          riskLevel: s.risk_level as RiskLevel,
        }
      })

      const lowestBalance = Math.min(...weeks.map(w => w.projectedBalance))
      const lowestWeek = weeks.findIndex(w => w.projectedBalance === lowestBalance)

      return {
        weeks,
        currentBalance: weeks[0]?.actualBalance ?? weeks[0]?.projectedBalance ?? 0,
        lowestProjectedBalance: lowestBalance,
        lowestBalanceWeek: lowestWeek + 1,
        totalProjectedInflow: weeks.reduce((s, w) => s + w.projectedInflow, 0),
        totalProjectedOutflow: weeks.reduce((s, w) => s + w.projectedOutflow, 0),
        riskWindows: [],
      }
    }

    if (!recentEntries || recentEntries.length === 0) {
      return buildFallbackForecast([], [], 0)
    }

    const weeklyInflows: number[] = []
    const weeklyOutflows: number[] = []
    let weekInflow = 0
    let weekOutflow = 0
    let lastWeek = -1

    for (const entry of recentEntries) {
      const date = new Date(entry.date)
      const weekNum = Math.floor(date.getTime() / (7 * 86400000))

      if (lastWeek !== -1 && weekNum !== lastWeek) {
        weeklyInflows.push(weekInflow)
        weeklyOutflows.push(weekOutflow)
        weekInflow = 0
        weekOutflow = 0
      }

      if (entry.entry_type === 'income') {
        weekInflow += Number(entry.amount)
      } else {
        weekOutflow += Number(entry.amount)
      }
      lastWeek = weekNum
    }
    if (weekInflow > 0 || weekOutflow > 0) {
      weeklyInflows.push(weekInflow)
      weeklyOutflows.push(weekOutflow)
    }

    const totalInflow = recentEntries
      .filter(e => e.entry_type === 'income')
      .reduce((s, e) => s + Number(e.amount), 0)
    const totalOutflow = recentEntries
      .filter(e => e.entry_type === 'expense')
      .reduce((s, e) => s + Number(e.amount), 0)

    return buildFallbackForecast(weeklyInflows, weeklyOutflows, totalInflow - totalOutflow)
  }, [snapshots, recentEntries])

  const refreshForecast = useCallback(async () => {
    try {
      await supabase.functions.invoke('financial-cashflow-forecast', {
        body: { project_id: projectId, forceRefresh: true },
      })
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'snapshots', projectId] })
    } catch (err) {
      console.error('Failed to refresh cashflow forecast', err)
    }
  }, [projectId, queryClient])

  return {
    forecast,
    snapshots: snapshots ?? [],
    isLoading: snapshotsLoading || entriesLoading,
    refreshForecast,
  }
}
