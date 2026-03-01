import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendReportEmailParams {
  recipientEmail: string;
  subject: string;
  message: string;
  pdfBlob: Blob;
  filename: string;
  projectId?: string;
}

/**
 * Hook to send report via email
 * Uploads PDF to storage and sends email with download link
 */
export function useSendReportEmail() {
  return useMutation({
    mutationFn: async ({ recipientEmail, subject, message, pdfBlob, filename, projectId }: SendReportEmailParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload PDF to temporary storage location for email sharing
      const timestamp = Date.now();
      const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `temp-reports/${user.id}/${timestamp}_${sanitizedFileName}`;

      // Convert blob to File
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Upload to storage (use a temporary bucket or project-documents)
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Generate signed URL (1 hour expiry)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(storagePath, 3600);

      if (urlError || !signedUrlData) {
        // Cleanup uploaded file
        await supabase.storage.from('project-documents').remove([storagePath]);
        throw new Error('Failed to generate download link');
      }

      // Format email body with PDF link
      const emailBody = `
${message}

<br><br>
<a href="${signedUrlData.signedUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Download Report</a>

<br><br>
<small>This link will expire in 1 hour.</small>
      `.trim();

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          recipientEmail,
          subject,
          body: emailBody,
          projectId,
          notificationType: 'report_share',
        },
      });

      if (error) {
        // Cleanup uploaded file on error
        await supabase.storage.from('project-documents').remove([storagePath]);
        throw error;
      }

      return { success: true, storagePath, signedUrl: signedUrlData.signedUrl };
    },
    onSuccess: () => {
      toast.success('Report sent via email successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });
}
