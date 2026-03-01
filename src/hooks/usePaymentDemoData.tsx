import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PaymentTransactionInsert = Database['public']['Tables']['payment_transactions']['Insert'];

interface PurchaseOrderRow {
  id: string;
  purchase_order_number: string;
  project_id: string;
  total_amount: number;
  currency_id: string;
  payment_terms: string | null;
  status: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
}

interface DeliveryConfirmationRow {
  id: string;
  purchase_order_id: string;
  delivery_date: string;
}

interface PaymentGenerationSummary {
  paymentsGenerated: number;
  paymentsSkipped: number;
  purchaseOrdersProcessed: number;
  errors: string[];
}

/**
 * Helper function to calculate payment due date based on delivery date and payment terms
 */
function calculatePaymentDueDate(deliveryDate: Date, paymentTerms: string): Date {
  const days = parsePaymentTerms(paymentTerms);
  const dueDate = new Date(deliveryDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

/**
 * Parse payment terms to extract number of days
 * Supports: 'Net 30', 'Net 60', 'Net 90', 'Net 15', 'Immediate', etc.
 */
function parsePaymentTerms(paymentTerms: string): number {
  if (!paymentTerms) return 30; // Default to Net 30

  const lowerTerms = paymentTerms.toLowerCase();
  if (lowerTerms === 'immediate' || lowerTerms === 'due on receipt') {
    return 0;
  }

  // Extract number from "Net XX" format
  const match = paymentTerms.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }

  return 30; // Default to Net 30
}

/**
 * Generate realistic payment status distribution
 */
function generatePaymentStatus(index: number, total: number): 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const ratio = index / total;
  
  // 40% completed, 30% pending, 15% scheduled, 10% processing, 5% failed
  if (ratio < 0.4) return 'completed';
  if (ratio < 0.7) return 'pending';
  if (ratio < 0.85) return 'scheduled';
  if (ratio < 0.95) return 'processing';
  return 'failed';
}

/**
 * Generate payment method
 */
function generatePaymentMethod(): string {
  const methods = ['Bank Transfer', 'Check', 'Credit Card', 'Bank Transfer'];
  return methods[Math.floor(Math.random() * methods.length)];
}

/**
 * Generate transaction reference
 */
function generateTransactionReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `TXN-${year}-${random}`;
}

/**
 * Generate paid_at date for completed payments
 * Some payments are on-time (before due date), some are late (after due date)
 */
function generatePaidAtDate(dueDate: Date, isOnTime: boolean): Date {
  const paidDate = new Date(dueDate);
  
  if (isOnTime) {
    // Paid 0-5 days before due date
    const daysBefore = Math.floor(Math.random() * 6);
    paidDate.setDate(paidDate.getDate() - daysBefore);
  } else {
    // Paid 1-15 days after due date
    const daysAfter = Math.floor(Math.random() * 15) + 1;
    paidDate.setDate(paidDate.getDate() + daysAfter);
  }
  
  return paidDate;
}

