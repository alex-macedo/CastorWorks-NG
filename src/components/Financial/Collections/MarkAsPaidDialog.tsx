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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/utils/formatters'
import { format } from 'date-fns'
import { CalendarIcon, CheckCircle2, CreditCard, Banknote, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ptBR } from 'date-fns/locale'

interface MarkAsPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onSuccess?: () => void
  recordPayment?: any
}

export function MarkAsPaidDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
  recordPayment
}: MarkAsPaidDialogProps) {
  const { t, currency } = useLocalization()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [paymentData, setPaymentData] = useState({
    amount: invoice?.total_amount - invoice?.amount_paid || 0,
    payment_method: 'bank_transfer',
    payment_date: new Date(),
    reference: '',
    notes: ''
  })

  const handlePayment = async () => {
    setIsProcessing(true)
    try {
      if (recordPayment) {
        await recordPayment.mutateAsync({
          invoiceId: invoice.id,
          amount: paymentData.amount,
          paymentMethod: paymentData.payment_method,
          paymentDate: paymentData.payment_date.toISOString(),
          reference: paymentData.reference,
          notes: paymentData.notes
        })
      }
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsProcessing(false)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />
      case 'pix':
        return <Smartphone className="h-4 w-4" />
      case 'cash':
        return <Banknote className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <DialogTitle className="text-xl font-semibold">
              {t('financial:collections.markAsPaid')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('financial:arWorkspace.invoiceNumber')}</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('financial:arWorkspace.clientName')}</span>
              <span className="font-medium">{invoice.client_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('financial:arWorkspace.totalAmount')}</span>
              <span className="font-medium">{formatCurrency(invoice.total_amount, currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('financial:arWorkspace.amountPaid')}</span>
              <span className="font-medium">{formatCurrency(invoice.amount_paid, currency)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('financial:arWorkspace.outstanding')}</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(invoice.total_amount - invoice.amount_paid, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('financial:collections.paymentDetails')}</h3>
            
            <div className="space-y-2">
              <Label>{t('financial:collections.paymentAmount')}</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="0.00"
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.paymentMethod')}</Label>
              <Select
                value={paymentData.payment_method}
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t('financial:collections.bankTransfer')}
                    </div>
                  </SelectItem>
                  <SelectItem value="pix">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      {t('financial:collections.pix')}
                    </div>
                  </SelectItem>
                  <SelectItem value="credit_card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t('financial:collections.creditCard')}
                    </div>
                  </SelectItem>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      {t('financial:collections.cash')}
                    </div>
                  </SelectItem>
                  <SelectItem value="boleto">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t('financial:collections.boleto')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.paymentDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentData.payment_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentData.payment_date ? (
                      format(paymentData.payment_date, "PPP", { locale: ptBR })
                    ) : (
                      t('financial:collections.pickDate')
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentData.payment_date}
                    onSelect={(date) => setPaymentData(prev => ({ ...prev, payment_date: date || new Date() }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.reference')}</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder={t('financial:collections.paymentReferencePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('financial:collections.notes')}</Label>
              <Textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('financial:collections.paymentNotesPlaceholder')}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={isProcessing || !paymentData.amount || paymentData.amount <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isProcessing ? t('common:processing') : t('financial:collections.recordPayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
