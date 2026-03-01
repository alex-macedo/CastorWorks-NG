import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import imageCompression from 'browser-image-compression';

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

type ArchitectMoodboardSection = Database['public']['Tables']['architect_moodboard_sections']['Row'];
type ArchitectMoodboardImage = Database['public']['Tables']['architect_moodboard_images']['Row'];
type ArchitectMoodboardColor = Database['public']['Tables']['architect_moodboard_colors']['Row'];

type ArchitectMoodboardSectionInsert = Database['public']['Tables']['architect_moodboard_sections']['Insert'];
type ArchitectMoodboardImageInsert = Database['public']['Tables']['architect_moodboard_images']['Insert'];
type ArchitectMoodboardColorInsert = Database['public']['Tables']['architect_moodboard_colors']['Insert'];

interface UploadImageParams {
  section_id: string;
  project_id: string;
  file: File;
  description?: string;
}

const moodboardKeys = {
  all: ['architect-moodboard'] as const,
  sections: () => [...moodboardKeys.all, 'sections'] as const,
  sectionList: (projectId?: string) => [...moodboardKeys.sections(), { projectId }] as const,
  images: () => [...moodboardKeys.all, 'images'] as const,
  imageList: (projectId?: string) => [...moodboardKeys.images(), { projectId }] as const,
  colors: () => [...moodboardKeys.all, 'colors'] as const,
  colorList: (projectId?: string) => [...moodboardKeys.colors(), { projectId }] as const,
};

