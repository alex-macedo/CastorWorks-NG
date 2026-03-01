import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FinancialCashflow from '@/pages/FinancialCashflow'

vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({
    currency: 'BRL',
    t: (key: string, options?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'financial:cashflow.title': 'Cashflow Command Center',
        'financial:cashflow.subtitle': '13-week projected runway with risk analysis',
        'financial:cashflow.portfolioView': 'Portfolio',
        'financial:cashflow.forecastChart': '13-Week Forecast',
        'financial:riskLevels.low': 'Low',
        'financial.loading': 'Loading',
        'financial:cashflow.noData': 'No cashflow data available',
        'financial:cashflow.noDataHint': 'Add financial entries to generate forecast projections',
        'financial:cashflow.kpi.noDataYet': 'No data yet',
        'financial:cashflow.kpi.tooltip.label': `Definition for ${options?.metric ?? ''}`,
        'financial:cashflow.kpi.tooltip.formula': `Formula: ${options?.formula ?? ''}`,
        'financial:cashflow.kpi.tooltip.source': `Data source: ${options?.source ?? ''}`,
        'financial:cashflow.kpi.liquidityFloor.title': 'Liquidity Floor (13w)',
        'financial:cashflow.kpi.liquidityFloor.subvalue': `Lowest point in week ${options?.week ?? ''}`,
        'financial:cashflow.kpi.liquidityFloor.formula': 'Minimum projected balance across 13 weeks',
        'financial:cashflow.kpi.liquidityFloor.source': 'financial_cashflow_snapshots.projected_balance',
        'financial:cashflow.kpi.net13w.title': 'Net Cash Position (13w)',
        'financial:cashflow.kpi.net13w.subvalue': 'Projected inflow minus projected outflow',
        'financial:cashflow.kpi.net13w.formula': 'Total projected inflow - total projected outflow',
        'financial:cashflow.kpi.net13w.source': 'financial_cashflow_snapshots.projected_inflow/outflow',
        'financial:cashflow.kpi.overdueAr.title': 'Overdue Receivables Exposure',
        'financial:cashflow.kpi.overdueAr.subvalue': `${options?.days ?? 0} days avg delay • ${options?.count ?? 0} invoices`,
        'financial:cashflow.kpi.overdueAr.formula': 'Sum(max(0,total_amount-amount_paid)) for overdue',
        'financial:cashflow.kpi.overdueAr.source': 'financial_ar_invoices',
        'financial:cashflow.kpi.bdiDeviation.title': 'Realized BDI vs Planned BDI',
        'financial:cashflow.kpi.bdiDeviation.subvalue': `Realized ${options?.realized ?? 0}% vs planned ${options?.planned ?? 0}%`,
        'financial:cashflow.kpi.bdiDeviation.formula': 'realized_bdi_pct - planned_bdi_pct',
        'financial:cashflow.kpi.bdiDeviation.source': 'projects + project_budget_items + app_settings',
        'financial:cashflow.kpi.taxExposure.title': 'Tax Exposure (INSS + ISS)',
        'financial:cashflow.kpi.taxExposure.subvalue': `${options?.count ?? 0} latest tax estimate(s)`,
        'financial:cashflow.kpi.taxExposure.formula': 'sum latest inss + iss',
        'financial:cashflow.kpi.taxExposure.source': 'tax_estimates',
        'financial:cashflow.kpi.nfeReconciliation.title': 'NF-e Reconciliation Gap',
        'financial:cashflow.kpi.nfeReconciliation.subvalue': `${options?.pending ?? 0} pending • ${options?.total ?? 0} NF-e`,
        'financial:cashflow.kpi.nfeReconciliation.formula': 'linked nfe / total nfe',
        'financial:cashflow.kpi.nfeReconciliation.source': 'sefaz_nfe_records',
        'financial:cashflow.riskWindows': 'Risk Windows',
        'financial:cashflow.noRiskWindows': 'No risk windows detected',
        'financial:cashflow.inflow': 'Inflow',
        'financial:cashflow.outflow': 'Outflow',
        'financial:cashflow.balance': 'Balance',
        'financial:cashflow.riskLevel': 'Risk Level',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [{ id: 'p-1', name: 'Project 1' }],
  }),
}))

vi.mock('@/hooks/useFinancialCashflowForecast', () => ({
  useFinancialCashflowForecast: () => ({
    forecast: {
      weeks: [
        {
          weekLabel: 'Week 1',
          projectedInflow: 100,
          projectedOutflow: 50,
          projectedBalance: 50,
          actualBalance: null,
          confidence: 90,
          riskLevel: 'low',
          weekNumber: 1,
        },
      ],
      riskWindows: [],
    },
    isLoading: false,
    refreshForecast: vi.fn(),
  }),
}))

vi.mock('@/hooks/useBrazilCashflowKpis', () => ({
  useBrazilCashflowKpis: () => ({
    kpis: {
      liquidityFloor: { value: -5000, weekNumber: 3 },
      net13w: { value: 20000 },
      overdueAr: { value: 15000, avgDaysLate: 12, invoiceCount: 2 },
      bdiDeviation: { deviationPct: 2.5, plannedPct: 20, realizedPct: 22.5, projectCount: 1 },
      taxExposure: { value: 10000, estimateCount: 1 },
      nfeReconciliation: { linkedRate: 75, pendingAmount: 4200, totalNfe: 8, linkedNfe: 6 },
    },
    dataQualityFlags: {
      hasForecast: true,
      hasAr: true,
      hasTax: true,
      hasNfe: true,
      hasBdiInputs: true,
    },
    isLoading: false,
  }),
}))

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: any }) => <div>{children}</div>
  return {
    ResponsiveContainer: Pass,
    AreaChart: Pass,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    ReferenceLine: () => <div />,
  }
})

describe('FinancialCashflow KPI cards', () => {
  it('renders exactly 6 KPI cards', () => {
    render(<FinancialCashflow />)

    const cards = screen.getAllByTestId('cashflow-kpi-card')
    expect(cards).toHaveLength(6)

    expect(screen.getByText('Liquidity Floor (13w)')).toBeInTheDocument()
    expect(screen.getByText('Net Cash Position (13w)')).toBeInTheDocument()
    expect(screen.getByText('Overdue Receivables Exposure')).toBeInTheDocument()
    expect(screen.getByText('Realized BDI vs Planned BDI')).toBeInTheDocument()
    expect(screen.getByText('Tax Exposure (INSS + ISS)')).toBeInTheDocument()
    expect(screen.getByText('NF-e Reconciliation Gap')).toBeInTheDocument()
  })

  it('renders KPI help buttons with definition labels', () => {
    render(<FinancialCashflow />)

    const helpButtons = screen.getAllByRole('button', {
      name: /Definition for/i,
    })

    expect(helpButtons.length).toBeGreaterThanOrEqual(6)
  })
})
