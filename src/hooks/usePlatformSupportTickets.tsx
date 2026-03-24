import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  SupportTicket,
  SupportTicketWithMessages,
  SupportTicketFormData,
} from '@/types/platform.types';

const LIST_KEY = ['platform-support-tickets'] as const;
const detailKey = (id: string) => ['platform-support-ticket', id] as const;

export const usePlatformSupportTickets = () => {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SupportTicket[];
    },
  });
};

export const usePlatformSupportTicket = (id: string | null) => {
  return useQuery({
    queryKey: detailKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_support_tickets')
        .select('*, platform_support_messages(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as SupportTicketWithMessages;
    },
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SupportTicketFormData) => {
      const { initialMessage, ...ticketData } = payload;

      // Insert ticket first
      const { data: ticket, error: ticketErr } = await supabase
        .from('platform_support_tickets')
        .insert([ticketData])
        .select()
        .single();
      if (ticketErr) throw ticketErr;

      // Insert initial message
      const { error: msgErr } = await supabase
        .from('platform_support_messages')
        .insert([{ ticket_id: (ticket as SupportTicket).id, body: initialMessage }]);
      if (msgErr) throw msgErr;

      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success('Ticket created');
    },
    onError: (err: Error) => toast.error(`Failed to create ticket: ${err.message}`),
  });
};

export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<SupportTicket, 'status' | 'priority'>> }) => {
      const { data, error } = await supabase
        .from('platform_support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
      toast.success('Ticket updated');
    },
    onError: (err: Error) => toast.error(`Failed to update ticket: ${err.message}`),
  });
};

export const useAddSupportMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const { error } = await supabase
        .from('platform_support_messages')
        .insert([{ ticket_id: ticketId, body }]);
      if (error) throw error;
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: detailKey(ticketId) });
      toast.success('Reply sent');
    },
    onError: (err: Error) => toast.error(`Failed to send reply: ${err.message}`),
  });
};

export const useCloseSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_support_tickets')
        .update({ status: 'closed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
      toast.success('Ticket closed');
    },
    onError: (err: Error) => toast.error(`Failed to close ticket: ${err.message}`),
  });
};
