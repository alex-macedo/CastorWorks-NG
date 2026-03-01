import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useFinancialCashflowForecast } from '@/hooks/useFinancialCashflowForecast'
import { useProjects } from '@/hooks/useProjects'
import { useProjectBudgetItems } from '@/hooks/useProjectBudgetItems'
import { useAppSettings } from '@/hooks/useAppSettings'

interface TaxEstimateRow {
  tax_project_id: string
  inss_estimate: number | null
  iss_estimate: number | null
  calculated_at: string | null
}

interface TaxProjectRow {
  id: string
  project_id: string
}

interface NfeRecordRow {
  link_status: 'unlinked' | 'auto_linked' | 'manual_linked' | 'rejected'
  total_amount: number | null
}

interface ArInvoiceRow {
  status: string
  total_amount: number | null
  amount_paid: number | null
  days_overdue: number | null
}

export interface BrazilCashflowKpis {
  liquidityFloor: {
    value: number
    weekNumber: number
  }
  net13w: {
    value: number
  }
  overdueAr: {
    value: number
    avgDaysLate: number
    invoiceCount: number
  }
  bdiDeviation: {
    deviationPct: number
    plannedPct: number
    realizedPct: number
    projectCount: number
  }
  taxExposure: {
    value: number
    estimateCount: number
  }
  nfeReconciliation: {
    linkedRate: number
    pendingAmount: number
    totalNfe: number
    linkedNfe: number
  }
}

export interface BrazilCashflowKpiFlags {
  hasForecast: boolean
  hasAr: boolean
  hasTax: boolean
  hasNfe: boolean
  hasBdiInputs: boolean
}

export interface BrazilCashflowKpiCardData {
  key: string
  title: string
  value: string
  subvalue?: string
  trend?: 'good' | 'warning' | 'critical' | 'neutral'
  tooltipFormula: string
  tooltipSource: string
}

interface ComputeInput {
  forecast: {
    weeks: Array<{ projectedBalance: number }>
    lowestProjectedBalance: number
    lowestBalanceWeek: number
    totalProjectedInflow: number
    totalProjectedOutflow: number
  }
  projects: any[]
  budgetItems: Array<{ project_id: string; category: string | null; budgeted_amount: number | null }>
  bdiTotal: number
  taxEstimates: TaxEstimateRow[]
  taxProjects: TaxProjectRow[]
  nfeRecords: NfeRecordRow[]
  arInvoices: ArInvoiceRow[]
  selectedProjectId?: string
}

interface ComputeResult {
  kpis: BrazilCashflowKpis
  flags: BrazilCashflowKpiFlags
}

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

