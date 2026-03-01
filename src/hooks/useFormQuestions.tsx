import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type FormQuestion = Database['public']['Tables']['form_questions']['Row'];
type FormQuestionInsert = Database['public']['Tables']['form_questions']['Insert'];
type FormQuestionUpdate = Database['public']['Tables']['form_questions']['Update'];

/**
 * useFormQuestions Hook
 * 
 * Manages questions within a form including CRUD operations,
 * reordering, and duplication.
 */
export const useFormQuestions = (formId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading, error } = useQuery({
    queryKey: ['form_questions', formId],
    queryFn: async () => {
      if (!formId) return [];

      try {
        const { data, error: queryError } = await supabase
          .from('form_questions')
          .select('*')
          .eq('form_id', formId)
          .order('position', { ascending: true });

        if (queryError) {
          logger.error('Error fetching form questions:', queryError);
          throw queryError;
        }

        logger.info('Form questions fetched successfully', { 
          formId, 
          count: data?.length || 0 
        });

        return data as FormQuestion[];
      } catch (err) {
        logger.error('Form questions query failed:', err);
        return [];
      }
    },
    enabled: !!formId,
  });

  const addQuestion = useMutation({
    mutationFn: async (questionData: Omit<FormQuestionInsert, 'form_id' | 'position'>) => {
      if (!formId) throw new Error('Form ID is required');

      // Get next position number
      const maxPosition = questions.length > 0
        ? Math.max(...questions.map(q => q.position))
        : -1;

      const { data, error } = await supabase
        .from('form_questions')
        .insert({
          ...questionData,
          form_id: formId,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding question:', error);
        throw error;
      }

      logger.info('Question added successfully', { 
        questionId: data.id, 
        formId,
        position: data.position 
      });

      return data as FormQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_questions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId] }); // Update form version
      toast({
        title: 'Question added',
        description: 'The question has been added to your form.',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to add question:', error);
      toast({
        title: 'Error',
        description: `Failed to add question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...updates }: FormQuestionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('form_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating question:', error);
        throw error;
      }

      logger.info('Question updated successfully', { questionId: id });
      return data as FormQuestion;
    },
    onSuccess: (updatedQuestion) => {
      // Optimistic update
      queryClient.setQueryData(
        ['form_questions', formId], 
        (oldData: FormQuestion[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((q) =>
            q.id === updatedQuestion.id ? updatedQuestion : q
          );
        }
      );

      queryClient.invalidateQueries({ queryKey: ['form_questions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId] });
      toast({
        title: 'Question updated',
        description: 'The question has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to update question:', error);
      toast({
        title: 'Error',
        description: `Failed to update question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_questions')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting question:', error);
        throw error;
      }

      logger.info('Question deleted successfully', { questionId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_questions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId] });
      toast({
        title: 'Question deleted',
        description: 'The question has been removed from your form.',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to delete question:', error);
      toast({
        title: 'Error',
        description: `Failed to delete question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (reorderedQuestions: { id: string; position: number }[]) => {
      if (!formId) throw new Error('Form ID is required');

      // Batch update positions
      const updates = reorderedQuestions.map(({ id, position }) =>
        supabase
          .from('form_questions')
          .update({ position })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        logger.error('Error reordering questions:', errors[0].error);
        throw errors[0].error;
      }

      logger.info('Questions reordered successfully', { 
        formId,
        count: reorderedQuestions.length 
      });
    },
    onMutate: async (reorderedQuestions) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['form_questions', formId] });

      // Snapshot previous value
      const previousQuestions = queryClient.getQueryData<FormQuestion[]>([
        'form_questions',
        formId,
      ]);

      // Optimistically update
      queryClient.setQueryData<FormQuestion[]>(
        ['form_questions', formId],
        (old) => {
          if (!old) return old;
          const positionMap = new Map(
            reorderedQuestions.map(q => [q.id, q.position])
          );
          return [...old]
            .map(q => ({
              ...q,
              position: positionMap.get(q.id) ?? q.position,
            }))
            .sort((a, b) => a.position - b.position);
        }
      );

      return { previousQuestions };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        queryClient.setQueryData(
          ['form_questions', formId],
          context.previousQuestions
        );
      }
      logger.error('Failed to reorder questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder questions. Please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_questions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId] });
    },
  });

  const duplicateQuestion = useMutation({
    mutationFn: async (id: string) => {
      if (!formId) throw new Error('Form ID is required');

      // Fetch original question
      const { data: originalQuestion, error: fetchError } = await supabase
        .from('form_questions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Get next position
      const maxPosition = questions.length > 0
        ? Math.max(...questions.map(q => q.position))
        : -1;

      // Create duplicate
      const { data: duplicatedQuestion, error: createError } = await supabase
        .from('form_questions')
        .insert({
          ...originalQuestion,
          id: undefined, // Let database generate new ID
          title: `${originalQuestion.title} (Copy)`,
          position: maxPosition + 1,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (createError) throw createError;

      logger.info('Question duplicated successfully', { 
        originalId: id,
        duplicateId: duplicatedQuestion.id 
      });

      return duplicatedQuestion as FormQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_questions', formId] });
      queryClient.invalidateQueries({ queryKey: ['forms', formId] });
      toast({
        title: 'Question duplicated',
        description: 'The question has been duplicated successfully.',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to duplicate question:', error);
      toast({
        title: 'Error',
        description: `Failed to duplicate question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    questions,
    isLoading,
    error,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    duplicateQuestion,
  };
};
