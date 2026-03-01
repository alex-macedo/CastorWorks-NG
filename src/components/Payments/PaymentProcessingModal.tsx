/**
 * Story 4-10: Payment Processing Modal
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Modal for initiating and confirming supplier payments
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUpdatePayment, useCompletePayment } from '@/hooks/usePayments';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2, User } from 'lucide-react';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';

const initiatePaymentSchema = z.object({
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
  confirm: z.boolean().refine((val) => val === true, {
    message: 'You must confirm to initiate payment',
  }),
});

const completePaymentSchema = z.object({
  transaction_reference: z.string().min(1, 'Transaction reference is required'),
  paid_at: z.string().optional(),
  notes: z.string().optional(),
  receipt_url: z.string().url().optional().or(z.literal('')),
});

type InitiateFormValues = z.infer<typeof initiatePaymentSchema>;
type CompleteFormValues = z.infer<typeof completePaymentSchema>;

interface PaymentProcessingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    amount: number;
    currency_id: string;
    due_date: string;
    supplier_name: string;
    purchase_order_number: string;
    status: string;
  };
  mode: 'initiate' | 'complete';
}

export function PaymentProcessingModal({
  open,
  onOpenChange,
  payment,
  mode,
}: PaymentProcessingModalProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const updatePayment = useUpdatePayment();
  const completePayment = useCompletePayment();
  const [submitting, setSubmitting] = useState(false);
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUserProfile();

  const initiateForm = useForm<InitiateFormValues>({
    resolver: zodResolver(initiatePaymentSchema),
    defaultValues: {
      payment_method: '',
      transaction_reference: '',
      notes: '',
      confirm: false,
    },
  });

  const completeForm = useForm<CompleteFormValues>({
    resolver: zodResolver(completePaymentSchema),
    defaultValues: {
      transaction_reference: '',
      paid_at: new Date().toISOString().split('T')[0],
      notes: '',
      receipt_url: '',
    },
  });

  const onInitiateSubmit = async (values: InitiateFormValues) => {
    try {
      setSubmitting(true);
      await updatePayment.mutateAsync({
        payment_id: payment.id,
        status: 'processing',
        payment_method: values.payment_method,
        transaction_reference: values.transaction_reference,
        notes: values.notes,
      });
      onOpenChange(false);
      initiateForm.reset();
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const onCompleteSubmit = async (values: CompleteFormValues) => {
    try {
      setSubmitting(true);
      await completePayment.mutateAsync({
        payment_id: payment.id,
        transaction_reference: values.transaction_reference,
        notes: values.notes,
        receipt_url: values.receipt_url || undefined,
      });
      onOpenChange(false);
      completeForm.reset();
    } catch (error) {
      console.error('Error completing payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'initiate') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('payments.initiatePayment')}</SheetTitle>
            <SheetDescription>
              {t('payments.confirmInitiationFor', { supplier: payment.supplier_name })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* User Authentication Check */}
            {userError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('payments.authenticationRequired')}</AlertTitle>
                <AlertDescription>
                  {t('payments.signInToProcess')}
                </AlertDescription>
              </Alert>
            )}

            {/* Entered By Display */}
            {currentUser && (
              <div className="bg-muted p-3 rounded-md border mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('payments.processedBy')}</span>
                  <span className="text-sm font-medium">{currentUser.display_name}</span>
                </div>
              </div>
            )}

            <Form {...initiateForm}>
              <form onSubmit={initiateForm.handleSubmit(onInitiateSubmit)} className="space-y-4">
                {/* Payment Details */}
                <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("commonUI.supplier") }</p>
                      <p className="font-medium">{payment.supplier_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('payments.purchaseOrder')}</p>
                      <p className="font-medium">{payment.purchase_order_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('payments.amount')}</p>
                      <p className="font-medium text-lg">
                        {payment.currency_id} {payment.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('payments.dueDate')}</p>
                      <p className="font-medium">
                        {formatDate(payment.due_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <FormField
                  control={initiateForm.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('payments.paymentMethod')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("additionalPlaceholders.selectPaymentMethod")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">{t('common.paymentMethod.bankTransfer')}</SelectItem>
                          <SelectItem value="Check">{t('common.paymentMethod.check')}</SelectItem>
                          <SelectItem value="Credit Card">{t('common.paymentMethod.creditCard')}</SelectItem>
                          <SelectItem value="Wire Transfer">{t('common.paymentMethod.wireTransfer')}</SelectItem>
                          <SelectItem value="Other">{t('common.transactionCategory.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transaction Reference */}
                <FormField
                  control={initiateForm.control}
                  name="transaction_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('payments.transactionReferenceOptional')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("additionalPlaceholders.exampleTransactionId")} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('payments.referenceNumberHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={initiateForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('payments.notesOptional')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("additionalPlaceholders.paymentNotes")}
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirmation Checkbox */}
                <FormField
                  control={initiateForm.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          {t('payments.confirmInitiated')}
                        </FormLabel>
                        <FormDescription>
                          {t('payments.markAsProcessingHelp')}
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <SheetFooter className="mt-4 sm:justify-between gap-3 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting || !currentUser || isLoadingUser || !!userError}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('payments.processing')}
                      </>
                    ) : (
                      t('payments.initiatePayment')
                    )}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Complete Payment Mode
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('payments.markAsCompleted')}</SheetTitle>
          <SheetDescription>
            {t('payments.confirmCompletionFor', { supplier: payment.supplier_name })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* User Authentication Check */}
          {userError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('payments.authenticationRequired')}</AlertTitle>
              <AlertDescription>
                {t('payments.signInToProcess')}
              </AlertDescription>
            </Alert>
          )}

          {/* Entered By Display */}
          {currentUser && (
            <div className="bg-muted p-3 rounded-md border mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('payments.completedBy')}</span>
                <span className="text-sm font-medium">{currentUser.display_name}</span>
              </div>
            </div>
          )}

          <Form {...completeForm}>
            <form onSubmit={completeForm.handleSubmit(onCompleteSubmit)} className="space-y-4">
              {/* Payment Details */}
              <div className="rounded-lg border p-4 space-y-2 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-900">{t('payments.paymentCompletion')}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('payments.amount')}</p>
                    <p className="font-medium">
                      {payment.currency_id} {payment.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("commonUI.supplier") }</p>
                    <p className="font-medium">{payment.supplier_name}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Reference */}
              <FormField
                control={completeForm.control}
                name="transaction_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('payments.transactionReferenceRequired')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("additionalPlaceholders.exampleTransactionId")} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('payments.confirmationNumberHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Paid Date */}
              <FormField
                control={completeForm.control}
                name="paid_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('payments.paymentDate')}</FormLabel>
                    <FormControl>
                      <DateInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt URL */}
              <FormField
                control={completeForm.control}
                name="receipt_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('payments.receiptUrlOptional')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("additionalPlaceholders.apiUrl")} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('payments.receiptLinkHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={completeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('payments.notesOptional')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("additionalPlaceholders.paymentCompletion")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="mt-4 sm:justify-between gap-3 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={submitting || !currentUser || isLoadingUser || !!userError}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('payments.saving')}
                    </>
                  ) : (
                    t('payments.markAsCompleted')
                  )}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

