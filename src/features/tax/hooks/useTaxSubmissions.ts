/**
 * Tax Submissions Hook
 * Manages monthly SERO/DCTFWeb submission tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  TaxSubmission,
  CreateTaxSubmissionInput,
} from '../types/tax.types';

const TAX_SUBMISSIONS_KEY = 'tax_submissions';

export function useTaxSubmissions(taxProjectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all submissions for a tax project
  const submissionsQuery = useQuery({
    queryKey: [TAX_SUBMISSIONS_KEY, taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return [];

      const { data, error } = await supabase
        .from('tax_submissions')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('reference_month', { ascending: false });

      if (error) throw error;
      return data as TaxSubmission[];
    },
    enabled: !!taxProjectId,
  });

  // Create or update submission for a month
  const upsertSubmission = useMutation({
    mutationFn: async (input: CreateTaxSubmissionInput) => {
      const { data: user } = await supabase.auth.getUser();

      // Check if submission exists for this month
      const { data: existing } = await supabase
        .from('tax_submissions')
        .select('id')
        .eq('tax_project_id', input.tax_project_id)
        .eq('reference_month', input.reference_month)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('tax_submissions')
          .update({
            sero_submitted: input.sero_submitted,
            sero_submission_date: input.sero_submission_date,
            sero_receipt: input.sero_receipt,
            dctfweb_submitted: input.dctfweb_submitted,
            dctfweb_transmission_date: input.dctfweb_transmission_date,
            dctfweb_receipt_number: input.dctfweb_receipt_number,
            labor_amount_declared: input.labor_amount_declared,
            materials_documented: input.materials_documented,
            inss_calculated: input.inss_calculated,
            notes: input.notes,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as TaxSubmission;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('tax_submissions')
          .insert({
            tax_project_id: input.tax_project_id,
            reference_month: input.reference_month,
            sero_submitted: input.sero_submitted ?? false,
            sero_submission_date: input.sero_submission_date,
            sero_receipt: input.sero_receipt,
            dctfweb_submitted: input.dctfweb_submitted ?? false,
            dctfweb_transmission_date: input.dctfweb_transmission_date,
            dctfweb_receipt_number: input.dctfweb_receipt_number,
            labor_amount_declared: input.labor_amount_declared,
            materials_documented: input.materials_documented,
            inss_calculated: input.inss_calculated,
            notes: input.notes,
            created_by: user?.user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data as TaxSubmission;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_SUBMISSIONS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Declaração registrada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao registrar declaração: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mark SERO as submitted
  const markSeroSubmitted = useMutation({
    mutationFn: async (params: {
      submissionId: string;
      receipt?: string;
    }) => {
      const { data, error } = await supabase
        .from('tax_submissions')
        .update({
          sero_submitted: true,
          sero_submission_date: new Date().toISOString(),
          sero_receipt: params.receipt,
        })
        .eq('id', params.submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as TaxSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_SUBMISSIONS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'SERO marcado como enviado',
      });
    },
  });

  // Mark DCTFWeb as submitted
  const markDctfwebSubmitted = useMutation({
    mutationFn: async (params: {
      submissionId: string;
      receiptNumber: string;
    }) => {
      const { data, error } = await supabase
        .from('tax_submissions')
        .update({
          dctfweb_submitted: true,
          dctfweb_transmission_date: new Date().toISOString(),
          dctfweb_receipt_number: params.receiptNumber,
        })
        .eq('id', params.submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as TaxSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_SUBMISSIONS_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'DCTFWeb marcado como transmitido',
      });
    },
  });

  // Get submission status summary
  const getSubmissionStatus = () => {
    const submissions = submissionsQuery.data ?? [];

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentSubmission = submissions.find(
      (s) => s.reference_month === currentMonth
    );

    return {
      total: submissions.length,
      seroComplete: submissions.filter((s) => s.sero_submitted).length,
      dctfwebComplete: submissions.filter((s) => s.dctfweb_submitted).length,
      currentMonth: {
        exists: !!currentSubmission,
        seroSubmitted: currentSubmission?.sero_submitted ?? false,
        dctfwebSubmitted: currentSubmission?.dctfweb_submitted ?? false,
      },
    };
  };

  return {
    submissions: submissionsQuery.data ?? [],
    isLoading: submissionsQuery.isLoading,
    isError: submissionsQuery.isError,
    upsertSubmission,
    markSeroSubmitted,
    markDctfwebSubmitted,
    getSubmissionStatus,
    refetch: submissionsQuery.refetch,
  };
}
