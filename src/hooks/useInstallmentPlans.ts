/**
 * Installment Plans Hook
 * Phase 2g: CastorWorks Pay - Installment Plans
 * 
 * Manages installment plan creation and tracking from financial_installment_plans table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface InstallmentPlan {
  id: string
  project_id: string
  invoice_id: string | null
  payment_link_id: string | null
  total_amount: number
  currency: string
  num_installments: number
  installment_amount: number
  first_due_date: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  status: 'active' | 'completed' | 'cancelled' | 'defaulted'
  installments_paid: number
  total_paid: number
  customer_name: string | null
  customer_cpf_cnpj: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InstallmentItem {
  id: string
  plan_id: string
  installment_number: number
  due_date: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_at: string | null
  paid_amount: number | null
  payment_method: string | null
  gateway_transaction_id: string | null
  boleto_barcode: string | null
  boleto_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateInstallmentPlanInput {
  project_id: string
  invoice_id?: string
  payment_link_id?: string
  total_amount: number
  currency?: string
  num_installments: number
  first_due_date: string
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  customer_name?: string
  customer_cpf_cnpj?: string
}

export function useInstallmentPlans(projectId?: string) {
  return useQuery({
    queryKey: ['installment-plans', projectId],
    queryFn: async () => {
      let query = supabase
        .from('financial_installment_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as InstallmentPlan[]
    },
    enabled: true,
  })
}

export function useInstallmentPlan(planId?: string) {
  return useQuery({
    queryKey: ['installment-plan', planId],
    queryFn: async () => {
      if (!planId) return null

      const { data, error } = await supabase
        .from('financial_installment_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) throw error
      return data as InstallmentPlan
    },
    enabled: !!planId,
  })
}

export function useInstallmentItems(planId?: string) {
  return useQuery({
    queryKey: ['installment-items', planId],
    queryFn: async () => {
      if (!planId) return []

      const { data, error } = await supabase
        .from('financial_installment_items')
        .select('*')
        .eq('plan_id', planId)
        .order('installment_number', { ascending: true })

      if (error) throw error
      return data as InstallmentItem[]
    },
    enabled: !!planId,
  })
}

export function usePendingInstallments(projectId?: string) {
  return useQuery({
    queryKey: ['pending-installments', projectId],
    queryFn: async () => {
      let query = supabase
        .from('financial_installment_items')
        .select(`
          *,
          financial_installment_plans (
            id,
            project_id,
            customer_name,
            total_amount,
            currency
          )
        `)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })

      if (projectId) {
        query = query.eq('financial_installment_plans.project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    enabled: true,
  })
}

export function useCreateInstallmentPlan() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInstallmentPlanInput) => {
      const frequency = input.frequency || 'monthly'
      const installmentAmount = input.total_amount / input.num_installments

      // Calculate due dates for each installment
      const installments: Array<{
        installment_number: number
        due_date: string
        amount: number
      }> = []

      for (let i = 0; i < input.num_installments; i++) {
        const dueDate = new Date(input.first_due_date)
        
        switch (frequency) {
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + i * 7)
            break
          case 'biweekly':
            dueDate.setDate(dueDate.getDate() + i * 14)
            break
          case 'monthly':
          default:
            dueDate.setMonth(dueDate.getMonth() + i)
            break
        }

        installments.push({
          installment_number: i + 1,
          due_date: dueDate.toISOString().split('T')[0],
          amount: installmentAmount,
        })
      }

      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from('financial_installment_plans')
        .insert({
          project_id: input.project_id,
          invoice_id: input.invoice_id || null,
          payment_link_id: input.payment_link_id || null,
          total_amount: input.total_amount,
          currency: input.currency || 'BRL',
          num_installments: input.num_installments,
          installment_amount: installmentAmount,
          first_due_date: input.first_due_date,
          frequency,
          customer_name: input.customer_name || null,
          customer_cpf_cnpj: input.customer_cpf_cnpj || null,
        })
        .select()
        .single()

      if (planError) throw planError

      // Create installment items
      const { error: itemsError } = await supabase
        .from('financial_installment_items')
        .insert(
          installments.map(item => ({
            plan_id: plan.id,
            installment_number: item.installment_number,
            due_date: item.due_date,
            amount: item.amount,
            status: 'pending' as const,
          }))
        )

      if (itemsError) throw itemsError

      return plan as InstallmentPlan
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installment-plans'] })
      queryClient.invalidateQueries({ queryKey: ['installment-plans', data.project_id] })
      toast({
        title: 'Installment plan created',
        description: `Created plan with ${data.num_installments} installments`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useRecordPayment() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      paidAmount,
      paymentMethod,
      transactionId,
    }: {
      itemId: string
      paidAmount: number
      paymentMethod?: string
      transactionId?: string
    }) => {
      // Update installment item
      const { data: item, error } = await supabase
        .from('financial_installment_items')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: paidAmount,
          payment_method: paymentMethod || null,
          gateway_transaction_id: transactionId || null,
        })
        .eq('id', itemId)
        .select('plan_id')
        .single()

      if (error) throw error

      // Update plan totals
      const { data: plan } = await supabase
        .from('financial_installment_plans')
        .select('installments_paid, total_paid, num_installments')
        .eq('id', item.plan_id)
        .single()

      if (plan) {
        const newInstallmentsPaid = plan.installments_paid + 1
        const newTotalPaid = plan.total_paid + paidAmount
        const newStatus = newInstallmentsPaid >= plan.num_installments ? 'completed' : 'active'

        await supabase
          .from('financial_installment_plans')
          .update({
            installments_paid: newInstallmentsPaid,
            total_paid: newTotalPaid,
            status: newStatus,
          })
          .eq('id', item.plan_id)
      }

      return item
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-items'] })
      queryClient.invalidateQueries({ queryKey: ['installment-plans'] })
      queryClient.invalidateQueries({ queryKey: ['pending-installments'] })
      toast({
        title: 'Payment recorded',
        description: 'Installment payment has been recorded',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useCancelInstallmentPlan() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Cancel all pending items
      await supabase
        .from('financial_installment_items')
        .update({ status: 'cancelled' as const })
        .eq('plan_id', id)
        .eq('status', 'pending')

      // Update plan status
      const { data, error } = await supabase
        .from('financial_installment_plans')
        .update({ status: 'cancelled' as const })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as InstallmentPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plans'] })
      queryClient.invalidateQueries({ queryKey: ['installment-items'] })
      toast({
        title: 'Installment plan cancelled',
        description: 'Installment plan has been cancelled',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
