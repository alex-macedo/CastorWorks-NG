// Story 3.5: PO Card View Component (Mobile)
// Displays purchase orders in card format for mobile

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Mail } from 'lucide-react'
import { POStatusBadge, type POStatus } from './POStatusBadge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface PurchaseOrder {
  id: string
  purchase_order_number: string
  total_amount: number
  currency_id: string
  status: POStatus
  created_at: string
  sent_at: string | null
  expected_delivery_date: string | null
  pdf_url: string | null
  projects: {
    name: string
  }
  suppliers: {
    name: string
  }
}

interface POCardViewProps {
  purchaseOrders: PurchaseOrder[]
  onViewDetails: (id: string) => void
  onDownloadPDF: (po: PurchaseOrder) => void
  onSendEmail: (po: PurchaseOrder) => void
}

export const POCardView: React.FC<POCardViewProps> = ({
  purchaseOrders,
  onViewDetails,
  onDownloadPDF,
  onSendEmail,
}) => {
  const { t, currency, dateFormat } = useLocalization();

  return (
    <div className="grid grid-cols-1 gap-4">
      {purchaseOrders.map((po) => (
        <Card
          key={po.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onViewDetails(po.id)}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{po.purchase_order_number}</CardTitle>
              <POStatusBadge status={po.status} />
            </div>
            <CardDescription>{po.projects.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('procurement.supplier')}:</span>
                <span className="font-medium">{po.suppliers.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('procurement.amount')}:</span>
                <span className="font-bold">
                  {formatCurrency(po.total_amount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('procurement.created')}:</span>
                <span>{formatDate(po.created_at, dateFormat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('procurement.deliveryDate')}:</span>
                <span>{po.expected_delivery_date ? formatDate(po.expected_delivery_date, dateFormat) : t('procurement.tbd')}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {po.pdf_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadPDF(po)}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('procurement.pdf')}
                </Button>
              )}
              {po.status === 'draft' && po.pdf_url && (
                <Button
                  size="sm"
                  onClick={() => onSendEmail(po)}
                  className="flex-1"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {t('procurement.send')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
