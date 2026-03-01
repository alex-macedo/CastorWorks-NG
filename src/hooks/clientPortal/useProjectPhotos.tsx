/**
 * useProjectPhotos Hook
 *
 * Fetches project photos for the client portal photo gallery
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';
import { resolveStorageUrl } from '@/utils/storage';

export interface ProjectPhoto {
  id: string;
  project_id: string;
  file_path: string;
  category: 'before' | 'during' | 'after' | 'issues' | 'completion' | 'other';
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useProjectPhotos() {
  const { projectId, isAuthenticated } = useClientPortalAuth();

  // Fetch photos for the project
  const {
    data: photos,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projectPhotos', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as ProjectPhoto[];
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Get signed URLs for display (memoized to prevent infinite loops)
  const getPhotoUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      return await resolveStorageUrl(filePath, 3600);
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return null;
    }
  }, []);

  return {
    photos: photos || [],
    isLoading,
    error,
    getPhotoUrl,
  };
}
