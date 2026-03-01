import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/utils/formatters'
import { format, differenceInDays } from 'date-fns'
import { AlertTriangle, User, Mail, Send, Clock } from 'lucide-react'

interface EscalateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onSuccess?: () => void
}

export function EscalateDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess
}: EscalateDialogProps) {
  const { t, currency } = useLocalization()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Helper function to calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return Math.max(0, differenceInDays(today, due))
  }
  
  const [escalationData, setEscalationData] = useState({
    escalation_level: 'management',
    assigned_to: '',
    urgency: 'high',
    reason: '',
    notes: '',
    notify_email: true,
    notify_whatsapp: true
  })

  const handleEscalate = async () => {
    setIsProcessing(true)
    try {
      // TODO: Create escalation record and task via API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: t('financial:collections.escalationCreated'),
        description: t('financial:collections.invoiceEscalated')
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('financial:collections.escalationError'),
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <DialogTitle className="text-xl font-semibold">
              {t('financial:collections.escalateInvoice')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.invoiceNumber')}</p>
                  <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.clientName')}</p>
                  <p className="font-semibold">{invoice.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.outstanding')}</p>
                  <p className="font-semibold text-red-600">
                    {formatCurrency(invoice.total_amount - invoice.amount_paid, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('financial:arWorkspace.daysOverdue')}</p>
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

          {/* Escalation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('financial:collections.escalationDetails')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('financial:collections.escalationLevel')}</Label>
                  <Select
                    value={escalationData.escalation_level}
                    onValueChange={(value) => setEscalationData(prev => ({ ...prev, escalation_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">{t('financial:collections.managementEscalation')}</SelectItem>
                      <SelectItem value="legal">{t('financial:collections.legalEscalation')}</SelectItem>
                      <SelectItem value="senior_management">{t('financial:collections.seniorManagementEscalation')}</SelectItem>
                      <SelectItem value="external_agency">{t('financial:collections.externalAgencyEscalation')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('financial:collections.assignedTo')}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={escalationData.assigned_to}
                      onChange={(e) => setEscalationData(prev => ({ ...prev, assigned_to: e.target.value }))}
                      placeholder={t('financial:collections.assigneePlaceholder')}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {t('financial:collections.browseUsers')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('financial:collections.escalationReason')}</Label>
                  <Select
                    value={escalationData.reason}
                    onValueChange={(value) => setEscalationData(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_response">{t('financial:collections.noCustomerResponse')}</SelectItem>
                      <SelectItem value="payment_dispute">{t('financial:collections.paymentDispute')}</SelectItem>
                      <SelectItem value="financial_hardship">{t('financial:collections.customerFinancialHardship')}</SelectItem>
                      <SelectItem value="contract_breach">{t('financial:collections.contractBreach')}</SelectItem>
                      <SelectItem value="high_value">{t('financial:collections.highValueInvoice')}</SelectItem>
                      <SelectItem value="long_overdue">{t('financial:collections.longOverdue')}</SelectItem>
                      <SelectItem value="other">{t('financial:collections.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('financial:collections.urgency')}</Label>
                  <Select
                    value={escalationData.urgency}
                    onValueChange={(value) => setEscalationData(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-600" />
                          {t('financial:collections.critical')}
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-600" />
                          {t('financial:collections.high')}
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-600" />
                          {t('financial:collections.medium')}
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                          {t('financial:collections.low')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('financial:collections.escalationNotes')}</Label>
                  <Textarea
                    value={escalationData.notes}
                    onChange={(e) => setEscalationData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('financial:collections.escalationNotesPlaceholder')}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('financial:collections.notifications')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('financial:collections.emailNotification')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('financial:collections.emailNotificationDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={escalationData.notify_email}
                  onChange={(e) => setEscalationData(prev => ({ ...prev, notify_email: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('financial:collections.whatsappNotification')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('financial:collections.whatsappNotificationDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={escalationData.notify_whatsapp}
                  onChange={(e) => setEscalationData(prev => ({ ...prev, notify_whatsapp: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>

          {/* Escalation Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">{t('financial:collections.escalationPreview')}</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('financial:collections.level')}:</span>
                  <span className="font-medium capitalize">{escalationData.escalation_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('financial:collections.urgency')}:</span>
                  <span className={`font-medium capitalize px-2 py-1 rounded-full text-xs ${getUrgencyColor(escalationData.urgency)}`}>
                    {escalationData.urgency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('financial:collections.assignedTo')}:</span>
                  <span className="font-medium">{escalationData.assigned_to || t('financial:collections.unassigned')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('financial:collections.notifications')}:</span>
                  <span className="font-medium">
                    {escalationData.notify_email && 'Email'} 
                    {escalationData.notify_email && escalationData.notify_whatsapp && ' + '}
                    {escalationData.notify_whatsapp && 'WhatsApp'}
                    {!escalationData.notify_email && !escalationData.notify_whatsapp && 'None'}
                  </span>
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
            onClick={handleEscalate}
            disabled={isProcessing || !escalationData.assigned_to || !escalationData.reason}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {isProcessing ? t('common:processing') : t('financial:collections.escalateNow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
