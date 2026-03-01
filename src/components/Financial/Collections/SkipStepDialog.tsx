import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/utils/formatters'
import { format, differenceInDays } from 'date-fns'
import { SkipForward, AlertTriangle, Clock, MessageCircle, Mail } from 'lucide-react'

interface SkipStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  currentStep?: any
  onSuccess?: () => void
}

export function SkipStepDialog({
  open,
  onOpenChange,
  invoice,
  currentStep,
  onSuccess
}: SkipStepDialogProps) {
  const { t, currency } = useLocalization()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return Math.max(0, differenceInDays(today, due))
  }
  
  const [skipData, setSkipData] = useState({
    skip_reason: 'customer_paid',
    skip_to_step: '',
    notes: '',
    notify_customer: false
  })

  const handleSkip = async () => {
    setIsProcessing(true)
    try {
      // TODO: Skip collection step via API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: t('financial:collections.stepSkipped'),
        description: t('financial:collections.collectionStepSkipped')
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('financial:collections.skipStepError'),
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <SkipForward className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-semibold">
              {t('financial:collections.skipStep')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Step Info */}
          {currentStep && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium">{t('financial:collections.currentStep')}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {getActionIcon(currentStep.action_type)}
                    <span className="font-medium capitalize">{currentStep.action_type}</span>
                    <span className="text-muted-foreground">• Step {currentStep.step_number}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {t('financial:collections.scheduledFor')}: {format(new Date(currentStep.scheduled_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                  {currentStep.message_template && (
                    <div className="text-muted-foreground">
                      {t('financial:collections.template')}: {currentStep.message_template}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('financial:arWorkspace.invoiceNumber')}</p>
                  <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('financial:arWorkspace.clientName')}</p>
                  <p className="font-semibold">{invoice.client_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('financial:arWorkspace.outstanding')}</p>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(invoice.total_amount - invoice.amount_paid, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('financial:arWorkspace.daysOverdue')}</p>
                  <p className="font-semibold text-orange-600">
                    {(() => {
                      const daysOverdue = invoice.days_overdue !== undefined && invoice.days_overdue !== null 
                        ? invoice.days_overdue 
                        : calculateDaysOverdue(invoice.due_date)
                      return t('financial:collections.daysOverdue', { count: daysOverdue })
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skip Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('financial:collections.skipOptions')}</h3>
            
            <div className="space-y-2">
              <Label>{t('financial:collections.skipReason')}</Label>
              <Select
                value={skipData.skip_reason}
                onValueChange={(value) => setSkipData(prev => ({ ...prev, skip_reason: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_paid">{t('financial:collections.customerAlreadyPaid')}</SelectItem>
                  <SelectItem value="payment_arranged">{t('financial:collections.paymentArranged')}</SelectItem>
                  <SelectItem value="dispute_resolved">{t('financial:collections.disputeResolved')}</SelectItem>
                  <SelectItem value="customer_contacted">{t('financial:collections.alreadyContactedCustomer')}</SelectItem>
                  <SelectItem value="wrong_info">{t('financial:collections.incorrectInformation')}</SelectItem>
                  <SelectItem value="not_applicable">{t('financial:collections.stepNotApplicable')}</SelectItem>
                  <SelectItem value="manual_followup">{t('financial:collections.preferManualFollowup')}</SelectItem>
                  <SelectItem value="other">{t('financial:collections.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.skipToStep')}</Label>
              <Select
                value={skipData.skip_to_step}
                onValueChange={(value) => setSkipData(prev => ({ ...prev, skip_to_step: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('financial:collections.selectNextStep')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next">{t('financial:collections.nextStep')}</SelectItem>
                  <SelectItem value="manual_task">{t('financial:collections.manualTask')}</SelectItem>
                  <SelectItem value="escalation">{t('financial:collections.escalation')}</SelectItem>
                  <SelectItem value="complete">{t('financial:collections.completeSequence')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('financial:collections.skipToStepDesc')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.skipNotes')}</Label>
              <Textarea
                value={skipData.notes}
                onChange={(e) => setSkipData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('financial:collections.skipNotesPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div>
                <p className="font-medium">{t('financial:collections.notifyCustomer')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('financial:collections.notifyCustomerSkipDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={skipData.notify_customer}
                onChange={(e) => setSkipData(prev => ({ ...prev, notify_customer: e.target.checked }))}
                className="h-4 w-4"
              />
            </div>
          </div>

          {/* Warning */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-orange-800">{t('financial:collections.skipWarning')}</h4>
                  <p className="text-sm text-orange-700">
                    {t('financial:collections.skipWarningDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button 
            onClick={handleSkip}
            disabled={isProcessing || !skipData.skip_reason}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            {isProcessing ? t('common:processing') : t('financial:collections.skipStep')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
