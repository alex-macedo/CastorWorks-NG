import { useState } from 'react'
import {
  FileText,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useFinancialARWorkspace } from '@/hooks/useFinancialARWorkspace'
import { formatCurrency } from '@/utils/formatters'
import { formatDateSystem } from '@/utils/dateSystemFormatters'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { ARInvoiceForm } from '@/components/Financial/ARInvoiceForm'
import type { ARInvoiceStatus, FinancialARInvoice } from '@/types/finance'

const statusColors: Record<ARInvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-indigo-100 text-indigo-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  disputed: 'bg-orange-100 text-orange-800',
}

const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  sent: <Clock className="h-3 w-3" />,
  overdue: <AlertTriangle className="h-3 w-3" />,
  paid: <CheckCircle2 className="h-3 w-3" />,
}

export default function FinancialAR() {
  const { t, currency } = useLocalization()
  const { invoices, isLoading, agingSummary, createInvoice } = useFinancialARWorkspace()
  const [statusFilter, setStatusFilter] = useState<ARInvoiceStatus | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<FinancialARInvoice | undefined>()

  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === statusFilter)

  const agingBuckets = [
    { label: t('financial:arWorkspace.aging.current'), value: agingSummary.current, color: 'text-green-600' },
    { label: t('financial:arWorkspace.aging.days1to30'), value: agingSummary.days1to30, color: 'text-yellow-600' },
    { label: t('financial:arWorkspace.aging.days31to60'), value: agingSummary.days31to60, color: 'text-orange-600' },
    { label: t('financial:arWorkspace.aging.days61to90'), value: agingSummary.days61to90, color: 'text-red-500' },
    { label: t('financial:arWorkspace.aging.days90plus'), value: agingSummary.days90plus, color: 'text-red-700' },
  ]

  const handleNewInvoice = () => {
    setEditingInvoice(undefined)
    setFormOpen(true)
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('financial:arWorkspace.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('financial:arWorkspace.subtitle')}
            </p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={handleNewInvoice}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('financial:arWorkspace.newInvoice')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4" data-testid="ar-kpi-cards">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.aging.totalOutstanding')}</p>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(agingSummary.totalOutstanding, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.aging.totalOverdue')}</p>
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(agingSummary.totalOverdue, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.aging.averageDSO')}</p>
              <div className="p-2 rounded-lg bg-secondary/10">
                <TrendingDown className="h-4 w-4 text-secondary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{agingSummary.averageDSO} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.aging.invoiceCount')}</p>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{agingSummary.invoiceCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Breakdown */}
      <Card data-testid="ar-aging-breakdown">
        <CardHeader>
          <CardTitle>{t('financial:arWorkspace.aging.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {agingBuckets.map(bucket => (
              <div key={bucket.label} className="flex-1 p-4 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground mb-1">{bucket.label}</p>
                <p className={`text-lg font-bold ${bucket.color}`}>
                  {formatCurrency(bucket.value, currency)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          {t('financial.allTransactions')}
        </Button>
        {(['draft', 'sent', 'overdue', 'partially_paid', 'paid'] as ARInvoiceStatus[]).map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {t(`financial:arWorkspace.statuses.${status}`)}
          </Button>
        ))}
      </div>

      {/* Invoice List */}
      <Card data-testid="ar-invoice-list">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p>{t('financial.loading')}</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="mb-1">{t('financial:arWorkspace.noInvoices')}</p>
                <p className="text-sm">{t('financial:arWorkspace.noInvoicesHint')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">{t('financial:arWorkspace.invoiceNumber')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('financial:arWorkspace.clientName')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('financial:arWorkspace.dueDate')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('financial:arWorkspace.totalAmount')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('financial:arWorkspace.outstanding')}</th>
                    <th className="text-center py-3 px-4 font-medium">{t('financial:arWorkspace.status')}</th>
                    <th className="text-center py-3 px-4 font-medium">{t('financial:arWorkspace.daysOverdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => {
                    const outstanding = invoice.total_amount - invoice.amount_paid
                    return (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{invoice.invoice_number}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p>{invoice.client_name}</p>
                            {invoice.projects?.name && (
                              <p className="text-xs text-muted-foreground">{invoice.projects.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{formatDateSystem(invoice.due_date)}</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(invoice.total_amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(outstanding, currency)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusColors[invoice.status]}>
                            <span className="flex items-center gap-1">
                              {statusIcons[invoice.status]}
                              {t(`financial:arWorkspace.statuses.${invoice.status}`)}
                            </span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {invoice.days_overdue > 0 ? (
                            <span className="text-destructive font-medium">{invoice.days_overdue}</span>
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

      <ARInvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={editingInvoice}
      />
    </div>
  )
}
