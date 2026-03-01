import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Section types for proposal generation
export type ProposalSectionType =
  | 'cover_letter'
  | 'scope_of_work'
  | 'exclusions'
  | 'payment_terms'
  | 'timeline'
  | 'warranty'
  | 'terms_and_conditions'
  // Architect-specific sections
  | 'design_philosophy'
  | 'project_methodology'
  | 'fee_structure'
  | 'sustainability_approach';

// Tone options for proposal generation
export type ProposalTone = 'professional' | 'friendly' | 'detailed' | 'concise';

// Request parameters for proposal generation
export interface ProposalGenerationRequest {
  estimateId?: string;
  briefingId?: string;
  projectId?: string;
  sections: ProposalSectionType[];
  tone?: ProposalTone;
  language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
  companyInfo?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

// Response from proposal generation
export interface ProposalGenerationResponse {
  success: boolean;
  sections: Record<string, string>;
  error?: string;
}

// Hook for generating proposal content
export const useGenerateProposal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<ProposalGenerationResponse, Error, ProposalGenerationRequest>({
    mutationFn: async (params) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      // Filter out undefined, null, empty strings, and "undefined" strings
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => {
          if (value === undefined || value === null) return false;
          if (typeof value === 'string' && (value === '' || value === 'undefined')) return false;
          return true;
        })
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-proposal-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filteredParams),
        }
      );

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => null);
        const errorMessage = (
          errorData &&
          typeof errorData === 'object' &&
          (
            (errorData as { error?: string }).error ||
            (errorData as { description?: string }).description ||
            (errorData as { message?: string }).message
          )
        ) || undefined;

        throw new Error(errorMessage || `Failed to generate proposal: ${response.status}`);
      }

      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from proposal generator');
      }

      return data as ProposalGenerationResponse;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'Proposal content generated successfully' });
      } else {
        toast({
          title: 'Error generating proposal',
          description: data.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (err) => {
      toast({
        title: 'Error generating proposal',
        description: err?.message || 'Failed to generate proposal content',
        variant: 'destructive',
      });
    },
  });
};

// Hook for fetching architect briefings
export const useArchitectBriefings = (projectId?: string) => {
  return useQuery({
    queryKey: ['architectBriefings', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('architect_briefings')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch briefings: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for fetching a single briefing
export const useArchitectBriefing = (briefingId?: string) => {
  return useQuery({
    queryKey: ['architectBriefing', briefingId],
    queryFn: async () => {
      if (!briefingId) {
        throw new Error('Briefing ID is required');
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('architect_briefings')
        .select('*')
        .eq('id', briefingId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch briefing: ${error.message}`);
      }

      return data;
    },
    enabled: !!briefingId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for saving proposal draft
export const useSaveProposalDraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      projectId?: string;
      briefingId?: string;
      estimateId?: string;
      title: string;
      content: Record<string, string>;
      sections: ProposalSectionType[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('proposal_drafts')
        .insert({
          user_id: user.id,
          project_id: params.projectId,
          briefing_id: params.briefingId,
          estimate_id: params.estimateId,
          title: params.title,
          content: params.content,
          sections: params.sections,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save proposal draft: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: 'Proposal draft saved' });
      queryClient.invalidateQueries({ queryKey: ['proposalDrafts'] });
    },
    onError: (err) => {
      toast({
        title: 'Error saving draft',
        description: err?.message || 'Failed to save proposal draft',
        variant: 'destructive',
      });
    },
  });
};

// Hook for fetching proposal drafts
export const useProposalDrafts = (projectId?: string) => {
  return useQuery({
    queryKey: ['proposalDrafts', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('proposal_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch proposal drafts: ${error.message}`);
      }

      return data || [];
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for deleting proposal draft
export const useDeleteProposalDraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('proposal_drafts')
        .delete()
        .eq('id', draftId);

      if (error) {
        throw new Error(`Failed to delete draft: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast({ title: 'Proposal draft deleted' });
      queryClient.invalidateQueries({ queryKey: ['proposalDrafts'] });
    },
    onError: (err) => {
      toast({
        title: 'Error deleting draft',
        description: err?.message || 'Failed to delete proposal draft',
        variant: 'destructive',
      });
    },
  });
};

// Utility function to get section label
export const getSectionLabel = (section: ProposalSectionType, t: (key: string) => string): string => {
  const labels: Record<ProposalSectionType, string> = {
    cover_letter: t('architect.proposals.sections.coverLetter'),
    scope_of_work: t('architect.proposals.sections.scopeOfWork'),
    exclusions: t('architect.proposals.sections.exclusions'),
    payment_terms: t('architect.proposals.sections.paymentTerms'),
    timeline: t('architect.proposals.sections.timeline'),
    warranty: t('architect.proposals.sections.warranty'),
    terms_and_conditions: t('architect.proposals.sections.termsAndConditions'),
    design_philosophy: t('architect.proposals.sections.designPhilosophy'),
    project_methodology: t('architect.proposals.sections.projectMethodology'),
    fee_structure: t('architect.proposals.sections.feeStructure'),
    sustainability_approach: t('architect.proposals.sections.sustainabilityApproach'),
  };

  return labels[section] || section;
};

// Utility function to get tone label
export const getToneLabel = (tone: ProposalTone, t: (key: string) => string): string => {
  const labels: Record<ProposalTone, string> = {
    professional: t('architect.proposals.tones.professional'),
    friendly: t('architect.proposals.tones.friendly'),
    detailed: t('architect.proposals.tones.detailed'),
    concise: t('architect.proposals.tones.concise'),
  };

  return labels[tone] || tone;
};
