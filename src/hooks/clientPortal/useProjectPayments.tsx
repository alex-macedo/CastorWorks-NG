/**
 * useProjectPayments Hook
 *
 * Fetches invoices and payment data for a project in the client portal
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  project_name: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectPayments() {
  const { projectId, isAuthenticated } = useClientPortalAuth();

  // Fetch invoices for the project
  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projectPayments', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Calculate payment statistics
  const stats = {
    totalAmount: invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
    paidAmount: invoices
      ?.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
    overdueAmount: invoices
      ?.filter(inv => {
        if (inv.status === 'paid') return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date) < new Date();
      })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
  };

  // Recent invoices (last 3)
  const recentInvoices = invoices?.slice(0, 3) || [];

  return {
    invoices: invoices || [],
    recentInvoices,
    isLoading,
    error,
    stats,
  };
}
