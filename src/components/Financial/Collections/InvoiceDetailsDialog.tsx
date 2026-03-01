import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'
import { format, differenceInDays } from 'date-fns'
import { 
  Calendar,
  User,
  FileText,
  TrendingUp,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react'

interface InvoiceDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onMarkAsPaid?: () => void
  onSendWhatsApp?: () => void
  onSendEmail?: () => void
  isSendingWhatsApp?: boolean
  isSendingEmail?: boolean
}

export function InvoiceDetailsDialog({
  open,
  onOpenChange,
  invoice,
  onMarkAsPaid,
  onSendWhatsApp,
  onSendEmail,
  isSendingWhatsApp,
  isSendingEmail
}: InvoiceDetailsDialogProps) {
  const { t, currency } = useLocalization()
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return Math.max(0, differenceInDays(today, due))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'draft':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (score: number) => {
    if (score > 60) return 'text-red-600 bg-red-50 border-red-200'
    if (score > 30) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const handleMarkAsPaid = async () => {
    setIsProcessing(true)
    try {
      await onMarkAsPaid?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error marking as paid:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {t('financial:collections.invoiceDetails')}
            </DialogTitle>
            <Badge className={getStatusColor(invoice.status)}>
              {t(`financial:arWorkspace.statuses.${invoice.status}`)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {t('financial:arWorkspace.invoiceNumber')}
                </div>
                <p className="font-semibold">{invoice.invoice_number}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  {t('financial:arWorkspace.clientName')}
                </div>
                <p className="font-semibold">{invoice.client_name}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {t('financial:arWorkspace.issueDate')}
                </div>
                <p className="font-semibold">
                  {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('financial:arWorkspace.dueDate')}
                </div>
                <p className="font-semibold">
                  {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('financial:collections.financialDetails')}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">{t('financial:arWorkspace.totalAmount')}</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(invoice.total_amount, currency)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">{t('financial:arWorkspace.amountPaid')}</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(invoice.amount_paid, currency)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">{t('financial:arWorkspace.outstanding')}</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(invoice.total_amount - invoice.amount_paid, currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Collection Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('financial:collections.collectionInfo')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    {t('financial:collections.priorityScore')}
                  </div>
                  <Badge className={`font-mono text-[10px] ${getPriorityColor(invoice.collection_priority_score)}`}>
                    {t('financial:collections.score', { score: invoice.collection_priority_score })}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    {t('financial:arWorkspace.daysOverdue')}
                  </div>
                  <p className="font-semibold text-red-600">
                    {(() => {
                      const daysOverdue = invoice.days_overdue !== undefined && invoice.days_overdue !== null 
                        ? invoice.days_overdue 
                        : calculateDaysOverdue(invoice.due_date)
                      return t('financial:collections.daysOverdue', { count: daysOverdue })
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('financial:collections.contactInfo')}</h3>
              <div className="space-y-3">
                {invoice.client_email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{invoice.client_email}</p>
                      <p className="text-xs text-muted-foreground">{t('financial:collections.email')}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onSendEmail}
                      disabled={isSendingEmail}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {t('financial:collections.sendEmail')}
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('financial:collections.whatsAppAvailable')}</p>
                    <p className="text-xs text-muted-foreground">{t('financial:collections.sendWhatsAppReminder')}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onSendWhatsApp}
                    disabled={isSendingWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {t('financial:collections.sendWhatsApp')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Project Information */}
            {invoice.projects && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('financial:collections.projectInfo')}</h3>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="font-medium">{invoice.projects.name}</p>
                  <p className="text-sm text-muted-foreground">{t('financial:collections.associatedProject')}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          {invoice.status !== 'paid' && (
            <Button 
              onClick={handleMarkAsPaid}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('financial:collections.markAsPaid')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
