// Story 3.5: PO Quick Actions Component
// Provides quick action buttons for purchase orders

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Mail, FileText, MoreVertical } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import type { POStatus } from './POStatusBadge'

interface PurchaseOrder {
  id: string
  purchase_order_number: string
  status: POStatus
  pdf_url: string | null
}

interface POQuickActionsProps {
  purchaseOrder: PurchaseOrder
  onViewDetails: (id: string) => void
  onDownloadPDF: (po: PurchaseOrder) => void
  onSendEmail: (po: PurchaseOrder) => void
  onRegeneratePDF: (po: PurchaseOrder) => void
}

export const POQuickActions: React.FC<POQuickActionsProps> = ({
  purchaseOrder,
  onViewDetails,
  onDownloadPDF,
  onSendEmail,
  onRegeneratePDF,
}) => {
  const { t } = useLocalization();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(purchaseOrder.id)}
      >
        {t('procurement.view')}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!purchaseOrder.pdf_url}
            onClick={() => onDownloadPDF(purchaseOrder)}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('procurement.downloadPDF')}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!purchaseOrder.pdf_url || purchaseOrder.status === 'sent'}
            onClick={() => onSendEmail(purchaseOrder)}
          >
            <Mail className="mr-2 h-4 w-4" />
            {purchaseOrder.status === 'draft' ? t('procurement.sendToSupplier') : t('procurement.resendToSupplier')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => onRegeneratePDF(purchaseOrder)}>
            <FileText className="mr-2 h-4 w-4" />
            {t('procurement.regeneratePDF')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
