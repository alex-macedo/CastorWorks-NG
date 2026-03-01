import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface UploadAvatarParams {
  userId: string;
  file: File;
}

/**
 * Hook to upload user avatar to Supabase Storage
 * Compresses image before upload and updates user_profiles.avatar_url
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: UploadAvatarParams): Promise<string> => {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      }

      // Validate file size (before compression)
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeBytes) {
        throw new Error('File size must be less than 5MB.');
      }

      // Compress image before upload
      const compressionOptions = {
        maxSizeMB: 2, // Max 2MB after compression
        maxWidthOrHeight: 512, // Max 512px for avatars (square, maintain aspect ratio)
        useWebWorker: true,
        fileType: file.type,
      };

      let compressedFile: File;
      try {
        compressedFile = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.error('Image compression failed:', error);
        throw new Error('Failed to compress image. Please try again.');
      }

      // Generate storage path: user-avatars/{user_id}/avatar.{ext}
      const fileExt = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const storagePath = `${userId}/avatar.${fileExt}`;

      // Get current avatar URL to delete old one if exists
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(storagePath, compressedFile, {
          cacheControl: '3600',
          upsert: true, // Replace existing avatar
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload avatar: ${uploadError.message}`);
      }

      // Delete old avatar if it exists and is different
      if (currentProfile?.avatar_url && currentProfile.avatar_url !== storagePath) {
        // Only delete if it's in the user-avatars bucket
        if (currentProfile.avatar_url.startsWith('user-avatars/') || 
            currentProfile.avatar_url.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\./i)) {
          const oldPath = currentProfile.avatar_url.startsWith('user-avatars/') 
            ? currentProfile.avatar_url.substring('user-avatars/'.length)
            : currentProfile.avatar_url;
          
          // Try to delete old avatar (ignore errors if it doesn't exist)
          await supabase.storage
            .from('user-avatars')
            .remove([oldPath])
            .catch(() => {
              // Ignore errors - old file might not exist
            });
        }
      }

      // Update user_profiles.avatar_url with storage path
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: storagePath })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      return storagePath;
    },
    onSuccess: (storagePath, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-profiles", variables.userId] });
      
      toast.success("Avatar uploaded successfully");
    },
    onError: (error: Error) => {
      console.error('Avatar upload failed:', error);
      toast.error(error.message || "Failed to upload avatar");
    },
  });
}

/**
 * Hook to remove user avatar
 */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      // Get current avatar URL
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();

      if (!currentProfile?.avatar_url) {
        return; // No avatar to remove
      }

      // Delete from storage if it's in user-avatars bucket
      if (currentProfile.avatar_url.startsWith('user-avatars/') || 
          currentProfile.avatar_url.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\./i)) {
        const storagePath = currentProfile.avatar_url.startsWith('user-avatars/') 
          ? currentProfile.avatar_url.substring('user-avatars/'.length)
          : currentProfile.avatar_url;
        
        await supabase.storage
          .from('user-avatars')
          .remove([storagePath])
          .catch((error) => {
            console.warn('Failed to delete avatar from storage:', error);
            // Continue even if storage deletion fails
          });
      }

      // Update user_profiles.avatar_url to null
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to remove avatar: ${updateError.message}`);
      }
    },
    onSuccess: (_, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-profiles", userId] });
      
      toast.success("Avatar removed successfully");
    },
    onError: (error: Error) => {
      console.error('Avatar removal failed:', error);
      toast.error(error.message || "Failed to remove avatar");
    },
  });
}
