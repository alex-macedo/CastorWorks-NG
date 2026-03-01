import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type FormResponse = Database['public']['Tables']['form_responses']['Row'];
type FormResponseInsert = Database['public']['Tables']['form_responses']['Insert'];
type FormResponseAnswer = Database['public']['Tables']['form_response_answers']['Row'];
type FormResponseAnswerInsert = Database['public']['Tables']['form_response_answers']['Insert'];

export interface ResponseFilters {
  status?: 'in_progress' | 'completed' | 'abandoned';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface QuestionAnswer {
  questionId: string;
  answerText?: string;
  answerOptions?: string[];
  answerNumber?: number;
  answerDate?: string;
  answerTime?: string;
  answerFileUrls?: string[];
  answerMatrix?: Record<string, any>;
}

/**
 * useFormResponses Hook
 * 
 * Manages form responses and answers with support for pagination,
 * partial saves, and response completion.
 */
export const useFormResponses = (formId: string | undefined, filters?: ResponseFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: responses = [], isLoading, error } = useQuery({
    queryKey: ['form_responses', formId, filters],
    queryFn: async () => {
      if (!formId) return [];

      try {
        let query = supabase
          .from('form_responses')
          .select(`
            *,
            respondent:user_profiles(user_id, display_name, avatar_url),
            answers:form_response_answers(count)
          `)
          .eq('form_id', formId)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }

        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        if (filters?.offset) {
          query = query.range(
            filters.offset,
            filters.offset + (filters.limit || 50) - 1
          );
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          logger.error('Error fetching form responses:', queryError);
          throw queryError;
        }

        logger.info('Form responses fetched successfully', { 
          formId,
          count: data?.length || 0,
          filters 
        });

        return data as FormResponse[];
      } catch (err) {
        logger.error('Form responses query failed:', err);
        return [];
      }
    },
    enabled: !!formId,
  });

  const startResponse = useMutation({
    mutationFn: async (data: { respondentEmail?: string }) => {
      if (!formId) throw new Error('Form ID is required');

      const { data: { user } } = await supabase.auth.getUser();

      const { data: response, error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          respondent_id: user?.id || null,
          respondent_email: data.respondentEmail || user?.email || null,
          status: 'in_progress',
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error starting response:', error);
        throw error;
      }

      logger.info('Response started successfully', { 
        responseId: response.id,
        formId 
      });

      return response as FormResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_responses', formId] });
    },
    onError: (error: Error) => {
      logger.error('Failed to start response:', error);
      toast({
        title: 'Error',
        description: `Failed to start response: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const saveAnswer = useMutation({
    mutationFn: async ({
      responseId,
      answers,
    }: {
      responseId: string;
      answers: QuestionAnswer[];
    }) => {
      const answersToUpsert: FormResponseAnswerInsert[] = answers.map((answer) => ({
        response_id: responseId,
        question_id: answer.questionId,
        answer_text: answer.answerText || null,
        answer_options: answer.answerOptions || [],
        answer_number: answer.answerNumber || null,
        answer_date: answer.answerDate || null,
        answer_time: answer.answerTime || null,
        answer_file_urls: answer.answerFileUrls || [],
        answer_matrix: answer.answerMatrix || null,
      }));

      // Upsert answers (insert or update based on unique constraint)
      const { error } = await supabase
        .from('form_response_answers')
        .upsert(answersToUpsert, {
          onConflict: 'response_id,question_id',
        });

      if (error) {
        logger.error('Error saving answers:', error);
        throw error;
      }

      logger.info('Answers saved successfully', { 
        responseId,
        count: answers.length 
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to save answers:', error);
      toast({
        title: 'Error',
        description: `Failed to save answers: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const completeResponse = useMutation({
    mutationFn: async ({
      responseId,
      answers,
    }: {
      responseId: string;
      answers: QuestionAnswer[];
    }) => {
      // First save all answers
      await saveAnswer.mutateAsync({ responseId, answers });

      // Then mark response as completed
      const { data, error } = await supabase
        .from('form_responses')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', responseId)
        .select()
        .single();

      if (error) {
        logger.error('Error completing response:', error);
        throw error;
      }

      logger.info('Response completed successfully', { responseId });
      return data as FormResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form_responses', formId] });
      queryClient.invalidateQueries({ queryKey: ['form_analytics', formId] });
      toast({
        title: 'Response submitted',
        description: 'Thank you for your response!',
      });
    },
    onError: (error: Error) => {
      logger.error('Failed to complete response:', error);
      toast({
        title: 'Error',
        description: `Failed to submit response: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const exportResponses = async (
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> => {
    if (!formId) throw new Error('Form ID is required');

    try {
      // Fetch all responses with answers
      const { data: allResponses, error: responsesError } = await supabase
        .from('form_responses')
        .select(`
          *,
          respondent:user_profiles(display_name, avatar_url),
          answers:form_response_answers(
            *,
            question:form_questions(title, type)
          )
        `)
        .eq('form_id', formId)
        .eq('status', 'completed');

      if (responsesError) throw responsesError;

      logger.info('Exporting responses', { 
        formId,
        count: allResponses?.length || 0,
        format 
      });

      // TODO: Implement actual export logic based on format
      // For now, return JSON as blob
      const jsonData = JSON.stringify(allResponses, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      return blob;
    } catch (error) {
      logger.error('Failed to export responses:', error);
      throw error;
    }
  };

  return {
    responses,
    isLoading,
    error,
    startResponse,
    saveAnswer,
    completeResponse,
    exportResponses,
  };
};

/**
 * useFormResponse Hook
 * 
 * Fetches a single response with all its answers.
 */
export const useFormResponse = (responseId: string | undefined) => {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['form_responses', responseId],
    queryFn: async () => {
      if (!responseId) return null;

      try {
        const { data, error: queryError } = await supabase
          .from('form_responses')
          .select(`
            *,
            respondent:user_profiles(user_id, display_name, avatar_url),
            answers:form_response_answers(
              *,
              question:form_questions(*)
            )
          `)
          .eq('id', responseId)
          .maybeSingle();

        if (queryError) {
          logger.error('Error fetching response:', queryError);
          throw queryError;
        }

        if (!data) {
          logger.warn('Response not found', { responseId });
          return null;
        }

        logger.info('Response fetched successfully', { responseId });
        return data as FormResponse;
      } catch (err) {
        logger.error('Response query failed:', err);
        return null;
      }
    },
    enabled: !!responseId,
  });

  return { response, isLoading, error };
};
