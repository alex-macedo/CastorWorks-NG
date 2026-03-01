import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

 type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
 type FinancialEntryInsert = Database['public']['Tables']['project_financial_entries']['Insert'];

 export const useFinancialEntries = (projectId?: string) => {
   const { toast } = useToast();
   const queryClient = useQueryClient();


  const { data: financialEntries, isLoading } = useQuery({
    queryKey: ['financial_entries', projectId],
    queryFn: async () => {
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('project_financial_entries')
        .select('*, projects(name)')
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as (FinancialEntry & { projects: { name: string } | null })[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (entry: FinancialEntryInsert) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('project_financial_entries')
        .insert({
          ...entry,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_entries'] });
      toast({
        title: 'Entry created',
        description: 'The financial entry has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create entry: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FinancialEntryInsert>) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('project_financial_entries')
        .update({
          ...updates,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_entries'] });
      toast({
        title: 'Entry updated',
        description: 'The financial entry has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update entry: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_entries'] });
      toast({
        title: 'Entry deleted',
        description: 'The financial entry has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete entry: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    financialEntries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};
