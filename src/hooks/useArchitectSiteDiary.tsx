import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import resolveStorageUrl from '@/utils/storage';
import type { Database } from '@/integrations/supabase/types';

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

type ArchitectSiteDiary = Database['public']['Tables']['architect_site_diary']['Row'];
type ArchitectSiteDiaryInsert = Database['public']['Tables']['architect_site_diary']['Insert'];
type ArchitectSiteDiaryUpdate = Database['public']['Tables']['architect_site_diary']['Update'];

const siteDiaryKeys = {
  all: ['architect-site-diary'] as const,
  lists: () => [...siteDiaryKeys.all, 'list'] as const,
  list: (projectId?: string) => [...siteDiaryKeys.lists(), { projectId }] as const,
  details: () => [...siteDiaryKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteDiaryKeys.details(), id] as const,
};

export const useArchitectSiteDiary = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: diaryEntries = [], isLoading, error } = useQuery({
    queryKey: siteDiaryKeys.list(projectId),
    queryFn: async () => {
      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('architect_site_diary')
        .select('*')
        .order('diary_date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ArchitectSiteDiary[];
    },
  });

  const createDiaryEntry = useMutation({
    mutationFn: async (entry: ArchitectSiteDiaryInsert) => {
      const { data, error } = await supabase
        .from('architect_site_diary')
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectSiteDiary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteDiaryKeys.all });
    },
  });

  const updateDiaryEntry = useMutation({
    mutationFn: async ({ id, ...updates }: ArchitectSiteDiaryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('architect_site_diary')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectSiteDiary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteDiaryKeys.all });
    },
  });

  const deleteDiaryEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_site_diary')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteDiaryKeys.all });
    },
  });

  const addPhotos = useMutation({
    mutationFn: async ({ id, photos }: { id: string; photos: any[] }) => {
      // Get current entry to merge photos
      const { data: currentEntry } = await supabase
        .from('architect_site_diary')
        .select('photos')
        .eq('id', id)
        .single();

      const existingPhotos = (currentEntry?.photos as any[]) || [];
      // Normalize incoming photos: convert storage paths to signed URLs when possible
      const processed: any[] = [];

      for (const p of photos) {
        try {
          if (!p) continue;

          // If it's already a full URL string
          if (typeof p === 'string') {
            if (p.startsWith('http')) {
              processed.push({ url: p });
            } else {
              // treat as storage path
              const signed = await resolveStorageUrl(p, 60 * 60);
              if (signed) processed.push({ url: signed, file_path: p });
            }
            continue;
          }

          // If object with explicit url
          if (p.url && typeof p.url === 'string') {
            processed.push(p);
            continue;
          }

          // If object references storage path fields
          const path = p.file_path || p.storagePath || p.path;
          if (path && typeof path === 'string') {
            const signed = await resolveStorageUrl(path, 60 * 60);
            if (signed) {
              // quick HEAD check to ensure accessibility
              try {
                const resp = await fetch(signed, { method: 'HEAD' });
                if (resp.ok) {
                  processed.push({ url: signed, file_path: path });
                  continue;
                } else {
                  console.warn('Photo signed URL not accessible (HEAD failed)', { path, status: resp.status });
                }
              } catch (fetchErr) {
                console.warn('Error validating signed URL', { path, error: fetchErr });
                // still push signed URL as fallback
                processed.push({ url: signed, file_path: path });
                continue;
              }
            } else {
              console.warn('Failed to resolve storage URL for photo', { path });
            }
          }

          // If none matched, push raw object as-is so UI can handle it
          processed.push(p);
        } catch (err) {
          console.warn('Error processing photo for signed URL', err);
        }
      }

      const updatedPhotos = [...existingPhotos, ...processed];

      const { data, error } = await supabase
        .from('architect_site_diary')
        .update({ photos: updatedPhotos })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectSiteDiary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteDiaryKeys.all });
    },
  });

  const generateFromPhotos = useMutation({
    mutationFn: async (params: {
      photoUrls: string[];
      projectId: string;
      language: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
    }) => {
      const { data, error } = await supabase.functions.invoke("analyze-site-photos", {
        body: params,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diaries'] });
    },
  });

  return {
    diaryEntries,
    isLoading,
    error,
    createDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
    addPhotos,
    generateFromPhotos: generateFromPhotos.mutateAsync,
    isGenerating: generateFromPhotos.isPending,
  };
};