/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

export interface PipelineStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusInsert {
  name: string;
  color: string;
  position: number;
  is_terminal?: boolean;
}

export interface StatusUpdate {
  id: string;
  name?: string;
  color?: string;
  position?: number;
  is_terminal?: boolean;
}

export const useArchitectStatuses = () => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  const { data: statuses, isLoading, error } = useQuery({
    queryKey: ['architect-pipeline-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('architect_pipeline_statuses')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || []) as PipelineStatus[];
    },
  });

  const createStatus = useMutation({
    mutationFn: async (status: StatusInsert) => {
      const { data, error } = await supabase
        .from('architect_pipeline_statuses')
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['architect-pipeline-statuses'] });
      toast({
        title: t('architect.statuses.created'),
        description: t('architect.statuses.createdDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.statuses.createFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, ...updates }: StatusUpdate) => {
      const { data, error } = await supabase
        .from('architect_pipeline_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['architect-pipeline-statuses'] });
      toast({
        title: t('architect.statuses.updated'),
        description: t('architect.statuses.updatedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.statuses.updateFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_pipeline_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['architect-pipeline-statuses'] });
      toast({
        title: t('architect.statuses.deleted'),
        description: t('architect.statuses.deletedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.statuses.deleteFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const reorderStatuses = useMutation({
    mutationFn: async (statusUpdates: { id: string; position: number }[]) => {
      const updates = statusUpdates.map(({ id, position }) =>
        supabase
          .from('architect_pipeline_statuses')
          .update({ position })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error('Failed to reorder some statuses');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['architect-pipeline-statuses'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.statuses.reorderFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    statuses: statuses || [],
    isLoading,
    error,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
  };
};
