import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BUCKET = 'roadmap-attachments'
const SIGNED_URL_EXPIRY_SEC = 60 * 60 * 24 * 7 // 7 days

interface AttachmentUpload {
  roadmapItemId: string;
  file: File;
}

export interface Attachment {
  id: string;
  roadmap_item_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  roadmap_item_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string; // storage path when stored in DB
  created_at: string;
}

export const useRoadmapItemAttachments = (itemId: string) => {
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['roadmap_item_attachments', itemId],
    queryFn: async () => {
      const response = await supabase
        .from('roadmap_item_attachments')
        .select('*')
        .eq('roadmap_item_id', itemId)
        .order('created_at', { ascending: false });

      if (response.error) throw response.error
      const rows = (response.data || []) as AttachmentRow[]

      // Generate signed URLs for each attachment (file_url in DB is storage path)
      const withUrls: Attachment[] = await Promise.all(
        rows.map(async (row) => {
          const { data: urlData, error: urlError } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(row.file_url, SIGNED_URL_EXPIRY_SEC)
          return {
            ...row,
            file_url: urlError ? '' : (urlData?.signedUrl ?? ''),
          }
        })
      )
      return withUrls
    },
    enabled: !!itemId,
  });

  return { attachments: attachments || [], isLoading };
};

export const useUploadAttachment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('roadmap');

  return useMutation({
    mutationFn: async ({ roadmapItemId, file }: AttachmentUpload) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop() || 'bin';
      const storagePath = `${roadmapItemId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const isVideoByMime = file.type.startsWith('video/')
      const isVideoByExt = /\.(mp4|webm|mov|avi|mkv|m4v|ogg|ogv)(\?|$)/i.test(file.name)
      const fileType = file.type.startsWith('image/')
        ? 'image'
        : isVideoByMime || isVideoByExt
          ? 'video'
          : 'document'

      const row = {
        id: crypto.randomUUID(),
        roadmap_item_id: roadmapItemId,
        user_id: userData.user.id,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        file_url: storagePath, // store path only; signed URL generated when fetching
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('roadmap_item_attachments')
        .insert(row)
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted as unknown as Attachment;
    },
    onSuccess: (_, { roadmapItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_item_attachments', roadmapItemId] });
      toast({
        title: t('uploadSuccessTitle'),
        description: t('uploadSuccessDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('uploadErrorTitle'),
        description: error.message || t('uploadErrorDescription'),
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteAttachment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('roadmap');

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data: row, error: fetchError } = await supabase
        .from('roadmap_item_attachments')
        .select('id, file_url')
        .eq('id', attachmentId)
        .single();

      if (fetchError || !row) throw new Error('Attachment not found');

      const storagePath = (row as { file_url: string }).file_url;
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }

      const { error: deleteError } = await supabase
        .from('roadmap_item_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;
      return { id: attachmentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_item_attachments'] });
      toast({
        title: t('deleteSuccessTitle'),
        description: t('deleteSuccessDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('deleteErrorTitle'),
        description: error.message || t('deleteErrorDescription'),
        variant: 'destructive',
      });
    },
  });
};

interface RegisterVideoAttachmentInput {
  roadmapItemId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  signedUrl: string; // 7-day TTL
}

export const useRegisterVideoAttachment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('roadmap');

  return useMutation({
    mutationFn: async ({ roadmapItemId, storagePath, fileName, fileSize, signedUrl }: RegisterVideoAttachmentInput) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Not authenticated');

      const row = {
        id: crypto.randomUUID(),
        roadmap_item_id: roadmapItemId,
        user_id: userData.user.id,
        file_name: fileName,
        file_type: 'video',
        file_size: fileSize,
        file_url: storagePath, // store path only
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('roadmap_item_attachments')
        .insert(row)
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Return attachment with pre-generated signed URL
      return {
        ...inserted,
        file_url: signedUrl,
      } as unknown as Attachment;
    },
    onSuccess: (_, { roadmapItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_item_attachments', roadmapItemId] });
      toast({
        title: t('uploadSuccessTitle'),
        description: t('uploadSuccessDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('uploadErrorTitle'),
        description: error.message || t('uploadErrorDescription'),
        variant: 'destructive',
      });
    },
  });
};