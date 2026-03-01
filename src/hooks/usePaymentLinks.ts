/**
 * Payment Links Hook
 * Phase 2g: CastorWorks Pay - Payment Links
 * 
 * Manages payment link creation, viewing, and status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface PaymentLink {
  id: string
  project_id: string
  invoice_id: string | null
  link_code: string
  status: 'active' | 'expired' | 'paid' | 'cancelled'
  amount: number
  currency: string
  description: string | null
  customer_name: string | null
  customer_email: string | null
  customer_cpf_cnpj: string | null
  allow_pix: boolean
  allow_boleto: boolean
  allow_credit_card: boolean
  allow_bank_transfer: boolean
  early_payment_discount_pct: number
  early_payment_discount_days: number
  late_payment_interest_pct: number
  late_payment_fine_pct: number
  expires_at: string | null
  viewed_at: string | null
  paid_at: string | null
  payment_method_used: string | null
  gateway_transaction_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentLinkInput {
  project_id: string
  invoice_id?: string
  amount: number
  currency?: string
  description?: string
  customer_name?: string
  customer_email?: string
  customer_cpf_cnpj?: string
  allow_pix?: boolean
  allow_boleto?: boolean
  allow_credit_card?: boolean
  allow_bank_transfer?: boolean
  early_payment_discount_pct?: number
  early_payment_discount_days?: number
  late_payment_interest_pct?: number
  late_payment_fine_pct?: number
  expires_at?: string
}

export function usePaymentLinks(projectId?: string) {
  return useQuery({
    queryKey: ['payment-links', projectId],
    queryFn: async () => {
      let query = supabase
        .from('financial_payment_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PaymentLink[]
    },
    enabled: true,
  })
}

export function usePaymentLink(linkId?: string) {
  return useQuery({
    queryKey: ['payment-link', linkId],
    queryFn: async () => {
      if (!linkId) return null

      const { data, error } = await supabase
        .from('financial_payment_links')
        .select('*')
        .eq('id', linkId)
        .single()

      if (error) throw error
      return data as PaymentLink
    },
    enabled: !!linkId,
  })
}

export function usePaymentLinkByCode(linkCode?: string) {
  return useQuery({
    queryKey: ['payment-link-by-code', linkCode],
    queryFn: async () => {
      if (!linkCode) return null

      const { data, error } = await supabase
        .from('financial_payment_links')
        .select('*')
        .eq('link_code', linkCode)
        .single()

      if (error) throw error
      return data as PaymentLink
    },
    enabled: !!linkCode,
  })
}

export function useCreatePaymentLink() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePaymentLinkInput) => {
      // Generate unique link code
      const linkCode = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const { data, error } = await supabase
        .from('financial_payment_links')
        .insert({
          project_id: input.project_id,
          invoice_id: input.invoice_id || null,
          link_code: linkCode,
          amount: input.amount,
          currency: input.currency || 'BRL',
          description: input.description || null,
          customer_name: input.customer_name || null,
          customer_email: input.customer_email || null,
          customer_cpf_cnpj: input.customer_cpf_cnpj || null,
          allow_pix: input.allow_pix ?? true,
          allow_boleto: input.allow_boleto ?? true,
          allow_credit_card: input.allow_credit_card ?? false,
          allow_bank_transfer: input.allow_bank_transfer ?? false,
          early_payment_discount_pct: input.early_payment_discount_pct ?? 0,
          early_payment_discount_days: input.early_payment_discount_days ?? 0,
          late_payment_interest_pct: input.late_payment_interest_pct ?? 0.0333,
          late_payment_fine_pct: input.late_payment_fine_pct ?? 2,
          expires_at: input.expires_at || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as PaymentLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] })
      queryClient.invalidateQueries({ queryKey: ['payment-links', data.project_id] })
      toast({
        title: 'Payment link created',
        description: 'Payment link generated successfully',
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

export function useUpdatePaymentLink() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentLink> }) => {
      const { data, error } = await supabase
        .from('financial_payment_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] })
      queryClient.invalidateQueries({ queryKey: ['payment-link', data.id] })
      toast({
        title: 'Payment link updated',
        description: 'Payment link updated successfully',
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

export function useCancelPaymentLink() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('financial_payment_links')
        .update({ status: 'cancelled' as const })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentLink
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] })
      toast({
        title: 'Payment link cancelled',
        description: 'Payment link has been cancelled',
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
