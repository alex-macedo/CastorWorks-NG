import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import type { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export const useClients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        return [] as Client[];
      }

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Clients unavailable, returning empty array', err);
        return [] as Client[];
      }
    },
    enabled: !!tenantId,
  });

  const createClient = useMutation({
    mutationFn: async (client: ClientInsert) => {
      if (!tenantId) {
        throw new Error('No active tenant selected');
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...client,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast({
        title: 'Client created',
        description: 'The client has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast({
        title: 'Client updated',
        description: 'The client has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
      toast({
        title: 'Client deleted',
        description: 'The client has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete client: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const checkClientCanDelete = async (id: string): Promise<{ canDelete: boolean; reason?: string }> => {
    try {
      // Check for associated opportunities
      const { data: opportunities, error: oppError } = await supabase
        .from('architect_opportunities')
        .select('id')
        .eq('client_id', id)
        .limit(1);

      if (oppError) throw oppError;
      
      if (opportunities && opportunities.length > 0) {
        return { canDelete: false, reason: 'Client has associated opportunities' };
      }

      // Check for associated projects
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', id)
        .limit(1);

      if (projError) throw projError;
      
      if (projects && projects.length > 0) {
        return { canDelete: false, reason: 'Client has associated projects' };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking client associations:', error);
      return { canDelete: false, reason: 'Failed to check client associations' };
    }
  };

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    checkClientCanDelete,
  };
};
