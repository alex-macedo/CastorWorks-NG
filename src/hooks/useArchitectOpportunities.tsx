/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

export interface ArchitectOpportunity {
  id: string;
  client_id: string;
  project_name: string;
  estimated_value: number | null;
  probability: number | null;
  stage: string;
  stage_id: string;
  expected_closing_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_name: string | null;
  };
}

export interface OpportunityInsert {
  client_id: string;
  project_name: string;
  estimated_value?: number | null;
  probability?: number | null;
  stage_id: string;
  expected_closing_date?: string | null;
  notes?: string | null;
}

export interface OpportunityUpdate {
  id: string;
  client_id?: string;
  project_name?: string;
  estimated_value?: number | null;
  probability?: number | null;
  stage_id?: string;
  expected_closing_date?: string | null;
  notes?: string | null;
}

export const useArchitectOpportunities = () => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading, error } = useQuery({
    queryKey: ['architect-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('architect_opportunities')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ArchitectOpportunity[];
    },
    retry: false,
  });

  const saveOpportunity = useMutation({
    mutationFn: async (opportunity: OpportunityInsert | OpportunityUpdate) => {
      const now = new Date().toISOString();

      if ('id' in opportunity) {
        const { id, ...updates } = opportunity;
        
        // Build update payload, ensuring expected_closing_date is ALWAYS included if present
        const updatePayload: Record<string, any> = {};
        
        // Copy all fields from updates EXCEPT expected_closing_date (we'll handle it explicitly)
        Object.keys(updates).forEach(key => {
          if (key !== 'expected_closing_date') {
            updatePayload[key] = updates[key];
          }
        });
        
        // Explicitly handle date field - ensure it's properly formatted and ALWAYS included
        if ('expected_closing_date' in updates) {
          const dateValue = updates.expected_closing_date;
          // Convert empty string, undefined, or null to null for DATE column
          if (dateValue === '' || dateValue === undefined || dateValue === null) {
            updatePayload.expected_closing_date = null;
          } else {
            // Ensure it's a valid date string (yyyy-MM-dd format)
            const dateStr = String(dateValue).trim();
            updatePayload.expected_closing_date = dateStr || null;
          }
        } else {
          // If date field is not in updates, explicitly set to null to clear it
          // (Only do this if we want to allow clearing dates - comment out if not desired)
          // updatePayload.expected_closing_date = null;
        }
        
        // Perform the update
        const { error: updateError } = await supabase
          .from('architect_opportunities')
          .update(updatePayload)
          .eq('id', id);

        if (updateError) {
          console.error('[useArchitectOpportunities] Update error:', updateError);
          throw updateError;
        }

        // Small delay to ensure database has processed the update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then, fetch the updated record with relationships
        const { data, error } = await supabase
          .from('architect_opportunities')
          .select(`
            *,
            clients (
              id,
              name,
              email,
              phone,
              company_name
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('[useArchitectOpportunities] Fetch error after update:', error);
          throw error;
        }
        if (!data) {
          console.error('[useArchitectOpportunities] No data returned after update');
          throw new Error('Failed to retrieve updated opportunity');
        }
        
        return data;
      }

      // For inserts, first insert the record
      const { data: insertedData, error: insertError } = await supabase
        .from('architect_opportunities')
        .insert(opportunity)
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!insertedData) throw new Error('Failed to create opportunity');

      // Then fetch the full record with relationships
      const { data, error } = await supabase
        .from('architect_opportunities')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            company_name
          )
        `)
        .eq('id', insertedData.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to retrieve created opportunity');
      return data;
    },
    onSuccess: (data, variables) => {
      const isUpdate = 'id' in variables;
      
      queryClient.setQueryData(['architect-opportunities'], (oldData: ArchitectOpportunity[] = []) => {
        if (isUpdate) {
          const updated = oldData.map((opp) => (opp.id === data.id ? { ...opp, ...data } : opp));
          return updated;
        }
        return [data as ArchitectOpportunity, ...oldData];
      });

      toast({
        title: isUpdate ? t('architect.opportunities.updated') : t('architect.opportunities.created'),
        description: isUpdate
          ? t('architect.opportunities.updatedDescription')
          : t('architect.opportunities.createdDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.opportunities.saveFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData(['architect-opportunities'], (oldData: ArchitectOpportunity[] = []) =>
        oldData.filter((opp) => opp.id !== id)
      );
      toast({
        title: t('architect.opportunities.deleted'),
        description: t('architect.opportunities.deletedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.opportunities.deleteFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateOpportunityStage = useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const { data, error } = await supabase
        .from('architect_opportunities')
        .update({ stage_id })
        .eq('id', id)
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            company_name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['architect-opportunities'] });
      toast({
        title: t('architect.opportunities.stageUpdated'),
        description: t('architect.opportunities.stageUpdatedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: `${t('architect.opportunities.stageUpdateFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    opportunities: (opportunities || []) as ArchitectOpportunity[],
    isLoading,
    error,
    saveOpportunity,
    deleteOpportunity,
    updateOpportunityStage,
  };
};
