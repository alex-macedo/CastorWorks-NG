import { describe, expect, it } from 'vitest'
import { computeBrazilCashflowKpis } from '@/hooks/useBrazilCashflowKpis'

describe('computeBrazilCashflowKpis', () => {
  it('computes the six KPI values from existing data sources', () => {
    const result = computeBrazilCashflowKpis({
      forecast: {
        weeks: [
          { projectedBalance: 20000 },
          { projectedBalance: 15000 },
          { projectedBalance: -5000 },
        ],
        lowestProjectedBalance: -5000,
        lowestBalanceWeek: 3,
        totalProjectedInflow: 120000,
        totalProjectedOutflow: 100000,
      },
      projects: [
        {
          id: 'p-1',
          status: 'active',
          budget_model: 'bdi_brazil',
          budget_total: 130000,
        },
      ],
      budgetItems: [
        { project_id: 'p-1', category: 'labor', budgeted_amount: 60000 },
        { project_id: 'p-1', category: 'material', budgeted_amount: 40000 },
        { project_id: 'p-1', category: 'admin', budgeted_amount: 30000 },
      ],
      bdiTotal: 20,
      taxProjects: [{ id: 'tp-1', project_id: 'p-1' }],
      taxEstimates: [
        {
          tax_project_id: 'tp-1',
          inss_estimate: 12000,
          iss_estimate: 3000,
          calculated_at: '2026-02-10T10:00:00Z',
        },
      ],
      nfeRecords: [
        { link_status: 'auto_linked', total_amount: 5000 },
        { link_status: 'manual_linked', total_amount: 7000 },
        { link_status: 'unlinked', total_amount: 2000 },
        { link_status: 'unlinked', total_amount: 3000 },
      ],
      arInvoices: [
        { status: 'overdue', total_amount: 10000, amount_paid: 2000, days_overdue: 10 },
        { status: 'partially_paid', total_amount: 6000, amount_paid: 1000, days_overdue: 4 },
        { status: 'paid', total_amount: 4000, amount_paid: 4000, days_overdue: 0 },
      ],
      selectedProjectId: 'p-1',
    })

    expect(result.kpis.liquidityFloor.value).toBe(-5000)
    expect(result.kpis.liquidityFloor.weekNumber).toBe(3)

    expect(result.kpis.net13w.value).toBe(20000)

    expect(result.kpis.overdueAr.value).toBe(13000)
    expect(result.kpis.overdueAr.avgDaysLate).toBe(7)
    expect(result.kpis.overdueAr.invoiceCount).toBe(2)

    expect(result.kpis.bdiDeviation.realizedPct).toBeCloseTo(30)
    expect(result.kpis.bdiDeviation.deviationPct).toBeCloseTo(10)
    expect(result.kpis.bdiDeviation.plannedPct).toBe(20)

    expect(result.kpis.taxExposure.value).toBe(15000)
    expect(result.kpis.taxExposure.estimateCount).toBe(1)

    expect(result.kpis.nfeReconciliation.totalNfe).toBe(4)
    expect(result.kpis.nfeReconciliation.linkedNfe).toBe(2)
    expect(result.kpis.nfeReconciliation.linkedRate).toBe(50)
    expect(result.kpis.nfeReconciliation.pendingAmount).toBe(5000)

    expect(result.flags.hasForecast).toBe(true)
    expect(result.flags.hasAr).toBe(true)
    expect(result.flags.hasTax).toBe(true)
    expect(result.flags.hasNfe).toBe(true)
    expect(result.flags.hasBdiInputs).toBe(true)
  })

  it('returns deterministic empty-state values when there is no data', () => {
    const result = computeBrazilCashflowKpis({
      forecast: {
        weeks: [],
        lowestProjectedBalance: 0,
        lowestBalanceWeek: 0,
        totalProjectedInflow: 0,
        totalProjectedOutflow: 0,
      },
      projects: [],
      budgetItems: [],
      bdiTotal: 0,
      taxProjects: [],
      taxEstimates: [],
      nfeRecords: [],
      arInvoices: [],
    })

    expect(result.kpis.liquidityFloor.value).toBe(0)
    expect(result.kpis.net13w.value).toBe(0)
    expect(result.kpis.overdueAr.value).toBe(0)
    expect(result.kpis.taxExposure.value).toBe(0)
    expect(result.kpis.nfeReconciliation.linkedRate).toBe(0)

    expect(result.flags.hasForecast).toBe(false)
    expect(result.flags.hasAr).toBe(false)
    expect(result.flags.hasTax).toBe(false)
    expect(result.flags.hasNfe).toBe(false)
    expect(result.flags.hasBdiInputs).toBe(false)
  })
})
