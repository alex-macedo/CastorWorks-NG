import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendReportWhatsAppParams {
  phoneNumber: string;
  message: string;
  pdfBlob: Blob;
  filename: string;
  projectId?: string;
}

/**
 * Formats phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming Brazil +55)
  if (cleaned.startsWith('55')) {
    return `+${cleaned}`;
  }
  
  // If it's a Brazilian number (starts with area code), add +55
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    return `+55${cleaned}`;
  }
  
  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume Brazil
  return `+55${cleaned}`;
}

/**
 * Hook to send report via WhatsApp
 * Uploads PDF to storage and sends WhatsApp message with download link
 */
export function useSendReportWhatsApp() {
  return useMutation({
    mutationFn: async ({ phoneNumber, message, pdfBlob, filename, projectId }: SendReportWhatsAppParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Format phone number to E.164 format
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Upload PDF to temporary storage location for WhatsApp sharing
      const timestamp = Date.now();
      const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `temp-reports/${user.id}/${timestamp}_${sanitizedFileName}`;

      // Convert blob to File
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Upload to storage
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

      // Format WhatsApp message with PDF link
      const whatsappMessage = `${message}\n\n📄 Download report: ${signedUrlData.signedUrl}\n\n(This link expires in 1 hour)`;

      // Send WhatsApp via edge function
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          phoneNumber: formattedPhone, // Edge function expects phoneNumber, not 'to'
          message: whatsappMessage,
          projectId,
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
      toast.success('Report sent via WhatsApp successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send WhatsApp: ${error.message}`);
    },
  });
}
