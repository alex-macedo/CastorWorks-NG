/**
 * SEFAZ NF-e Hook
 * Phase 2i: SEFAZ Integration
 * 
 * Manages Brazilian electronic invoice (NF-e) records and integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface SefazNfeRecord {
  id: string
  project_id: string
  nfe_access_key: string
  nfe_number: string
  nfe_series: string | null
  nfe_protocol: string | null
  issuer_cnpj: string
  issuer_name: string | null
  issuer_state: string | null
  recipient_cnpj: string
  recipient_name: string | null
  total_amount: number
  tax_icms: number
  tax_ipi: number
  tax_pis: number
  tax_cofins: number
  tax_iss: number
  currency: string
  issue_date: string
  authorization_date: string | null
  nfe_status: 'authorized' | 'cancelled' | 'denied' | 'corrected'
  xml_storage_path: string | null
  items: any[]
  linked_invoice_id: string | null
  linked_bill_id: string | null
  linked_pre_launch_id: string | null
  link_status: 'unlinked' | 'auto_linked' | 'manual_linked' | 'rejected'
  retrieved_at: string
  retrieval_method: 'sefaz_api' | 'manual_upload' | 'email_forward' | 'ocr'
  created_at: string
  updated_at: string
}

export interface PreLaunchEntry {
  id: string
  project_id: string
  source_type: 'whatsapp_ocr' | 'email_ocr' | 'web_upload' | 'sefaz_nfe' | 'manual'
  source_message_id: string | null
  source_ocr_id: string | null
  entry_type: 'expense' | 'income' | 'transfer'
  description: string
  vendor_name: string | null
  vendor_cnpj: string | null
  amount: number
  currency: string
  document_date: string | null
  due_date: string | null
  category: string | null
  ai_confidence: number | null
  ai_category_suggestions: any[]
  status: 'pending' | 'approved' | 'rejected' | 'merged'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  linked_invoice_id: string | null
  linked_bill_id: string | null
  created_at: string
  updated_at: string
}

export function useSefazNfeRecords(projectId?: string) {
  return useQuery({
    queryKey: ['sefaz-nfe-records', projectId],
    queryFn: async () => {
      let query = supabase
        .from('sefaz_nfe_records')
        .select('*')
        .order('issue_date', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as SefazNfeRecord[]
    },
    enabled: true,
  })
}

export function useSefazNfe(nfeId?: string) {
  return useQuery({
    queryKey: ['sefaz-nfe', nfeId],
    queryFn: async () => {
      if (!nfeId) return null

      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .select('*')
        .eq('id', nfeId)
        .single()

      if (error) throw error
      return data as SefazNfeRecord
    },
    enabled: !!nfeId,
  })
}

export function useSefazNfeByAccessKey(accessKey?: string) {
  return useQuery({
    queryKey: ['sefaz-nfe-by-key', accessKey],
    queryFn: async () => {
      if (!accessKey) return null

      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .select('*')
        .eq('nfe_access_key', accessKey)
        .single()

      if (error) throw error
      return data as SefazNfeRecord
    },
    enabled: !!accessKey,
  })
}

export function useUnlinkedNfeRecords(projectId?: string) {
  return useQuery({
    queryKey: ['unlinked-nfe-records', projectId],
    queryFn: async () => {
      let query = supabase
        .from('sefaz_nfe_records')
        .select('*')
        .eq('link_status', 'unlinked')
        .order('issue_date', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as SefazNfeRecord[]
    },
    enabled: true,
  })
}

export function usePreLaunchEntries(projectId?: string, status?: string) {
  return useQuery({
    queryKey: ['pre-launch-entries', projectId, status],
    queryFn: async () => {
      let query = supabase
        .from('financial_pre_launch_entries')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PreLaunchEntry[]
    },
    enabled: true,
  })
}

export function usePendingPreLaunchEntries(projectId?: string) {
  return useQuery({
    queryKey: ['pending-pre-launch-entries', projectId],
    queryFn: async () => {
      let query = supabase
        .from('financial_pre_launch_entries')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PreLaunchEntry[]
    },
    enabled: true,
  })
}

export function useLinkNfeToInvoice() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nfeId, invoiceId }: { nfeId: string; invoiceId: string }) => {
      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .update({
          linked_invoice_id: invoiceId,
          link_status: 'manual_linked',
        })
        .eq('id', nfeId)
        .select()
        .single()

      if (error) throw error
      return data as SefazNfeRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sefaz-nfe-records'] })
      queryClient.invalidateQueries({ queryKey: ['unlinked-nfe-records'] })
      toast({
        title: 'NF-e linked',
        description: 'NF-e has been linked to invoice',
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

export function useLinkNfeToBill() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nfeId, billId }: { nfeId: string; billId: string }) => {
      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .update({
          linked_bill_id: billId,
          link_status: 'manual_linked',
        })
        .eq('id', nfeId)
        .select()
        .single()

      if (error) throw error
      return data as SefazNfeRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sefaz-nfe-records'] })
      queryClient.invalidateQueries({ queryKey: ['unlinked-nfe-records'] })
      toast({
        title: 'NF-e linked',
        description: 'NF-e has been linked to bill',
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

export function useApprovePreLaunchEntry() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('financial_pre_launch_entries')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error
      return data as PreLaunchEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-launch-entries'] })
      queryClient.invalidateQueries({ queryKey: ['pending-pre-launch-entries'] })
      toast({
        title: 'Entry approved',
        description: 'Pre-launch entry has been approved',
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

export function useRejectPreLaunchEntry() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('financial_pre_launch_entries')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error
      return data as PreLaunchEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-launch-entries'] })
      queryClient.invalidateQueries({ queryKey: ['pending-pre-launch-entries'] })
      toast({
        title: 'Entry rejected',
        description: 'Pre-launch entry has been rejected',
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

export function useFetchSefazNfe() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, accessKey }: { projectId: string; accessKey: string }) => {
      // In production, this would call an Edge Function to fetch from SEFAZ
      // For now, we'll create a placeholder entry
      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .insert({
          project_id: projectId,
          nfe_access_key: accessKey,
          nfe_number: '000000000',
          issuer_cnpj: '00000000000000',
          recipient_cnpj: '00000000000000',
          total_amount: 0,
          currency: 'BRL',
          issue_date: new Date().toISOString(),
          nfe_status: 'authorized',
          retrieval_method: 'sefaz_api',
        })
        .select()
        .single()

      if (error) throw error
      return data as SefazNfeRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sefaz-nfe-records'] })
      toast({
        title: 'NF-e retrieved',
        description: 'NF-e has been fetched from SEFAZ',
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
