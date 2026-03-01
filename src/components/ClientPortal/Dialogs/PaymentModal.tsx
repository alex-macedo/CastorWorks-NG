import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useInitiatePayment } from '@/hooks/clientPortal/useInitiatePayment';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  project_name: string;
  status: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentInitiated?: (paymentData: any) => void;
  invoices?: Invoice[];
  selectedInvoiceId?: string;
}

export function PaymentModal({
  open,
  onOpenChange,
  onPaymentInitiated,
  invoices = [],
  selectedInvoiceId,
}: PaymentModalProps) {
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();

  const [formData, setFormData] = useState({
    invoiceId: selectedInvoiceId || '',
    paymentMethod: 'credit-card' as 'credit-card' | 'bank-transfer' | 'check',
    reference: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutation = useInitiatePayment();

  const selectedInvoice = invoices.find((inv) => inv.id === formData.invoiceId);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceId && invoices.length > 0) {
      newErrors.invoiceId = 'Please select an invoice';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const paymentData = {
        invoice_id: formData.invoiceId,
        amount: selectedInvoice?.amount,
        payment_method: formData.paymentMethod,
        reference: formData.reference,
      };

      const result = await mutation.mutateAsync(paymentData);
      toast.success('Payment initiated');
      onPaymentInitiated?.(result || paymentData);
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to initiate payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      invoiceId: selectedInvoiceId || '',
      paymentMethod: 'credit-card',
      reference: '',
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Make a Payment</SheetTitle>
          <SheetDescription>
            Process a payment for your project invoices.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Selection */}
          {invoices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="invoice">Select Invoice *</Label>
              <Select
                value={formData.invoiceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, invoiceId: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="invoice">
                  <SelectValue placeholder={t("additionalPlaceholders.chooseInvoice")} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ${invoice.amount.toLocaleString()} ({invoice.project_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.invoiceId && (
                <p className="text-sm text-red-500">{errors.invoiceId}</p>
              )}
            </div>
          )}

          {/* Invoice Details Card */}
          {selectedInvoice && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">
                    {selectedInvoice.invoice_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("commonUI.project") }</span>
                  <span className="font-medium">{selectedInvoice.project_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-lg">
                    ${selectedInvoice.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  paymentMethod: value as
                    | 'credit-card'
                    | 'bank-transfer'
                    | 'check',
                })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit-card">Credit/Debit Card</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-500">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Payment Reference (Optional)</Label>
            <Input
              id="reference"
              placeholder={t("additionalPlaceholders.paymentReference")}
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          {/* Payment Method Specific Info */}
          {formData.paymentMethod === 'credit-card' && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
              You'll be redirected to a secure payment gateway to enter your card details.
            </div>
          )}

          {formData.paymentMethod === 'bank-transfer' && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
              Bank transfer details will be provided in the next step.
            </div>
          )}

          {formData.paymentMethod === 'check' && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
              Please contact us for check payment instructions.
            </div>
          )}

          {/* Buttons */}
          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedInvoice}>
              {isSubmitting ? 'Processing...' : 'Continue'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
