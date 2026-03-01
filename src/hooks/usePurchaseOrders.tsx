import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type PurchaseOrder = any
type PurchaseOrderInsert = any
type PurchaseOrderUpdate = any

export interface PurchaseOrderWithRelations extends PurchaseOrder {
  projects?: { name: string }
  suppliers?: { name: string }
  purchase_order_items?: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    total_price: number
    unit: string
    notes: string | null
  }>
  delivery_confirmations?: Array<{
    id: string
    delivery_date: string
    status: string
    notes: string | null
  }>
}

export function usePurchaseOrders() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: purchaseOrders, isLoading, error } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Let RLS policies handle access control instead of client-side filtering
      // RLS policies will automatically filter based on user roles and project access
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          projects(name),
          suppliers(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as PurchaseOrderWithRelations[]
    }
  })

  const createPurchaseOrder = useMutation({
    mutationFn: async (input: PurchaseOrderInsert & { items?: Array<{ description: string; quantity: number; unit_price: number; unit?: string; notes?: string }> }) => {
      // Verify user authentication for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.')
      }

      const { items, ...poData } = input

      // Create purchase order with audit trail
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          ...poData,
          created_by: user.id,
        })
        .select()
        .single()

      if (poError) throw poError
      return po
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast({
        title: 'Success',
        description: 'Purchase order created successfully'
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create purchase order: ${error.message}`,
        variant: 'destructive'
      })
    }
  })

  const updatePurchaseOrder = useMutation({
    mutationFn: async ({ id, ...updates }: PurchaseOrderUpdate & { id: string }) => {
      // Verify user authentication for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.')
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast({
        title: 'Success',
        description: 'Purchase order updated successfully'
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update purchase order: ${error.message}`,
        variant: 'destructive'
      })
    }
  })

  const deletePurchaseOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast({
        title: 'Success',
        description: 'Purchase order deleted successfully'
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete purchase order: ${error.message}`,
        variant: 'destructive'
      })
    }
  })

  return {
    purchaseOrders: purchaseOrders || [],
    isLoading,
    error,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
  }
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          projects(name),
          suppliers(name, category, contact_email, contact_phone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as PurchaseOrderWithRelations
    },
    enabled: !!id
  })
}
