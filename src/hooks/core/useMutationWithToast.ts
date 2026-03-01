import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface UseMutationWithToastOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onSuccess' | 'onError'> {
  /**
   * Success message to show in toast
   */
  successMessage?: string;

  /**
   * Function to generate custom success message
   */
  successMessageFn?: (data: TData) => string;

  /**
   * Error message to show in toast
   */
  errorMessage?: string;

  /**
   * Function to generate custom error message
   */
  errorMessageFn?: (error: TError) => string;

  /**
   * Query keys to invalidate after successful mutation
   */
  invalidateQueries?: (string | (string | unknown[])[] | { queryKey: (string | unknown[])[] })[];

  /**
   * Callback fired on successful mutation
   */
  onMutationSuccess?: (data: TData) => void | Promise<void>;

  /**
   * Callback fired on mutation error
   */
  onMutationError?: (error: TError) => void;

  /**
   * Whether to log the mutation (default: true in dev)
   */
  shouldLog?: boolean;
}

/**
 * Wrapper around useMutation that automatically:
 * - Shows success/error toasts
 * - Invalidates relevant queries
 * - Logs mutations in development
 * - Provides type-safe error handling
 *
 * @example
 * const mutation = useMutationWithToast({
 *   mutationFn: async (data) => api.updateProject(data),
 *   successMessage: 'Project updated successfully',
 *   invalidateQueries: [['projects']],
 *   onMutationSuccess: (data) => console.log('Updated:', data),
 * });
 */
export function useMutationWithToast<TData, TError, TVariables>(
  options: UseMutationWithToastOptions<TData, TError, TVariables>
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    successMessage,
    successMessageFn,
    errorMessage = 'Something went wrong',
    errorMessageFn,
    invalidateQueries,
    onMutationSuccess,
    onMutationError,
    shouldLog = import.meta.env.DEV,
    ...mutationOptions
  } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      // Log in development
      if (shouldLog) {
        logger.debug('Mutation successful', { data, variables });
      }

      // Invalidate queries
      if (invalidateQueries && invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map((queryKey) =>
            queryClient.invalidateQueries({
              queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
            } as any)
          )
        );
      }

      // Show success toast
      const message = successMessageFn ? successMessageFn(data) : successMessage;
      if (message) {
        toast({
          title: 'Success',
          description: message,
          variant: 'default',
        });
      }

      // Call user callback
      if (onMutationSuccess) {
        await onMutationSuccess(data);
      }

      // Call original onSuccess
      if (mutationOptions.onSuccess) {
        await mutationOptions.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Log error
      if (shouldLog) {
        logger.error('Mutation failed', { error, variables });
      }

      // Show error toast
      const message = errorMessageFn
        ? errorMessageFn(error)
        : error instanceof Error
          ? error.message
          : errorMessage;

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });

      // Call user callback
      if (onMutationError) {
        onMutationError(error);
      }

      // Call original onError
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables, context);
      }
    },
  });
}