export function usePaymentDemoData() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generatePayments = async () => {
    setIsGenerating(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        throw new Error('You must be logged in to generate payment data.');
      }

      const userId = user.id;

      // Query purchase orders with status 'delivered' or 'in_transit'
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, purchase_order_number, project_id, total_amount, currency_id, payment_terms, status, expected_delivery_date, actual_delivery_date')
        .in('status', ['delivered', 'in_transit'])
        .order('created_at', { ascending: false });

      if (poError) throw poError;

      if (!purchaseOrders || purchaseOrders.length === 0) {
        toast({
          title: 'No purchase orders found',
          description: 'No purchase orders with status "delivered" or "in_transit" found. Please create purchase orders first.',
          variant: 'destructive',
        });
        return;
      }

      // Query delivery confirmations
      const poIds = purchaseOrders.map(po => po.id);
      const { data: deliveryConfirmations, error: dcError } = await supabase
        .from('delivery_confirmations')
        .select('id, purchase_order_id, delivery_date')
        .in('purchase_order_id', poIds);

      if (dcError && dcError.code !== 'PGRST116') {
        console.warn('[payment-demo-data] Could not fetch delivery confirmations:', dcError);
      }

      // Create a map of purchase_order_id -> delivery_confirmation
      const deliveryMap = new Map<string, DeliveryConfirmationRow>();
      if (deliveryConfirmations) {
        deliveryConfirmations.forEach(dc => {
          deliveryMap.set(dc.purchase_order_id, dc);
        });
      }

      // Check which purchase orders already have payment transactions
      const { data: existingPayments, error: existingPaymentsError } = await supabase
        .from('payment_transactions')
        .select('purchase_order_id')
        .in('purchase_order_id', poIds);

      if (existingPaymentsError && existingPaymentsError.code !== 'PGRST116') {
        throw existingPaymentsError;
      }

      const existingPaymentPOIds = new Set(
        existingPayments?.map(p => p.purchase_order_id) || []
      );

      const summary: PaymentGenerationSummary = {
        paymentsGenerated: 0,
        paymentsSkipped: 0,
        purchaseOrdersProcessed: 0,
        errors: [],
      };

      const paymentsToInsert: PaymentTransactionInsert[] = [];

      for (const po of purchaseOrders as PurchaseOrderRow[]) {
        // Skip if payment already exists for this PO
        if (existingPaymentPOIds.has(po.id)) {
          summary.paymentsSkipped++;
          continue;
        }

        try {
          // Determine delivery date
          const deliveryConfirmation = deliveryMap.get(po.id);
          let deliveryDate: Date;
          
          if (deliveryConfirmation) {
            deliveryDate = new Date(deliveryConfirmation.delivery_date);
          } else if (po.actual_delivery_date) {
            deliveryDate = new Date(po.actual_delivery_date);
          } else if (po.expected_delivery_date) {
            deliveryDate = new Date(po.expected_delivery_date);
          } else {
            deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() - Math.floor(Math.random() * 30));
          }

          const paymentTerms = po.payment_terms || 'Net 30';
          const dueDate = calculatePaymentDueDate(deliveryDate, paymentTerms);
          const status = generatePaymentStatus(
            summary.purchaseOrdersProcessed,
            purchaseOrders.length
          );

          const payment: PaymentTransactionInsert = {
            purchase_order_id: po.id,
            delivery_confirmation_id: deliveryConfirmation?.id || null,
            project_id: po.project_id,
            amount: Number(po.total_amount),
            currency_id: po.currency_id || 'BRL',
            payment_terms: paymentTerms,
            due_date: dueDate.toISOString().split('T')[0],
            status: status,
            created_by: userId,
            metadata: {
              auto_generated: true,
              generated_at: new Date().toISOString(),
            },
          };

          if (status !== 'pending') {
            payment.payment_method = generatePaymentMethod();
          }

          if (status === 'completed') {
            const isOnTime = Math.random() > 0.3;
            payment.transaction_reference = generateTransactionReference();
            payment.paid_at = generatePaidAtDate(dueDate, isOnTime).toISOString();
            
            if (!isOnTime) {
              payment.notes = 'Payment received after due date';
            }
          }

          if (status === 'failed') {
            payment.notes = 'Payment processing failed. Please retry or contact supplier.';
          }

          paymentsToInsert.push(payment);
          summary.purchaseOrdersProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          summary.errors.push(`PO ${po.purchase_order_number}: ${errorMessage}`);
          console.error(`[payment-demo-data] Error processing PO ${po.purchase_order_number}:`, error);
        }
      }

      // Insert all payments in batch
      if (paymentsToInsert.length > 0) {
        const { data: insertedPayments, error: insertError } = await supabase
          .from('payment_transactions')
          .insert(paymentsToInsert)
          .select('id');

        if (insertError) throw insertError;

        summary.paymentsGenerated = insertedPayments?.length || 0;
      }

      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });

      const message = summary.errors.length > 0
        ? `Generated ${summary.paymentsGenerated} payments. ${summary.errors.length} errors occurred.`
        : `Successfully generated ${summary.paymentsGenerated} payment transactions.`;

      toast({
        title: 'Payment data generated',
        description: message,
      });

      if (summary.errors.length > 0) {
        console.warn('[payment-demo-data] Errors during generation:', summary.errors);
      }
      
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && err.message
          ? String(err.message)
          : 'Failed to generate payment data';
      console.error('[payment-demo-data] Generation failed:', err);
      toast({
        title: 'Error generating payment data',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePayments,
    isGenerating,
  };
}

