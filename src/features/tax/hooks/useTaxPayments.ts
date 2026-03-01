/**
 * Tax Payments Hook
 * Manages tax payment tracking and DARF management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import type {
  TaxPayment,
  CreateTaxPaymentInput,
  RecordPaymentInput,
} from '../types/tax.types';

const TAX_PAYMENTS_KEY = 'tax_payments';

export function useTaxPayments(taxProjectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all payments for a tax project
  const paymentsQuery = useQuery({
    queryKey: [TAX_PAYMENTS_KEY, taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return [];

      const { data, error } = await supabase
        .from('tax_payments')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as TaxPayment[];
    },
    enabled: !!taxProjectId,
  });

  // Get pending payments
  const pendingPayments = useMemo(() => {
    return (paymentsQuery.data ?? []).filter(
      (p) => p.status === 'PENDING' || p.status === 'OVERDUE'
    );
  }, [paymentsQuery.data]);

  // Get overdue payments
  const overduePayments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (paymentsQuery.data ?? []).filter(
      (p) => p.status === 'PENDING' && p.due_date < today
    );
  }, [paymentsQuery.data]);

  // Create payment record
  const createPayment = useMutation({
    mutationFn: async (input: CreateTaxPaymentInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tax_payments')
        .insert({
          tax_project_id: input.tax_project_id,
          tax_type: input.tax_type,
          reference_period: input.reference_period,
          amount: input.amount,
          due_date: input.due_date,
          darf_number: input.darf_number,
          status: 'PENDING',
          notes: input.notes,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaxPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PAYMENTS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Pagamento registrado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao registrar pagamento: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Record payment completion
  const recordPayment = useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const { data, error } = await supabase
        .from('tax_payments')
        .update({
          status: 'PAID',
          payment_date: input.payment_date,
          darf_receipt_url: input.darf_receipt_url,
          notes: input.notes,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as TaxPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PAYMENTS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Pagamento confirmado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao confirmar pagamento: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mark as parcelado (installment plan)
  const markAsParcelado = useMutation({
    mutationFn: async (params: {
      paymentId: string;
      parcelamentoNumber: string;
      totalInstallments: number;
    }) => {
      const { data, error } = await supabase
        .from('tax_payments')
        .update({
          status: 'PARCELADO',
          is_parcelado: true,
          parcelamento_number: params.parcelamentoNumber,
          total_installments: params.totalInstallments,
        })
        .eq('id', params.paymentId)
        .select()
        .single();

      if (error) throw error;
      return data as TaxPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PAYMENTS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Parcelamento registrado',
      });
    },
  });

  // Cancel payment
  const cancelPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('tax_payments')
        .update({ status: 'CANCELLED' })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data as TaxPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PAYMENTS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Pagamento cancelado',
      });
    },
  });

  // Get payment summary
  const getPaymentSummary = () => {
    const payments = paymentsQuery.data ?? [];

    const totalDue = payments
      .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalParcelado = payments
      .filter((p) => p.status === 'PARCELADO')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalDue,
      totalPaid,
      totalParcelado,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
    };
  };

  return {
    payments: paymentsQuery.data ?? [],
    pendingPayments,
    overduePayments,
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    createPayment,
    recordPayment,
    markAsParcelado,
    cancelPayment,
    getPaymentSummary,
    refetch: paymentsQuery.refetch,
  };
}
