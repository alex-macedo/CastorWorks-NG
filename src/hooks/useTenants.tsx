import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TenantFormData, TenantRow } from '@/types/platform.types';

// The list query stays in PlatformCustomers to preserve the existing ['platform','customers'] key.
// This hook exposes only write operations.

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TenantFormData) => {
      const { data, error } = await supabase
        .from('tenants')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as TenantRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'customers'] });
      toast.success('Customer created');
    },
    onError: (err: Error) => toast.error(`Failed to create customer: ${err.message}`),
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TenantFormData> }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TenantRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'customers'] });
      toast.success('Customer updated');
    },
    onError: (err: Error) => toast.error(`Failed to update customer: ${err.message}`),
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'customers'] });
      toast.success('Customer deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete customer: ${err.message}`),
  });
};
