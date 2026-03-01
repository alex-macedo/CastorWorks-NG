import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

type ArchitectClientPortalToken = Database['public']['Tables']['architect_client_portal_tokens']['Row'];
type ArchitectClientPortalTokenInsert = Database['public']['Tables']['architect_client_portal_tokens']['Insert'];

const portalKeys = {
  all: ['architect-portal'] as const,
  tokens: () => [...portalKeys.all, 'tokens'] as const,
  tokenList: (projectId?: string) => [...portalKeys.tokens(), { projectId }] as const,
  data: () => [...portalKeys.all, 'data'] as const,
  dataByToken: (token: string) => [...portalKeys.data(), { token }] as const,
};

export const useArchitectClientPortal = (projectId?: string) => {
  const queryClient = useQueryClient();

  // Portal tokens query
  const { data: portalTokens = [], isLoading, error } = useQuery({
    queryKey: portalKeys.tokenList(projectId),
    queryFn: async () => {
      let query = supabase
        .from('architect_client_portal_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ArchitectClientPortalToken[];
    },
    enabled: !!projectId,
  });

  const portalToken = portalTokens[0]?.token || null;

  const generatePortalToken = useMutation({
    mutationFn: async (data: { projectId: string; expiresAt?: string }) => {
      // Generate a secure random token
      const token = crypto.randomUUID();

      const tokenData: ArchitectClientPortalTokenInsert = {
        project_id: data.projectId,
        token,
        expires_at: data.expiresAt || null,
      };

      const { data: result, error } = await supabase
        .from('architect_client_portal_tokens')
        .insert(tokenData)
        .select()
        .single();

      if (error) throw error;
      return result as ArchitectClientPortalToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.tokens() });
    },
  });

  const deletePortalToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('architect_client_portal_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.tokens() });
    },
  });

  const getPortalDataByToken = async (token: string) => {
    // First validate the token and get project info
    const { data: tokenData, error: tokenError } = await supabase
      .from('architect_client_portal_tokens')
      .select('project_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError) throw new Error('Invalid or expired token');
    if (!tokenData) throw new Error('Token not found');

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Token has expired');
    }

    const projectId = tokenData.project_id;

    // If projectId is not a valid UUID, use mock data
    if (!isValidUUID(projectId)) {
      throw new Error('Invalid project ID');
    }

    try {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Get documents for the project
      const { data: documents, error: docsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Get diary entries for the project
      const { data: diaryEntries, error: diaryError } = await supabase
        .from('architect_site_diary')
        .select('*')
        .eq('project_id', projectId)
        .order('diary_date', { ascending: false });

      if (diaryError) throw diaryError;

      return {
        project,
        documents: documents || [],
        diaryEntries: diaryEntries || [],
      };
    } catch (err) {
      console.warn('Portal data unavailable, returning empty data', err);
      return {
        project: null,
        documents: [],
        diaryEntries: [],
      };
    }
  };

  return {
    portalToken,
    portalTokens,
    isLoading,
    error,
    generatePortalToken,
    deletePortalToken,
    getPortalDataByToken,
  };
};
