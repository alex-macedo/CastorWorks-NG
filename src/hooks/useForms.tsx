import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Form = Database['public']['Tables']['forms']['Row'];
type FormInsert = Database['public']['Tables']['forms']['Insert'];
type FormUpdate = Database['public']['Tables']['forms']['Update'];

export interface FormFilters {
  projectId?: string;
  status?: 'draft' | 'published' | 'closed' | 'archived';
  searchQuery?: string;
}

/**
 * useForms Hook
 * 
 * Provides CRUD operations and queries for forms with filtering support.
 * Follows CastorWorks patterns with TanStack Query and toast notifications.
 */
export const useForms = (filters?: FormFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading, error } = useQuery({
    queryKey: ['forms', filters],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          logger.warn('No user session found for forms query');
          return [];
        }

        let query = supabase
          .from('forms')
          .select(`
            *,
            project:projects(id, name),
            creator:user_profiles!forms_created_by_fkey(user_id, display_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.projectId) {
          query = query.eq('project_id', filters.projectId);
        }

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.searchQuery) {
          query = query.ilike('title', `%${filters.searchQuery}%`);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          logger.error('Error fetching forms:', queryError);
          throw queryError;
        }

        logger.info('Forms fetched successfully', { 
          count: data?.length || 0,
          userId: user.id,
          filters
        });

        return data as Form[];
      } catch (err) {
        logger.error('Forms query failed:', err);
        return [];
      }
    },
  });

  const createForm = useMutation({
    mutationFn: async (formData: FormInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found');

      const { data, error } = await supabase
        .from('forms')
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating form:', error);
        throw error;
      }

      logger.info('Form created successfully', { formId: data.id, title: data.title });
      return data as Form;
    },
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form created',
        description: `"${newForm.title}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to create form:', error);
      toast({
        title: 'Error',
        description: `Failed to create form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: FormUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating form:', error);
        throw error;
      }

      logger.info('Form updated successfully', { formId: id });
      return data as Form;
    },
    onSuccess: (updatedForm) => {
      // Optimistic update
      queryClient.setQueryData(['forms', filters], (oldData: Form[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((form) =>
          form.id === updatedForm.id ? updatedForm : form
        );
      });

      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form updated',
        description: `"${updatedForm.title}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to update form:', error);
      toast({
        title: 'Error',
        description: `Failed to update form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting form:', error);
        throw error;
      }

      logger.info('Form deleted successfully', { formId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form deleted',
        description: 'The form has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to delete form:', error);
      toast({
        title: 'Error',
        description: `Failed to delete form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const duplicateForm = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found');

      // Fetch original form
      const { data: originalForm, error: fetchError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with new share_token
      const { data: duplicatedForm, error: createError } = await supabase
        .from('forms')
        .insert({
          ...originalForm,
          id: undefined, // Let database generate new ID
          title: `${originalForm.title} (Copy)`,
          status: 'draft',
          created_by: user.id,
          created_at: undefined,
          updated_at: undefined,
          published_at: null,
          version: 1,
          share_token: undefined, // Let database generate new token
        })
        .select()
        .single();

      if (createError) throw createError;

      // Fetch and duplicate questions
      const { data: questions, error: questionsError } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', id)
        .order('position', { ascending: true });

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const duplicatedQuestions = questions.map((q) => ({
          ...q,
          id: undefined,
          form_id: duplicatedForm.id,
          created_at: undefined,
          updated_at: undefined,
        }));

        const { error: questionsInsertError } = await supabase
          .from('form_questions')
          .insert(duplicatedQuestions);

        if (questionsInsertError) throw questionsInsertError;
      }

      logger.info('Form duplicated successfully', { 
        originalId: id, 
        duplicateId: duplicatedForm.id 
      });

      return duplicatedForm as Form;
    },
    onSuccess: (duplicatedForm) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form duplicated',
        description: `"${duplicatedForm.title}" has been created.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to duplicate form:', error);
      toast({
        title: 'Error',
        description: `Failed to duplicate form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const publishForm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('forms')
        .update({ 
          status: 'published',
          // published_at will be auto-set by trigger
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info('Form published successfully', { formId: id });
      return data as Form;
    },
    onSuccess: (publishedForm) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form published',
        description: `"${publishedForm.title}" is now accepting responses.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to publish form:', error);
      toast({
        title: 'Error',
        description: `Failed to publish form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const unpublishForm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('forms')
        .update({ status: 'closed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info('Form unpublished successfully', { formId: id });
      return data as Form;
    },
    onSuccess: (unpublishedForm) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Form closed',
        description: `"${unpublishedForm.title}" is no longer accepting responses.`,
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to close form:', error);
      toast({
        title: 'Error',
        description: `Failed to close form: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    forms,
    isLoading,
    error,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
    publishForm,
    unpublishForm,
  };
};

/**
 * useForm Hook
 * 
 * Fetches a single form by ID with related data.
 */
export const useForm = (id: string | undefined) => {
  const { toast } = useToast();

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['forms', id],
    queryFn: async () => {
      if (!id) return null;

      try {
        const { data, error: queryError } = await supabase
          .from('forms')
          .select(`
            *,
            project:projects(id, name),
            creator:user_profiles!forms_created_by_fkey(user_id, display_name, avatar_url),
            questions:form_questions(count)
          `)
          .eq('id', id)
          .maybeSingle();

        if (queryError) {
          logger.error('Error fetching form:', queryError);
          throw queryError;
        }

        if (!data) {
          logger.warn('Form not found', { formId: id });
          return null;
        }

        logger.info('Form fetched successfully', { formId: id });
        return data as Form;
      } catch (err) {
        logger.error('Form query failed:', err);
        toast({
          title: 'Error',
          description: 'Failed to load form',
          variant: 'destructive',
        });
        return null;
      }
    },
    enabled: !!id,
  });

  return { form, isLoading, error };
};
