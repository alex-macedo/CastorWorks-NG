import { useState } from 'react'
import {
  Receipt,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useFinancialAPWorkspace } from '@/hooks/useFinancialAPWorkspace'
import { APBillForm } from '@/components/Financial/APBillForm'
import { formatCurrency } from '@/utils/formatters'
import { formatDateSystem } from '@/utils/dateSystemFormatters'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import type { APBillStatus, FinancialAPBill } from '@/types/finance'

const statusColors: Record<APBillStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  disputed: 'bg-orange-100 text-orange-800',
}

export default function FinancialAP() {
  const { t, currency } = useLocalization()
  const { bills, isLoading, dueRiskSummary, createBill } = useFinancialAPWorkspace()
  const [statusFilter, setStatusFilter] = useState<APBillStatus | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<FinancialAPBill | undefined>()

  const filteredBills = statusFilter === 'all'
    ? bills
    : bills.filter(b => b.status === statusFilter)

  const riskKPIs = [
    {
      label: t('financial:apWorkspace.dueRisk.dueThisWeek'),
      value: dueRiskSummary.dueThisWeek,
      color: 'text-orange-600',
      icon: <CalendarClock className="h-4 w-4 text-orange-500" />,
    },
    {
      label: t('financial:apWorkspace.dueRisk.dueNextWeek'),
      value: dueRiskSummary.dueNextWeek,
      color: 'text-yellow-600',
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
    },
    {
      label: t('financial:apWorkspace.dueRisk.overdue'),
      value: dueRiskSummary.overdue,
      color: 'text-destructive',
      icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    },
    {
      label: t('financial:apWorkspace.dueRisk.totalPending'),
      value: dueRiskSummary.totalPending,
      color: 'text-primary',
      icon: <DollarSign className="h-4 w-4 text-primary" />,
     },
  ]

  const handleNewBill = () => {
    setEditingBill(undefined)
    setFormOpen(true)
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('financial:apWorkspace.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('financial:apWorkspace.subtitle')}
            </p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={handleNewBill}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('financial:apWorkspace.newBill')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* Due Risk KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4" data-testid="ap-kpi-cards">
        {riskKPIs.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <div className="p-2 rounded-lg bg-muted">
                  {kpi.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>
                {formatCurrency(kpi.value, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {t('financial:apWorkspace.dueRisk.highRiskCount')}
            </p>
            <p className="text-3xl font-bold text-destructive">{dueRiskSummary.highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {t('financial:apWorkspace.dueRisk.averageDaysPayable')}
            </p>
            <p className="text-3xl font-bold">{dueRiskSummary.averageDaysPayable}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {t('financial:apWorkspace.dueRisk.billCount')}
            </p>
            <p className="text-3xl font-bold">{dueRiskSummary.billCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          {t('financial.allTransactions')}
        </Button>
        {(['pending', 'approved', 'scheduled', 'overdue', 'paid'] as APBillStatus[]).map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {t(`financial:apWorkspace.statuses.${status}`)}
          </Button>
        ))}
      </div>

      {/* Bill List */}
      <Card data-testid="ap-bill-list">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p>{t('financial.loading')}</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="mb-1">{t('financial:apWorkspace.noBills')}</p>
                <p className="text-sm">{t('financial:apWorkspace.noBillsHint')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">{t('financial:apWorkspace.billNumber')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('financial:apWorkspace.vendorName')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('financial:apWorkspace.dueDate')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('financial:apWorkspace.totalAmount')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('financial:apWorkspace.outstanding')}</th>
                    <th className="text-center py-3 px-4 font-medium">{t('financial:apWorkspace.status')}</th>
                    <th className="text-center py-3 px-4 font-medium">{t('financial:apWorkspace.riskScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map(bill => {
                    const outstanding = bill.total_amount - bill.amount_paid
                    return (
                      <tr key={bill.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{bill.bill_number}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p>{bill.vendor_name}</p>
                            {bill.projects?.name && (
                              <p className="text-xs text-muted-foreground">{bill.projects.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{formatDateSystem(bill.due_date)}</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(bill.total_amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(outstanding, currency)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusColors[bill.status]}>
                            {t(`financial:apWorkspace.statuses.${bill.status}`)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {bill.risk_score != null ? (
                            <span className={bill.risk_score >= 70 ? 'text-destructive font-medium' : bill.risk_score >= 40 ? 'text-yellow-600' : 'text-green-600'}>
                              {bill.risk_score.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <APBillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        bill={editingBill}
      />
    </div>
  )
}
