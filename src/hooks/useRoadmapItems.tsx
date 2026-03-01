import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type RoadmapItem = Database['public']['Tables']['roadmap_items']['Row'];
type RoadmapItemInsert = Database['public']['Tables']['roadmap_items']['Insert'];
type RoadmapItemUpdate = Database['public']['Tables']['roadmap_items']['Update'];

export const useRoadmapItems = (filters?: {
  status?: string;
  category?: string;
  search?: string;
}) => {
  const queryClient = useQueryClient();

  const { data: roadmapItems, isLoading } = useQuery({
    queryKey: ['roadmap_items', filters],
    queryFn: async () => {
      let query = supabase
        .from('roadmap_items')
        .select(`
          *,
          roadmap_item_upvotes(user_id),
          sprints!left(id, status)
        `)
        .order('position', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching roadmap items:', error);
        throw error;
      }
      
      // Ensure we always return an array, even if data is null/undefined
      if (!data || !Array.isArray(data)) {
        return [] as RoadmapItem[];
      }
      
      // Filter out items that belong to closed sprints
      const filteredData = data.filter((item: any) => {
        // If item has no sprint, show it
        if (!item.sprint_id) return true;
        
        // If item has a sprint, only show if sprint is open (or sprint data is missing)
        if (item.sprints && item.sprints.status === 'closed') {
          return false;
        }
        
        return true;
      });
      
      // Ensure upvotes_count is available - it should be in the data from the database
      // but we'll also calculate it from roadmap_item_upvotes if needed
      const items = filteredData.map((item: any) => ({
        ...item,
        upvotes_count: item.upvotes_count ?? (item.roadmap_item_upvotes?.length || 0),
      }));
      
      return items as RoadmapItem[];
    },
  });

  return {
    roadmapItems,
    isLoading,
  };
};

export const useCreateRoadmapItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: RoadmapItemInsert) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('roadmap_items')
        .insert({
          ...item,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      toast({
        title: 'Success',
        description: 'Roadmap item created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create roadmap item',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateRoadmapItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RoadmapItemUpdate & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // If status is being set to 'done', set completed_at
      if (updates.status === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'done') {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('roadmap_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      queryClient.invalidateQueries({ queryKey: ['sprint_items'] });
      toast({
        title: 'Success',
        description: 'Roadmap item updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update roadmap item',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteRoadmapItem = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      toast({
        title: 'Success',
        description: 'Roadmap item deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete roadmap item',
        variant: 'destructive',
      });
    },
  });
};

export const useToggleUpvote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isUpvoted }: { itemId: string; isUpvoted: boolean }) => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw new Error('Not authenticated');

      if (isUpvoted) {
        const { error } = await supabase
          .from('roadmap_item_upvotes')
          .delete()
          .eq('roadmap_item_id', itemId)
          .eq('user_id', data.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roadmap_item_upvotes')
          .insert({
            roadmap_item_id: itemId,
            user_id: data.user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
    },
  });
};

// Comments functionality
export const useRoadmapItemComments = (itemId: string) => {
  const { data: comments, isLoading } = useQuery({
    queryKey: ['roadmap_item_comments', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_item_comments')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('roadmap_item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  return { comments, isLoading };
};

export const useCreateComment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw new Error('Not authenticated');

      const { data: commentData, error } = await supabase
        .from('roadmap_item_comments')
        .insert({
          roadmap_item_id: itemId,
          user_id: data.user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return commentData;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_item_comments', itemId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      });
    },
  });
};

