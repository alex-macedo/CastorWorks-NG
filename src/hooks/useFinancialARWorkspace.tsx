import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type {
  FinancialARInvoice,
  FinancialARInvoiceInsert,
  ARInvoiceStatus,
  ARAgingSummary,
} from '@/types/finance'

const TABLE = 'financial_ar_invoices'
const QUERY_KEY = 'financial_ar_invoices'

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

export const useFinancialARWorkspace = (projectId?: string) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: async () => {
      let query = supabase
        .from(TABLE)
        .select('*, projects(name), financial_accounts(name)')
        .order('due_date', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return (data ?? []) as FinancialARInvoice[]
    },
  })

  const createInvoice = useMutation({
    mutationFn: async (invoice: FinancialARInvoiceInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...invoice, created_by: user.id })
        .select()
        .single()

      if (error) throw error
      return data as FinancialARInvoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Invoice created', description: 'AR invoice created successfully.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FinancialARInvoiceInsert>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FinancialARInvoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Invoice updated', description: 'AR invoice updated successfully.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ARInvoiceStatus }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FinancialARInvoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const agingSummary: ARAgingSummary = (() => {
    if (!invoices || invoices.length === 0) {
      return {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalOutstanding: 0,
        totalOverdue: 0,
        averageDSO: 0,
        invoiceCount: 0,
      }
    }

    const now = new Date()
    let current = 0
    let d1to30 = 0
    let d31to60 = 0
    let d61to90 = 0
    let d90plus = 0
    let totalOverdue = 0
    let totalDSODays = 0
    let paidCount = 0

    for (const inv of invoices) {
      const outstanding = inv.total_amount - inv.amount_paid
      if (outstanding <= 0) {
        if (inv.status === 'paid') {
          const issued = new Date(inv.issue_date)
          const paid = new Date(inv.updated_at)
          totalDSODays += Math.max(0, Math.floor((paid.getTime() - issued.getTime()) / 86400000))
          paidCount++
        }
        continue
      }

      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000))

      if (daysOverdue <= 0) {
        current += outstanding
      } else if (daysOverdue <= 30) {
        d1to30 += outstanding
        totalOverdue += outstanding
      } else if (daysOverdue <= 60) {
        d31to60 += outstanding
        totalOverdue += outstanding
      } else if (daysOverdue <= 90) {
        d61to90 += outstanding
        totalOverdue += outstanding
      } else {
        d90plus += outstanding
        totalOverdue += outstanding
      }
    }

    return {
      current,
      days1to30: d1to30,
      days31to60: d31to60,
      days61to90: d61to90,
      days90plus: d90plus,
      totalOutstanding: current + d1to30 + d31to60 + d61to90 + d90plus,
      totalOverdue,
      averageDSO: paidCount > 0 ? Math.round(totalDSODays / paidCount) : 0,
      invoiceCount: invoices.length,
    }
  })()

  return {
    invoices: invoices ?? [],
    isLoading,
    error,
    agingSummary,
    createInvoice,
    updateInvoice,
    updateStatus,
  }
}
