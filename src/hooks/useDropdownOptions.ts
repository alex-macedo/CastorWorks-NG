import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type DropdownOption = Database['public']['Tables']['dropdown_options']['Row'];
export type DropdownOptionInsert = Database['public']['Tables']['dropdown_options']['Insert'];
export type DropdownOptionUpdate = Database['public']['Tables']['dropdown_options']['Update'];

export type DropdownCategory =
  | 'task_priority'
  | 'task_status'
  | 'project_type'
  | 'project_status'
  | 'construction_unit'
  | 'floor_type'
  | 'finishing_type'
  | 'roof_type'
  | 'terrain_type';

/**
 * Hook to fetch all dropdown options for a category
 */
export const useDropdownOptions = (category: DropdownCategory | string) => {
  return useQuery({
    queryKey: ['dropdown-options', category],
    queryFn: async (): Promise<DropdownOption[]> => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch dropdown options filtered by parent value (field sequence dependency)
 */
export const useDropdownOptionsByParent = (
  category: DropdownCategory | string,
  parentCategory: string | null,
  parentValue: string | null
) => {
  return useQuery({
    queryKey: ['dropdown-options', category, 'parent', parentCategory, parentValue],
    queryFn: async (): Promise<DropdownOption[]> => {
      let query = supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Apply parent filter if provided
      if (parentCategory && parentValue) {
        query = query
          .eq('parent_category', parentCategory)
          .eq('parent_value', parentValue);
      } else {
        // If no parent, show options with no parent or all if category doesn't use dependencies
        query = query.is('parent_category', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to get the default option for a category
 */
export const useDefaultDropdownOption = (category: DropdownCategory | string) => {
  return useQuery({
    queryKey: ['dropdown-options', category, 'default'],
    queryFn: async (): Promise<DropdownOption | null> => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', category)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to validate a dropdown value
 */
export const useValidateDropdownValue = () => {
  return async (category: string, value: string): Promise<boolean> => {
    const { data, error } = await supabase
      .rpc('validate_dropdown_value', { p_category: category, p_value: value });

    if (error) throw error;
    return data || false;
  };
};

/**
 * Hook to create a new dropdown option
 */
export const useCreateDropdownOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (option: DropdownOptionInsert): Promise<DropdownOption> => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create option');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', data.category] });
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', data.category, 'default'] });
    },
  });
};

/**
 * Hook to update a dropdown option
 */
export const useUpdateDropdownOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DropdownOptionUpdate }): Promise<DropdownOption> => {
      const { data, error } = await supabase
        .from('dropdown_options')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update option');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', data.category] });
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', data.category, 'default'] });
    },
  });
};

/**
 * Hook to delete a dropdown option
 */
export const useDeleteDropdownOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }): Promise<void> => {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', variables.category, 'default'] });
    },
  });
};

/**
 * Hook to reorder dropdown options
 */
export const useReorderDropdownOptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      orderedIds,
    }: {
      category: string;
      orderedIds: string[];
    }): Promise<void> => {
      // Update sort_order for each option individually
      const updatePromises = orderedIds.map((id, index) => {
        return supabase
          .from('dropdown_options')
          .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('category', category)
          .select();
      });

      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => result.error);
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} options`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', variables.category] });
    },
  });
};

/**
 * Hook to set an option as default for its category
 */
export const useSetDefaultDropdownOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }): Promise<void> => {
      // First, unset any existing default
      const { error: unsetError } = await supabase
        .from('dropdown_options')
        .update({ is_default: false })
        .eq('category', category)
        .eq('is_default', true);

      if (unsetError) throw unsetError;

      // Then set the new default
      const { error: setError } = await supabase
        .from('dropdown_options')
        .update({ is_default: true })
        .eq('id', id);

      if (setError) throw setError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['dropdown-options', variables.category, 'default'] });
    },
  });
};
