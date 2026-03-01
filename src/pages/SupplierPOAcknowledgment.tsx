/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Story 3-9: Supplier PO Acknowledgment Page
 * Epic 3: Purchase Order Generation & Supplier Communication
 *
 * Public page for suppliers to acknowledge purchase order receipt
 */

// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  Calendar,
  Package,
  Loader2,
} from 'lucide-react';
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

interface POData {
  purchase_order_number: string;
  supplier_name: string;
  total_amount: number;
  currency_id: string;
  expected_delivery_date: string | null;
  project_name: string;
  items_count: number;
}

type PageState = 'loading' | 'valid' | 'expired' | 'invalid' | 'acknowledged' | 'success' | 'error';

export default function SupplierPOAcknowledgment() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { formatLongDate } = useDateFormat();
  const { t } = useLocalization();
  const [state, setState] = useState<PageState>('loading');
  const [poData, setPoData] = useState<POData | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateToken = useCallback(async () => {
    try {
      setState('loading');

      // Fetch token data
      const { data, error } = await supabase
        .from('po_acknowledgment_tokens')
        .select(`
          id,
          expires_at,
          acknowledged_at,
          purchase_orders (
            purchase_order_number,
            total_amount,
            currency_id,
            expected_delivery_date,
            suppliers (name),
            projects (name)
          )
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setState('invalid');
        setErrorMessage('Invalid acknowledgment link');
        return;
      }

      // Update accessed_at timestamp
      await supabase
        .from('po_acknowledgment_tokens')
        .update({ accessed_at: new Date().toISOString() })
        .eq('token', token);

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setState('expired');
        return;
      }

      // Check if already acknowledged
      if (data.acknowledged_at) {
        setState('acknowledged');
        return;
      }

      // Extract PO data
      const po = data.purchase_orders as any;
      setPoData({
        purchase_order_number: po.purchase_order_number,
        supplier_name: po.suppliers.name,
        total_amount: po.total_amount,
        currency_id: po.currency_id,
        expected_delivery_date: po.expected_delivery_date,
        project_name: po.projects.name,
        items_count: 0, // Could fetch from quote items if needed
      });

      setState('valid');
    } catch (error: any) {
      console.error('Error validating token:', error);
      setState('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token, validateToken]);

  const handleAcknowledge = async () => {
    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke('acknowledge-purchase-order', {
        body: {
          token,
          notes: notes.trim() || null,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to acknowledge purchase order');
      }

      setState('success');
      toast({
        title: 'Purchase Order Acknowledged',
        description: 'Your acknowledgment has been recorded successfully',
      });
    } catch (error: any) {
      console.error('Error acknowledging PO:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = () => {
    if (poData) {
      window.location.href = `mailto:support@engproapp.com?subject=PO ${poData.purchase_order_number} - Request Changes`;
    }
  };

  // Loading State
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating acknowledgment link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid Token State
  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('supplierPOAcknowledgment.invalidLink')}</h2>
            <p className="text-center text-muted-foreground">
              {errorMessage || 'This acknowledgment link is invalid or has been removed.'}
            </p>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Please contact your project manager if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired Token State
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-orange-500">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('supplierPOAcknowledgment.linkExpired')}</h2>
            <p className="text-center text-muted-foreground">
              This acknowledgment link has expired (30 days after creation).
            </p>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Please contact your project manager to receive a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already Acknowledged State
  if (state === 'acknowledged') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('supplierPOAcknowledgment.alreadyAcknowledged')}</h2>
            <p className="text-center text-muted-foreground">
              This purchase order has already been acknowledged.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Thank you for your confirmation. Your project manager has been notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success State
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-center">{t('supplierPOAcknowledgment.thankYou')}</h2>
            <p className="text-center text-muted-foreground">
              Purchase order acknowledged successfully
            </p>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>✓ Project manager has been notified</p>
              <p>✓ Order status updated</p>
              <p>✓ Record saved to project history</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid Token - Show Acknowledgment Form
  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <SidebarHeaderShell>
<div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('supplierPOAcknowledgment.purchaseOrderAcknowledgment')}</h1>
          <p className="text-muted-foreground">
            Please review and confirm receipt of this purchase order
          </p>
        </div>
</SidebarHeaderShell>

        {/* PO Summary */}
        {poData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Purchase Order Details
              </CardTitle>
              <CardDescription>
                Acknowledgment confirms you have received this order and agree to the terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('toast.poNumber')}</p>
                  <p className="font-semibold">{poData.purchase_order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("commonUI.supplier") }</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {poData.supplier_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('commonUI.project')}</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {poData.project_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('toast.totalAmount')}</p>
                  <p className="font-semibold text-lg">
                    {poData.currency_id} {poData.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {poData.expected_delivery_date && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Expected delivery:{' '}
                    {formatLongDate(poData.expected_delivery_date)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Acknowledgment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Receipt</CardTitle>
            <CardDescription>
              By confirming, you acknowledge receipt of this purchase order and agree to fulfill it
              according to the specified terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder={t("additionalPlaceholders.commentsAboutOrder")}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('toast.important')}</AlertTitle>
              <AlertDescription>
                Acknowledgment confirms you have received this PO and understand the requirements.
                If you need to request changes, please click "Request Changes" below.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAcknowledge}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Receipt
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestChanges}
                disabled={submitting}
                className="flex-1"
              >
                Request Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          This is a secure link. If you did not expect this purchase order, please contact your
          project manager immediately.
        </p>
      </div>
    </div>
  );
}