export function computeBrazilCashflowKpis(input: ComputeInput): ComputeResult {
  const {
    forecast,
    projects,
    budgetItems,
    bdiTotal,
    taxEstimates,
    taxProjects,
    nfeRecords,
    arInvoices,
    selectedProjectId,
  } = input

  const hasForecast = forecast.weeks.length > 0

  const net13w = Number(forecast.totalProjectedInflow || 0) - Number(forecast.totalProjectedOutflow || 0)

  const overdueInvoices = arInvoices.filter(invoice =>
    Number(invoice.days_overdue || 0) > 0 || invoice.status === 'overdue'
  )
  const overdueAr = overdueInvoices.reduce((sum, invoice) => {
    return sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0))
  }, 0)
  const avgDaysLate = overdueInvoices.length > 0
    ? Math.round(
      overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.days_overdue || 0), 0) /
      overdueInvoices.length
    )
    : 0

  const filteredProjects = selectedProjectId
    ? (projects || []).filter(project => project.id === selectedProjectId)
    : (projects || []).filter(project => project.status !== 'completed' && project.status !== 'cancelled')

  const bdiProjects = filteredProjects.filter(
    project => (project as any).budget_model === 'bdi_brazil'
  )
  const bdiProjectIds = new Set(bdiProjects.map(project => project.id))
  const bdiBudgetItems = (budgetItems || []).filter(item => bdiProjectIds.has(item.project_id))

  const directBudget = bdiBudgetItems.reduce((sum, item) => {
    const category = String(item.category || '').toLowerCase()
    const isDirect = /labor|mão|mao|material|insumo/.test(category)
    return isDirect ? sum + Number(item.budgeted_amount || 0) : sum
  }, 0)

  const totalBdiBudgetByProjects = bdiProjects.reduce(
    (sum, project) => sum + Number((project as any).budget_total || (project as any).budget_total_value || 0),
    0
  )

  const totalBdiBudget = totalBdiBudgetByProjects > 0
    ? totalBdiBudgetByProjects
    : bdiBudgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0)

  const realizedBdiPct = directBudget > 0
    ? ((totalBdiBudget - directBudget) / directBudget) * 100
    : 0

  const bdiDeviation = realizedBdiPct - Number(bdiTotal || 0)

  const allowedTaxProjectIds = new Set(
    (taxProjects || [])
      .filter(project => !selectedProjectId || project.project_id === selectedProjectId)
      .map(project => project.id)
  )

  const filteredTaxEstimates = (taxEstimates || []).filter(estimate =>
    allowedTaxProjectIds.has(estimate.tax_project_id)
  )

  const latestEstimateByProject = new Map<string, TaxEstimateRow>()
  filteredTaxEstimates.forEach(estimate => {
    if (!latestEstimateByProject.has(estimate.tax_project_id)) {
      latestEstimateByProject.set(estimate.tax_project_id, estimate)
    }
  })

  const latestEstimates = Array.from(latestEstimateByProject.values())
  const taxExposure = latestEstimates.reduce((sum, estimate) => {
    return sum + Number(estimate.inss_estimate || 0) + Number(estimate.iss_estimate || 0)
  }, 0)

  const totalNfe = nfeRecords.length
  const linkedNfe = nfeRecords.filter(record =>
    record.link_status === 'auto_linked' || record.link_status === 'manual_linked'
  ).length
  const pendingNfeAmount = nfeRecords
    .filter(record => record.link_status === 'unlinked')
    .reduce((sum, record) => sum + Number(record.total_amount || 0), 0)
  const nfeLinkedRate = totalNfe > 0 ? (linkedNfe / totalNfe) * 100 : 0

  return {
    kpis: {
      liquidityFloor: {
        value: Number(forecast.lowestProjectedBalance || 0),
        weekNumber: Number(forecast.lowestBalanceWeek || 0),
      },
      net13w: {
        value: net13w,
      },
      overdueAr: {
        value: overdueAr,
        avgDaysLate,
        invoiceCount: overdueInvoices.length,
      },
      bdiDeviation: {
        deviationPct: bdiDeviation,
        plannedPct: Number(bdiTotal || 0),
        realizedPct: realizedBdiPct,
        projectCount: bdiProjects.length,
      },
      taxExposure: {
        value: taxExposure,
        estimateCount: latestEstimates.length,
      },
      nfeReconciliation: {
        linkedRate: nfeLinkedRate,
        pendingAmount: pendingNfeAmount,
        totalNfe,
        linkedNfe,
      },
    },
    flags: {
      hasForecast,
      hasAr: arInvoices.length > 0,
      hasTax: filteredTaxEstimates.length > 0,
      hasNfe: nfeRecords.length > 0,
      hasBdiInputs: bdiProjects.length > 0 && directBudget > 0,
    },
  }
}

export const useBrazilCashflowKpis = (selectedProjectId?: string) => {
  const { forecast, isLoading: loadingForecast } = useFinancialCashflowForecast(selectedProjectId)
  const { projects, isLoading: loadingProjects } = useProjects()
  const { budgetItems, isLoading: loadingBudgetItems } = useProjectBudgetItems(selectedProjectId)
  const { bdiTotal } = useAppSettings()

  const { data: arInvoices = [], isLoading: loadingAr } = useQuery({
    queryKey: ['cashflow-kpis-ar', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('financial_ar_invoices')
        .select('status, total_amount, amount_paid, days_overdue')
        .in('status', ['issued', 'overdue', 'partially_paid', 'paid'])

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId)
      }

      const { data, error } = await query
      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }
      return (data ?? []) as ArInvoiceRow[]
    },
  })

  const { data: taxProjects = [], isLoading: loadingTaxProjects } = useQuery({
    queryKey: ['cashflow-kpis-tax-projects', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('tax_projects')
        .select('id, project_id')

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId)
      }

      const { data, error } = await query
      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }
      return (data ?? []) as TaxProjectRow[]
    },
  })

  const { data: taxEstimates = [], isLoading: loadingTax } = useQuery({
    queryKey: ['cashflow-kpis-tax-estimates', selectedProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_estimates')
        .select('tax_project_id, inss_estimate, iss_estimate, calculated_at')
        .order('calculated_at', { ascending: false })

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return (data ?? []) as TaxEstimateRow[]
    },
  })

  const { data: nfeRecords = [], isLoading: loadingNfe } = useQuery({
    queryKey: ['cashflow-kpis-nfe', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('sefaz_nfe_records')
        .select('link_status, total_amount')

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId)
      }

      const { data, error } = await query
      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return (data ?? []) as NfeRecordRow[]
    },
  })

  const computed = useMemo(() => {
    return computeBrazilCashflowKpis({
      forecast,
      projects: projects ?? [],
      budgetItems: budgetItems ?? [],
      bdiTotal,
      taxEstimates,
      taxProjects,
      nfeRecords,
      arInvoices,
      selectedProjectId,
    })
  }, [forecast, projects, budgetItems, bdiTotal, taxEstimates, taxProjects, nfeRecords, arInvoices, selectedProjectId])

  return {
    kpis: computed.kpis,
    dataQualityFlags: computed.flags,
    isLoading:
      loadingForecast ||
      loadingProjects ||
      loadingBudgetItems ||
      loadingAr ||
      loadingTax ||
      loadingTaxProjects ||
      loadingNfe,
  }
}