export const useArchitectMoodboard = (projectId?: string) => {
  const queryClient = useQueryClient();

  // Sections query
  const { data: sections = [], isLoading: sectionsLoading, error: sectionsError } = useQuery({
    queryKey: moodboardKeys.sectionList(projectId),
    queryFn: async () => {
      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('architect_moodboard_sections')
        .select('*')
        .order('sort_order', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ArchitectMoodboardSection[];
    },
  });

  // Images query
  const { data: images = [], isLoading: imagesLoading, error: imagesError } = useQuery({
    queryKey: moodboardKeys.imageList(projectId),
    queryFn: async () => {
      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('architect_moodboard_images')
        .select('*')
        .order('sort_order', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ArchitectMoodboardImage[];
    },
  });

  // Colors query
  const { data: colors = [], isLoading: colorsLoading, error: colorsError } = useQuery({
    queryKey: moodboardKeys.colorList(projectId),
    queryFn: async () => {
      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('architect_moodboard_colors')
        .select('*')
        .order('sort_order', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ArchitectMoodboardColor[];
    },
  });

  const isLoading = sectionsLoading || imagesLoading || colorsLoading;
  const error = sectionsError || imagesError || colorsError;

  // Section mutations
  const createSection = useMutation({
    mutationFn: async (section: ArchitectMoodboardSectionInsert) => {
      // Validate project_id is a valid UUID
      if (section.project_id && !isValidUUID(section.project_id)) {
        throw new Error('Invalid project ID. Project ID must be a valid UUID.');
      }

      // Database insert
      const { data, error } = await supabase
        .from('architect_moodboard_sections')
        .insert(section)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Failed to create section: ${error.message}`);
      }
      return data as ArchitectMoodboardSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.sections() });
    },
    onError: (error: Error) => {
      console.error('Section creation failed:', error);
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ArchitectMoodboardSection> & { id: string }) => {
      const { data, error } = await supabase
        .from('architect_moodboard_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectMoodboardSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.sections() });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      // Validate ID is a valid UUID
      if (!isValidUUID(id)) {
        throw new Error('Invalid section ID. Section ID must be a valid UUID.');
      }

      // Database delete
      const { error } = await supabase
        .from('architect_moodboard_sections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database delete error:', error);
        throw new Error(`Failed to delete section: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.all });
    },
    onError: (error: Error) => {
      console.error('Section deletion failed:', error);
    },
  });

  // Image mutations
  const uploadImage = useMutation({
    mutationFn: async (params: UploadImageParams) => {
      const { section_id, project_id, file, description } = params;

      // Validate IDs are valid UUIDs
      if (project_id && !isValidUUID(project_id)) {
        throw new Error('Invalid project ID. Project ID must be a valid UUID.');
      }
      if (section_id && !isValidUUID(section_id)) {
        throw new Error('Invalid section ID. Section ID must be a valid UUID.');
      }

      // Upload for valid UUIDs
      // 1. Compress image before upload
      const compressionOptions = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, compressionOptions);

      // 2. Generate unique filename
      const fileExt = compressedFile.name.split('.').pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const storagePath = `${project_id}/${timestamp}-${randomStr}.${fileExt}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('architect-moodboards')
        .upload(storagePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // 4. Get public URL (bucket is public)
      const { data: { publicUrl } } = supabase.storage
        .from('architect-moodboards')
        .getPublicUrl(storagePath);

      // 5. Insert database record
      const { data, error } = await supabase
        .from('architect_moodboard_images')
        .insert({
          section_id,
          project_id,
          image_url: publicUrl,
          storage_path: storagePath,
          description: description || file.name,
        })
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Failed to save image record: ${error.message}`);
      }
      return data as ArchitectMoodboardImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.images() });
    },
    onError: (error: Error) => {
      console.error('Image upload failed:', error);
      // Error will be handled by the component's toast notification
    },
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ArchitectMoodboardImage> & { id: string }) => {
      const { data, error } = await supabase
        .from('architect_moodboard_images')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectMoodboardImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.images() });
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (image: ArchitectMoodboardImage) => {
      // Validate ID is a valid UUID
      if (!isValidUUID(image.id)) {
        throw new Error('Invalid image ID. Image ID must be a valid UUID.');
      }

      // Deletion for valid UUIDs
      // 1. Delete from storage (if storage_path exists)
      if (image.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('architect-moodboards')
          .remove([image.storage_path]);
        
        if (storageError) {
          console.error('Failed to delete file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // 2. Delete from database
      const { error } = await supabase
        .from('architect_moodboard_images')
        .delete()
        .eq('id', image.id);

      if (error) {
        console.error('Database delete error:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.images() });
    },
    onError: (error: Error) => {
      console.error('Image deletion failed:', error);
    },
  });

  // Color mutations
  const addColor = useMutation({
    mutationFn: async (color: ArchitectMoodboardColorInsert) => {
      // Validate project_id is a valid UUID
      if (color.project_id && !isValidUUID(color.project_id)) {
        throw new Error('Invalid project ID. Project ID must be a valid UUID.');
      }

      // Database insert
      const { data, error } = await supabase
        .from('architect_moodboard_colors')
        .insert(color)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Failed to add color: ${error.message}`);
      }
      return data as ArchitectMoodboardColor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.colors() });
    },
    onError: (error: Error) => {
      console.error('Color addition failed:', error);
    },
  });

  const updateColor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ArchitectMoodboardColor> & { id: string }) => {
      const { data, error } = await supabase
        .from('architect_moodboard_colors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ArchitectMoodboardColor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.colors() });
    },
  });

  const deleteColor = useMutation({
    mutationFn: async (id: string) => {
      // Validate ID is a valid UUID
      if (!isValidUUID(id)) {
        throw new Error('Invalid color ID. Color ID must be a valid UUID.');
      }

      // Database delete
      const { error } = await supabase
        .from('architect_moodboard_colors')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database delete error:', error);
        throw new Error(`Failed to delete color: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moodboardKeys.colors() });
    },
    onError: (error: Error) => {
      console.error('Color deletion failed:', error);
    },
  });

  return {
    sections,
    images,
    colors,
    isLoading,
    error,
    createSection,
    updateSection,
    deleteSection,
    uploadImage,
    updateImage,
    deleteImage,
    addColor,
    updateColor,
    deleteColor,
  };
};