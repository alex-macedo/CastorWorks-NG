/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Story 4.7: Delivery Confirmation Hook
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * React Query hook for processing delivery confirmations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeliveryItem {
  item_description: string;
  ordered_quantity: number;
  received_quantity: number;
  damaged_quantity?: number;
  notes?: string;
}

interface PhotoData {
  photo_url: string;
  photo_storage_path: string;
  caption?: string;
  file_size_bytes?: number;
  mime_type?: string;
  width?: number;
  height?: number;
}

interface DeliveryConfirmationInput {
  purchase_order_id: string;
  confirmed_by_user_id: string;
  delivery_date: string; // ISO date string
  delivery_items: DeliveryItem[];
  photos: PhotoData[];
  signature_data_url: string;
  checklist?: Record<string, boolean | string>;
  has_issues?: boolean;
  issues_description?: string;
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

interface DeliveryConfirmationResponse {
  success: boolean;
  message: string;
  delivery_confirmation_id: string;
  delivery_status: 'full' | 'partial' | 'rejected';
  purchase_order_id: string;
  photos_count: number;
  summary: {
    total_ordered: number;
    total_received: number;
    total_damaged: number;
    delivery_percentage: number;
  };
}

/**
 * Hook to submit a delivery confirmation
 */
export function useSubmitDeliveryConfirmation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeliveryConfirmationInput): Promise<DeliveryConfirmationResponse> => {
      const { data, error } = await supabase.functions.invoke('process-delivery-confirmation', {
        body: input
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to process delivery confirmation');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['delivery-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchase_order_id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

      // Show success toast
      toast({
        title: 'Delivery Confirmed',
        description: `${data.delivery_status === 'full' ? 'Full delivery' : data.delivery_status === 'partial' ? 'Partial delivery' : 'Delivery rejected'} confirmed successfully. ${data.summary.delivery_percentage}% received.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch delivery confirmations for a project
 */
export function useDeliveryConfirmations(projectId?: string) {
  return useQuery({
    queryKey: ['delivery-confirmations', projectId],
    queryFn: async () => {
      let query = supabase
        .from('delivery_confirmations')
        .select(`
          *,
          delivery_photos (*),
          purchase_orders (
            id,
            purchase_order_number,
            suppliers (name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: true, // Query works with or without projectId (filters conditionally)
  });
}

/**
 * Hook to fetch a single delivery confirmation
 */
export function useDeliveryConfirmation(deliveryConfirmationId?: string) {
  return useQuery({
    queryKey: ['delivery-confirmation', deliveryConfirmationId],
    queryFn: async () => {
      if (!deliveryConfirmationId) return null;

      const { data, error } = await supabase
        .from('delivery_confirmations')
        .select(`
          *,
          delivery_photos (*),
          purchase_orders (
            id,
            purchase_order_number,
            total_amount,
            currency_id,
            suppliers (name, email, phone)
          ),
          projects (name, address)
        `)
        .eq('id', deliveryConfirmationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!deliveryConfirmationId,
  });
}

/**
 * Hook to fetch delivery confirmations for a purchase order
 */
export function useDeliveryConfirmationByPO(purchaseOrderId?: string) {
  return useQuery({
    queryKey: ['delivery-confirmation-po', purchaseOrderId],
    queryFn: async () => {
      if (!purchaseOrderId) return null;

      const { data, error } = await supabase
        .from('delivery_confirmations')
        .select(`
          *,
          delivery_photos (*)
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!purchaseOrderId,
  });
}

/**
 * Hook to upload delivery photos to Supabase Storage
 */
export function useUploadDeliveryPhotos() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ files, purchaseOrderId }: { files: File[]; purchaseOrderId: string }): Promise<PhotoData[]> => {
      const uploadedPhotos: PhotoData[] = [];
      console.log('📸 [useUploadDeliveryPhotos] Preparing to upload', files.length, 'files for PO:', purchaseOrderId);

      for (const file of files) {
        try {
          // Compress image if needed (max 2MB, max 1920px width)
          console.log('📸 [useUploadDeliveryPhotos] Compressing:', file.name);
          const compressedFile = await compressImage(file, 2 * 1024 * 1024, 1920);

          // Generate unique filename
          const fileExt = file.name.split('.').pop() || 'jpg';
          const storagePath = `${purchaseOrderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          console.log('📸 [useUploadDeliveryPhotos] Uploading to:', {
            bucket: 'delivery-photos',
            path: storagePath,
          });

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('delivery-photos')
            .upload(storagePath, compressedFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('❌ [useUploadDeliveryPhotos] Storage upload error:', uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('delivery-photos')
            .getPublicUrl(storagePath);

          uploadedPhotos.push({
            photo_url: publicUrl,
            photo_storage_path: storagePath,
            file_size_bytes: compressedFile.size,
            mime_type: compressedFile.type,
          });
        } catch (err: any) {
          console.error('❌ [useUploadDeliveryPhotos] Error processing file:', file.name, err);
          throw err;
        }
      }

      return uploadedPhotos;
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Helper function to compress images
 */
async function compressImage(file: File, maxSizeBytes: number, maxWidth: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original if canvas fails
        return;
      }

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // Fallback to original
            return;
          }

          // If still too large, reduce quality
          if (blob.size > maxSizeBytes) {
            canvas.toBlob(
              (compressedBlob) => {
                if (!compressedBlob) {
                  resolve(new File([blob], file.name, { type: file.type }));
                  return;
                }
                resolve(new File([compressedBlob], file.name, { type: 'image/jpeg' }));
              },
              'image/jpeg',
              0.7
            );
          } else {
            resolve(new File([blob], file.name, { type: file.type }));
          }
        },
        file.type,
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(file); // Fallback to original on load error
    };
    img.src = blobUrl;
  });
}