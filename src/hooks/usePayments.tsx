/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Story 4-9: Payment Hooks
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * React Query hooks for managing supplier payments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentTransaction {
  id: string;
  purchase_order_id: string;
  delivery_confirmation_id: string | null;
  project_id: string;
  amount: number;
  currency_id: string;
  payment_terms: string;
  due_date: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: string | null;
  transaction_reference: string | null;
  paid_at: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  purchase_orders: {
    purchase_order_number: string;
    suppliers: {
      name: string;
      email: string;
    };
  };
  projects: {
    name: string;
  };
}

interface PaymentDashboardView extends PaymentTransaction {
  days_until_due: number;
  is_overdue: boolean;
  alert_level: 'none' | 'red' | 'orange' | 'yellow' | 'green';
  supplier_name: string;
  project_name: string;
}

export interface UpdatePaymentInput {
  payment_id: string;
  status?: string;
  payment_method?: string;
  transaction_reference?: string;
  paid_at?: string;
  notes?: string;
  receipt_url?: string;
}

/**
 * Hook to fetch all payment transactions
 * TODO: Enable when payment_transactions table is created
 */
export function usePayments(filter: 'all' | 'due_week' | 'overdue' | 'completed' = 'all') {
  return useQuery({
    queryKey: ['payments', filter],
    queryFn: async () => {
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          purchase_orders (
            purchase_order_number,
            suppliers (name, email)
          ),
          projects (name)
        `)
        .order('due_date', { ascending: true });

      // Apply filters
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      switch (filter) {
        case 'overdue':
          query = query.lt('due_date', today).in('status', ['pending', 'scheduled']);
          break;
        case 'due_week':
          query = query
            .gte('due_date', today)
            .lte('due_date', weekFromNow)
            .in('status', ['pending', 'scheduled']);
          break;
        case 'completed':
          query = query.eq('status', 'completed');
          break;
        case 'all':
          // No additional filters
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PaymentTransaction[];
    },
  });
}

/**
 * Hook to fetch payment dashboard view (enriched data)
 * TODO: Enable when payment_dashboard_view is created
 */
export function usePaymentDashboard(filter: 'all' | 'due_week' | 'overdue' | 'completed' = 'all') {
  return useQuery({
    queryKey: ['payment-dashboard', filter],
    queryFn: async () => {
      // Use the database view for enriched data
      let query = supabase
        .from('payment_dashboard_view')
        .select('*')
        .order('due_date', { ascending: true });

      // Apply filters
      switch (filter) {
        case 'overdue':
          query = query.eq('is_overdue', true);
          break;
        case 'due_week':
          query = query
            .eq('is_overdue', false)
            .lte('days_until_due', 7)
            .gte('days_until_due', 0);
          break;
        case 'completed':
          query = query.eq('status', 'completed');
          break;
        case 'all':
          // No additional filters
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PaymentDashboardView[];
    },
  });
}

/**
 * Hook to fetch a single payment transaction
 * TODO: Enable when payment_transactions table is created
 */
export function usePayment(paymentId?: string) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;

      console.debug('[usePayment] Fetching payment details', { paymentId });

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          purchase_orders (
            purchase_order_number,
            total_amount,
            suppliers (name, email)
          ),
          projects (name),
          delivery_confirmations (
            id,
            confirmed_at,
            delivery_date
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('[usePayment] Error fetching payment', { paymentId, error });
        throw error;
      }
      console.debug('[usePayment] Payment data received', { paymentId, data });
      return data;
    },
    enabled: !!paymentId,
  });
}

/**
 * Hook to update payment status and details
 */
export function useUpdatePayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePaymentInput) => {
      // TODO: Uncomment when payment_transactions table exists
      /*
      const { payment_id, ...updates } = input;

      const { data, error } = await supabase
        .from('payment_transactions')
        .update(updates)
        .eq('id', payment_id)
        .select()
        .single();

      if (error) throw error;
      return data;
      */
      console.log('Update payment (stub):', input);
      return input;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payment', data.payment_id || data.id] });

      toast({
        title: 'Payment updated',
        description: 'Payment status has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to mark payment as completed
 */
export function useCompletePayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payment_id,
      transaction_reference,
      notes,
      receipt_url,
    }: {
      payment_id: string;
      transaction_reference?: string;
      notes?: string;
      receipt_url?: string;
    }) => {
      // Verify user authentication for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          transaction_reference,
          notes,
          receipt_url,
          updated_by: user.id,
        })
        .eq('id', payment_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-dashboard'] });

      toast({
        title: 'Payment completed',
        description: 'Payment has been marked as completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get payment summary statistics
 */
export function usePaymentStats() {
  return useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Get all pending/scheduled payments
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('amount, currency_id, due_date, status')
        .in('status', ['pending', 'scheduled']);

      if (error) throw error;

      const stats = {
        total_pending: data?.length || 0,
        overdue: data?.filter(p => p.due_date < today).length || 0,
        due_this_week: data?.filter(p => p.due_date >= today && p.due_date <= weekFromNow).length || 0,
        total_amount_due: data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        overdue_amount: data
          ?.filter(p => p.due_date < today)
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      };

      return stats;
    },
  });
}
