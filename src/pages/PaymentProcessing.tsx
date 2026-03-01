/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Story 4-10: Payment Processing Page
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Page for viewing payment details and processing payments
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePayment } from '@/hooks/usePayments';
import { PaymentProcessingModal } from '@/components/Payments/PaymentProcessingModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Calendar,
  Building2,
  Package,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function PaymentProcessing() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { data: payment, isLoading, isError, error } = usePayment(paymentId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'initiate' | 'complete'>('initiate');
  const { t } = useLocalization();
  const { formatLongDate, formatDateTime } = useDateFormat();

  const handleInitiatePayment = () => {
    setModalMode('initiate');
    setModalOpen(true);
  };

  const handleMarkCompleted = () => {
    setModalMode('complete');
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <SidebarHeaderShell>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => navigate('/payments')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{t('payments.paymentDetails')}</h1>
              </div>
            </div>
          </SidebarHeaderShell>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">{t('common.errorTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-800">
                {isError && error instanceof Error
                  ? error.message
                  : t('payments.notFound')}
              </p>
              <Button onClick={() => navigate('/payments')}>
                {t('payments.backToDashboard')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => navigate('/payments')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{t('payments.paymentDetails')}</h1>
                <p className="text-muted-foreground">
                  {(payment.purchase_orders as any).purchase_order_number}
                </p>
              </div>
            </div>
            <Badge className={statusColors[payment.status] || statusColors.pending}>
              {t(`payments.status.${payment.status}`)}
            </Badge>
          </div>
        </SidebarHeaderShell>

        {/* Core details grid */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 h-full">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">{t('payments.paymentAmount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {payment.currency_id} {payment.amount.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('payments.paymentTerms')}: {payment.payment_terms}
              </p>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('payments.supplierInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.name')}</p>
                <p className="font-medium">
                  {(payment.purchase_orders as any).suppliers.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.email')}</p>
                <p className="font-medium">
                  {(payment.purchase_orders as any).suppliers.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('payments.projectInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.project')}</p>
                <p className="font-medium">{(payment.projects as any).name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.purchaseOrder')}</p>
                <p className="font-medium">
                  {(payment.purchase_orders as any).purchase_order_number}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('payments.paymentTimeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {t('payments.created')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(new Date(payment.created_at))}
                </p>
              </div>

              {(payment.delivery_confirmations as any) && (
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {t('payments.deliveryConfirmed')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(new Date((payment.delivery_confirmations as any).confirmed_at))}
                  </p>
                </div>
              )}

              <div>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  {t('payments.dueDate')}
                </p>
                <div className="text-sm text-muted-foreground flex items-center">
                  {formatLongDate(new Date(payment.due_date))}
                  {new Date(payment.due_date) < new Date() && payment.status !== 'completed' && (
                    <Badge variant="destructive" className="ml-2">
                      {t('payments.overdue')}
                    </Badge>
                  )}
                </div>
              </div>

              {payment.paid_at && (
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {t('payments.paymentCompleted')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(new Date(payment.paid_at))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('payments.paymentDetailsSection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.paymentMethod')}</p>
                <p className="font-medium">{payment.payment_method || '-'}</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t('payments.transactionReference')}</p>
                  <p className="font-medium font-mono break-all">
                    {payment.transaction_reference || '-'}
                  </p>
                </div>
                {payment.receipt_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('payments.viewReceipt')}
                    </a>
                  </Button>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('payments.notes')}</p>
                <p className="text-sm whitespace-pre-wrap">{payment.notes || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              {payment.status === 'pending' && (
                <Button onClick={handleInitiatePayment} className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('payments.initiatePayment')}
                </Button>
              )}
              {payment.status === 'processing' && (
                <Button onClick={handleMarkCompleted} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('payments.markAsCompleted')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/payments')}
                className={payment.status === 'completed' ? 'flex-1' : ''}
              >
                {payment.status === 'completed' ? t('payments.backToDashboard') : t('payments.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Processing Modal */}
      {modalOpen && (
        <PaymentProcessingModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          payment={{
            id: payment.id,
            amount: payment.amount,
            currency_id: payment.currency_id,
            due_date: payment.due_date,
            supplier_name: (payment.purchase_orders as any).suppliers.name,
            purchase_order_number: (payment.purchase_orders as any).purchase_order_number,
            status: payment.status,
          }}
          mode={modalMode}
        />
      )}
    </div>
  );
}
