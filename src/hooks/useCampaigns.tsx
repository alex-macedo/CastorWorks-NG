/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  OutboundCampaign,
  CampaignRecipient,
  CampaignLog,
  CreateCampaignRequest,
  ExecuteCampaignRequest,
  CampaignWithRecipients,
  ContactSelection,
  ContactType,
} from '@/types/campaign.types';

// ============================================================================
// CAMPAIGNS HOOK
// ============================================================================

export const useCampaigns = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all campaigns for current user
  const { data: campaigns, isLoading, error } = useQuery<OutboundCampaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outbound_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OutboundCampaign[];
    },
  });

  // Fetch single campaign with recipients
  const useCampaign = (campaignId: string | undefined) => {
    return useQuery<CampaignWithRecipients>({
      queryKey: ['campaign', campaignId],
      queryFn: async () => {
        if (!campaignId) throw new Error('Campaign ID is required');

        const { data: campaign, error: campaignError } = await supabase
          .from('outbound_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError) throw campaignError;

        const { data: recipients, error: recipientsError } = await supabase
          .from('campaign_recipients')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (recipientsError) throw recipientsError;

        return {
          ...campaign,
          recipients: recipients as CampaignRecipient[],
        } as CampaignWithRecipients;
      },
      enabled: !!campaignId,
    });
  };

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (request: CreateCampaignRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('outbound_campaigns')
        .insert({
          user_id: user.id,
          name: request.name,
          description: request.description,
          audience_type: request.audience_type,
          audience_filter: request.audience_filter || {},
          message_template: request.message_template,
          include_voice_for_vip: request.include_voice_for_vip,
          company_name: request.company_name,
          scheduled_at: request.scheduled_at,
          status: request.scheduled_at ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add recipients based on audience type
      if (request.audience_type === 'manual' && request.selected_contact_ids) {
        const recipientsToCreate = await buildRecipientsFromIds(
          request.selected_contact_ids
        );

        if (recipientsToCreate.length > 0) {
          const { error: recipientsError } = await supabase
            .from('campaign_recipients')
            .insert(
              recipientsToCreate.map(r => ({
                campaign_id: campaign.id,
                ...r,
              }))
            );

          if (recipientsError) throw recipientsError;
        }
      } else if (request.audience_type === 'all' || request.audience_type === 'filtered') {
        const recipientsToCreate = await buildRecipientsFromFilter(
          request.audience_filter
        );

        if (recipientsToCreate.length > 0) {
          const { error: recipientsError } = await supabase
            .from('campaign_recipients')
            .insert(
              recipientsToCreate.map(r => ({
                campaign_id: campaign.id,
                ...r,
              }))
            );

          if (recipientsError) throw recipientsError;
        }
      }

      // Update total recipients count
      const { data: recipientCount } = await supabase
        .from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);

      await supabase
        .from('outbound_campaigns')
        .update({ total_recipients: recipientCount?.count || 0 })
        .eq('id', campaign.id);

      return campaign as OutboundCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign created',
        description: 'The campaign has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create campaign: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update campaign
  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutboundCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('outbound_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OutboundCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign updated',
        description: 'The campaign has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update campaign: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('outbound_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign deleted',
        description: 'The campaign has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete campaign: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Execute campaign (send messages)
  const executeCampaign = useMutation({
    mutationFn: async (request: ExecuteCampaignRequest) => {
      const { data, error } = await supabase.functions.invoke('execute-campaign', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign executed',
        description: 'The campaign is now being sent to recipients.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to execute campaign: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Cancel scheduled campaign
  const cancelCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('outbound_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign cancelled',
        description: 'The campaign has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to cancel campaign: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    useCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    executeCampaign,
    cancelCampaign,
  };
};

// ============================================================================
// CAMPAIGN RECIPIENTS HOOK
// ============================================================================

export const useCampaignRecipients = (campaignId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipients, isLoading, error } = useQuery<CampaignRecipient[]>({
    queryKey: ['campaign-recipients', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampaignRecipient[];
    },
    enabled: !!campaignId,
  });

  return {
    recipients,
    isLoading,
    error,
  };
};

// ============================================================================
// CAMPAIGN LOGS HOOK
// ============================================================================

export const useCampaignLogs = (campaignId: string | undefined) => {
  const { data: logs, isLoading, error } = useQuery<CampaignLog[]>({
    queryKey: ['campaign-logs', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaign_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CampaignLog[];
    },
    enabled: !!campaignId,
  });

  return {
    logs,
    isLoading,
    error,
  };
};

// ============================================================================
// CONTACTS FOR CAMPAIGNS HOOK
// ============================================================================

export const useContactsForCampaigns = () => {
  const { data: contacts, isLoading, error } = useQuery<ContactSelection[]>({
    queryKey: ['contacts-for-campaigns'],
    queryFn: async () => {
      const allContacts: ContactSelection[] = [];

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, phone, email, is_vip, tags')
        .not('phone', 'is', null);

      if (clientsError) throw clientsError;

      if (clients) {
        allContacts.push(
          ...clients.map(c => ({
            id: c.id,
            type: 'client' as ContactType,
            name: c.name,
            phone: c.phone!,
            email: c.email || undefined,
            isVip: c.is_vip || false,
            tags: c.tags || undefined,
          }))
        );
      }

      // Fetch suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, contact_phone, contact_email, is_vip')
        .not('contact_phone', 'is', null);

      if (suppliersError) throw suppliersError;

      if (suppliers) {
        allContacts.push(
          ...suppliers.map(s => ({
            id: s.id,
            type: 'supplier' as ContactType,
            name: s.name,
            phone: s.contact_phone!,
            email: s.contact_email || undefined,
            isVip: s.is_vip || false,
          }))
        );
      }

      // Fetch contractors
      const { data: contractors, error: contractorsError } = await supabase
        .from('contractors')
        .select('id, name, phone, email, is_vip')
        .not('phone', 'is', null);

      if (contractorsError) throw contractorsError;

      if (contractors) {
        allContacts.push(
          ...contractors.map(c => ({
            id: c.id,
            type: 'contractor' as ContactType,
            name: c.name,
            phone: c.phone!,
            email: c.email || undefined,
            isVip: c.is_vip || false,
          }))
        );
      }

      return allContacts;
    },
  });

  return {
    contacts,
    isLoading,
    error,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function buildRecipientsFromIds(contactIds: string[]) {
  const recipients: any[] = [];

  // Get all contacts
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, email, is_vip')
    .in('id', contactIds)
    .not('phone', 'is', null);

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, contact_phone, contact_email, is_vip')
    .in('id', contactIds)
    .not('contact_phone', 'is', null);

  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, name, phone, email, is_vip')
    .in('id', contactIds)
    .not('phone', 'is', null);

  if (clients) {
    recipients.push(
      ...clients.map(c => ({
        contact_type: 'client',
        contact_id: c.id,
        contact_name: c.name,
        contact_phone: c.phone,
        contact_email: c.email,
        is_vip: c.is_vip || false,
        status: 'pending',
        personalization_context: {},
      }))
    );
  }

  if (suppliers) {
    recipients.push(
      ...suppliers.map(s => ({
        contact_type: 'supplier',
        contact_id: s.id,
        contact_name: s.name,
        contact_phone: s.contact_phone,
        contact_email: s.contact_email,
        is_vip: s.is_vip || false,
        status: 'pending',
        personalization_context: {},
      }))
    );
  }

  if (contractors) {
    recipients.push(
      ...contractors.map(c => ({
        contact_type: 'contractor',
        contact_id: c.id,
        contact_name: c.name,
        contact_phone: c.phone,
        contact_email: c.email,
        is_vip: c.is_vip || false,
        status: 'pending',
        personalization_context: {},
      }))
    );
  }

  return recipients;
}

async function buildRecipientsFromFilter(filter: any = {}) {
  const recipients: any[] = [];
  const { contactTypes, tags, vipOnly, excludeIds } = filter;

  // Build query for each contact type
  const shouldInclude = (type: string) =>
    !contactTypes || contactTypes.length === 0 || contactTypes.includes(type);

  if (shouldInclude('client')) {
    let query = supabase
      .from('clients')
      .select('id, name, phone, email, is_vip, tags')
      .not('phone', 'is', null);

    if (vipOnly) query = query.eq('is_vip', true);
    if (tags && tags.length > 0) query = query.contains('tags', tags);
    if (excludeIds && excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    const { data: clients } = await query;

    if (clients) {
      recipients.push(
        ...clients.map(c => ({
          contact_type: 'client',
          contact_id: c.id,
          contact_name: c.name,
          contact_phone: c.phone,
          contact_email: c.email,
          is_vip: c.is_vip || false,
          status: 'pending',
          personalization_context: {},
        }))
      );
    }
  }

  if (shouldInclude('supplier')) {
    let query = supabase
      .from('suppliers')
      .select('id, name, contact_phone, contact_email, is_vip')
      .not('contact_phone', 'is', null);

    if (vipOnly) query = query.eq('is_vip', true);
    if (excludeIds && excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    const { data: suppliers } = await query;

    if (suppliers) {
      recipients.push(
        ...suppliers.map(s => ({
          contact_type: 'supplier',
          contact_id: s.id,
          contact_name: s.name,
          contact_phone: s.contact_phone,
          contact_email: s.contact_email,
          is_vip: s.is_vip || false,
          status: 'pending',
          personalization_context: {},
        }))
      );
    }
  }

  if (shouldInclude('contractor')) {
    let query = supabase
      .from('contractors')
      .select('id, name, phone, email, is_vip')
      .not('phone', 'is', null);

    if (vipOnly) query = query.eq('is_vip', true);
    if (excludeIds && excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    const { data: contractors } = await query;

    if (contractors) {
      recipients.push(
        ...contractors.map(c => ({
          contact_type: 'contractor',
          contact_id: c.id,
          contact_name: c.name,
          contact_phone: c.phone,
          contact_email: c.email,
          is_vip: c.is_vip || false,
          status: 'pending',
          personalization_context: {},
        }))
      );
    }
  }

  return recipients;
}