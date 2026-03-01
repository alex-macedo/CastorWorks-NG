import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type {
  FinancialAPBill,
  FinancialAPBillInsert,
  APBillStatus,
  APDueRiskSummary,
} from '@/types/finance'

const TABLE = 'financial_ap_bills'
const QUERY_KEY = 'financial_ap_bills'

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

export const useFinancialAPWorkspace = (projectId?: string) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: bills, isLoading, error } = useQuery({
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

      return (data ?? []) as FinancialAPBill[]
    },
  })

  const createBill = useMutation({
    mutationFn: async (bill: FinancialAPBillInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...bill, created_by: user.id })
        .select()
        .single()

      if (error) throw error
      return data as FinancialAPBill
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Bill created', description: 'AP bill created successfully.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateBill = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FinancialAPBillInsert>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FinancialAPBill
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast({ title: 'Bill updated', description: 'AP bill updated successfully.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: APBillStatus }) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FinancialAPBill
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const dueRiskSummary: APDueRiskSummary = (() => {
    if (!bills || bills.length === 0) {
      return {
        dueThisWeek: 0,
        dueNextWeek: 0,
        dueThisMonth: 0,
        overdue: 0,
        totalPending: 0,
        highRiskCount: 0,
        averageDaysPayable: 0,
        billCount: 0,
      }
    }

    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
    const endOfNextWeek = new Date(endOfWeek)
    endOfNextWeek.setDate(endOfWeek.getDate() + 7)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let dueThisWeek = 0
    let dueNextWeek = 0
    let dueThisMonth = 0
    let overdue = 0
    let totalPending = 0
    let highRiskCount = 0
    let totalDays = 0
    let paidCount = 0

    for (const bill of bills) {
      const outstanding = bill.total_amount - bill.amount_paid
      const dueDate = new Date(bill.due_date)

      if (bill.status === 'paid') {
        const issued = new Date(bill.issue_date)
        const paid = new Date(bill.updated_at)
        totalDays += Math.max(0, Math.floor((paid.getTime() - issued.getTime()) / 86400000))
        paidCount++
        continue
      }

      if (bill.status === 'cancelled') continue

      if (outstanding > 0) {
        totalPending += outstanding

        if (dueDate < now) {
          overdue += outstanding
        } else if (dueDate <= endOfWeek) {
          dueThisWeek += outstanding
        } else if (dueDate <= endOfNextWeek) {
          dueNextWeek += outstanding
        }

        if (dueDate <= endOfMonth && dueDate >= now) {
          dueThisMonth += outstanding
        }

        if (bill.risk_score !== null && bill.risk_score >= 70) {
          highRiskCount++
        }
      }
    }

    return {
      dueThisWeek,
      dueNextWeek,
      dueThisMonth,
      overdue,
      totalPending,
      highRiskCount,
      averageDaysPayable: paidCount > 0 ? Math.round(totalDays / paidCount) : 0,
      billCount: bills.length,
    }
  })()

  return {
    bills: bills ?? [],
    isLoading,
    error,
    dueRiskSummary,
    createBill,
    updateBill,
    updateStatus,
  }
}
