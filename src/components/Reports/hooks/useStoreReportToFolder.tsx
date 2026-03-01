import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { findOrCreateClientFolder } from '../utils/reportUtils';
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

interface StoreReportParams {
  projectId: string;
  pdfBlob: Blob;
  filename: string;
  folderId?: string | null; // If not provided, will find or create client folder
  description?: string;
}

export function useStoreReportToFolder() {
  const queryClient = useQueryClient();

  const isMissingColumnError = (error: PostgrestError | null) => {
    if (!error) return false;
    return (
      error.code === 'PGRST204' ||
      error.message?.toLowerCase().includes('schema cache') ||
      error.message?.toLowerCase().includes('could not find')
    );
  };

  const removeMissingColumnFromRecord = (record: Record<string, unknown>, error: PostgrestError | null) => {
    if (!error || !error.message) return null;

    const match = error.message.match(/'([^']+)' column/);
    if (!match) return null;

    const columnName = match[1];
    if (!(columnName in record)) return null;

    const nextRecord = { ...record };
    delete nextRecord[columnName];
    return nextRecord;
  };

  return useMutation({
    mutationFn: async ({ projectId, pdfBlob, filename, folderId, description }: StoreReportParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine folder ID - use provided or find/create client folder
      let targetFolderId = folderId;
      if (!targetFolderId) {
        targetFolderId = await findOrCreateClientFolder(projectId);
      }

      // Convert blob to File object
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${projectId}/${timestamp}_${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const documentRecord: Record<string, unknown> = {
        project_id: projectId,
        folder_id: targetFolderId || null,
        file_name: filename,
        file_type: 'other', // PDF
        mime_type: 'application/pdf',
        file_size: pdfBlob.size,
        storage_path: storagePath,
        file_url: storagePath,
        uploaded_by: user.id,
      };

      if (typeof description !== 'undefined') {
        documentRecord.description = description || null;
      }

      const insertDocument = async () => {
        let payload: Record<string, unknown> | null = { ...documentRecord };
        let lastResponse: PostgrestSingleResponse<Record<string, unknown>> | null = null;

        while (payload) {
          const response = await supabase.from('project_documents').insert(payload).select().single();
          if (!response.error) {
            return response;
          }

          lastResponse = response;
          if (!isMissingColumnError(response.error)) {
            return response;
          }

          payload = removeMissingColumnFromRecord(payload, response.error);
        }

        return (
          lastResponse || {
            data: null,
            error: {
              message: 'Missing required columns',
              code: 'PGRST204',
              details: null,
              hint: null,
            } satisfies PostgrestError,
          }
        );
      };

      const { data, error } = await insertDocument();

      if (error) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from('project-documents').remove([storagePath]);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-documents'] });
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      toast.success(`Report "${data.file_name}" stored successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to store report: ${error.message}`);
    },
  });
}
