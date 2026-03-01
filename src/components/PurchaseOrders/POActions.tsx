// Story 3.6: PO Actions Component
// Action buttons for purchase order detail page

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Download, Mail, FileText, XCircle, RefreshCw, Edit3 } from 'lucide-react'
import { useState } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import type { POStatus } from './POStatusBadge'
import { POStatusUpdateDialog } from './POStatusUpdateDialog'

interface POActionsProps {
  purchaseOrder: {
    id: string
    purchase_order_number: string
    status: POStatus
    pdf_url: string | null
  }
  onDownloadPDF: () => void
  onSendEmail: () => Promise<void>
  onRegeneratePDF: () => Promise<void>
  onCancelPO: () => Promise<void>
  onUpdateStatus: (newStatus: POStatus, note: string) => Promise<void>
  className?: string
}

export const POActions: React.FC<POActionsProps> = ({
  purchaseOrder,
  onDownloadPDF,
  onSendEmail,
  onRegeneratePDF,
  onCancelPO,
  onUpdateStatus,
  className = '',
}) => {
  const { t } = useLocalization();
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUpdateStatusDialog, setShowUpdateStatusDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendEmail = async () => {
    setIsLoading(true)
    try {
      await onSendEmail()
      setShowSendDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegeneratePDF = async () => {
    setIsLoading(true)
    try {
      await onRegeneratePDF()
      setShowRegenerateDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelPO = async () => {
    setIsLoading(true)
    try {
      await onCancelPO()
      setShowCancelDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  const canSend =
    purchaseOrder.pdf_url &&
    !['cancelled', 'delivered'].includes(purchaseOrder.status)
  const canCancel = ['draft', 'sent', 'acknowledged'].includes(purchaseOrder.status)

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-semibold text-lg mb-4">{t('procurement.actions')}</h3>

      {/* Download PDF */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={onDownloadPDF}
        disabled={!purchaseOrder.pdf_url}
      >
        <Download className="mr-2 h-4 w-4" />
        {t('procurement.downloadPDF')}
      </Button>

      {/* Send to Supplier */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setShowSendDialog(true)}
        disabled={!canSend}
      >
        <Mail className="mr-2 h-4 w-4" />
        {purchaseOrder.status === 'draft' ? t('procurement.sendToSupplier') : t('procurement.resendToSupplier')}
      </Button>

      {/* Regenerate PDF */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setShowRegenerateDialog(true)}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        {t('procurement.regeneratePDF')}
      </Button>

      {/* Update Status */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setShowUpdateStatusDialog(true)}
        disabled={purchaseOrder.status === 'cancelled' || purchaseOrder.status === 'delivered'}
      >
        <Edit3 className="mr-2 h-4 w-4" />
        {t('procurement.updateStatus')}
      </Button>

      {/* Cancel PO */}
      <Button
        variant="destructive"
        className="w-full justify-start"
        onClick={() => setShowCancelDialog(true)}
        disabled={!canCancel}
      >
        <XCircle className="mr-2 h-4 w-4" />
        {t('procurement.cancelPurchaseOrder')}
      </Button>

      {/* Send Email Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('procurement.sendPurchaseOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('procurement.sendPurchaseOrderDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail} disabled={isLoading}>
              {isLoading ? t('procurement.sending') : t('procurement.sendEmail')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate PDF Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('procurement.regeneratePDFTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('procurement.regeneratePDFDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegeneratePDF} disabled={isLoading}>
              {isLoading ? t('procurement.regenerating') : t('procurement.regeneratePDF')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel PO Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this purchase order? This action cannot be undone.
              You may want to contact the supplier directly if the order has already been sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Don't Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPO}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Cancelling...' : 'Cancel Purchase Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Status Dialog */}
      <POStatusUpdateDialog
        purchaseOrder={purchaseOrder}
        open={showUpdateStatusDialog}
        onOpenChange={setShowUpdateStatusDialog}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  )
}
