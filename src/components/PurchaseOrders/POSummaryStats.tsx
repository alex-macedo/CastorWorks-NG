// Story 3.5: PO Summary Statistics Component
// Displays summary statistics for purchase orders

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocalization } from '@/contexts/LocalizationContext'
import type { POStatus } from './POStatusBadge'

interface PurchaseOrder {
  id: string
  status: POStatus
  total_amount: number
  currency_id: string
}

interface POSummaryStatsProps {
  purchaseOrders: PurchaseOrder[]
}

export const POSummaryStats: React.FC<POSummaryStatsProps> = ({ purchaseOrders }) => {
  const { t, currency } = useLocalization()
  const totalCount = purchaseOrders.length

  const pendingCount = purchaseOrders.filter(
    (po) => po.status === 'sent' || po.status === 'acknowledged' || po.status === 'in_transit'
  ).length

  const deliveredCount = purchaseOrders.filter((po) => po.status === 'delivered').length

  const draftCount = purchaseOrders.filter((po) => po.status === 'draft').length

  // Calculate total value (assuming all in same currency for now)
  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('procurement.summaryStats.totalPOs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalCount}</div>
          {draftCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {draftCount} {t('procurement.summaryStats.draft')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('procurement.summaryStats.pendingDelivery')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{pendingCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('procurement.summaryStats.inProgress')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('procurement.summaryStats.totalValue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('procurement.summaryStats.allPurchaseOrders')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('procurement.summaryStats.delivered')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{deliveredCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('procurement.summaryStats.completed')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
