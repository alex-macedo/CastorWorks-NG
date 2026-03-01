import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Check, Eye, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useProposalGenerator } from '@/hooks/useProposalGenerator';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

interface Template {
  id: string;
  name: string;
  description: string;
}

interface ProposalSections {
  cover_letter: string;
  scope_of_work: string;
  exclusions: string;
  payment_terms: string;
  timeline: string;
  warranty: string;
  terms_and_conditions: string;
}

const ProposalBuilder = () => {
  useRouteTranslations();
  const { t } = useLocalization();
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { generateSection, isGenerating } = useProposalGenerator();

  // Build templates array dynamically using translations
  const templates: Template[] = [
    {
      id: 'standard',
      name: t('proposals.templates.standard.name'),
      description: t('proposals.templates.standard.description'),
    },
    {
      id: 'modern',
      name: t('proposals.templates.modern.name'),
      description: t('proposals.templates.modern.description'),
    },
    {
      id: 'detailed',
      name: t('proposals.templates.detailed.name'),
      description: t('proposals.templates.detailed.description'),
    },
  ];

  const [template, setTemplate] = useState('standard');
  const [sections, setSections] = useState<ProposalSections>({
    cover_letter: '',
    scope_of_work: '',
    exclusions: '',
    payment_terms: '',
    timeline: '',
    warranty: '',
    terms_and_conditions: '',
  });
  const [activeSection, setActiveSection] = useState<keyof ProposalSections>('cover_letter');

  // Fetch estimate data
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, clients(name, email)')
        .eq('id', estimateId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!estimateId,
  });

  // Load or create proposal
  const { data: proposal, isLoading: proposalLoading } = useQuery({
    queryKey: ['proposal', estimateId],
    queryFn: async () => {
      // Try to find existing proposal
      const { data: existingProposal } = await supabase
        .from('proposals')
        .select('*')
        .eq('estimate_id', estimateId)
        .maybeSingle();

      if (existingProposal) {
        return existingProposal;
      }

      // Create new proposal if none exists
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newProposal, error } = await supabase
        .from('proposals')
        .insert({
          estimate_id: estimateId,
          user_id: user.id,
          template_name: 'standard',
        })
        .select()
        .single();

      if (error) throw error;
      return newProposal;
    },
    enabled: !!estimateId,
  });

  // Load proposal data into state when available
  useEffect(() => {
    if (!proposal) return;
    const nextSections = {
      cover_letter: proposal.cover_letter || '',
      scope_of_work: proposal.scope_of_work || '',
      exclusions: proposal.exclusions || '',
      payment_terms: proposal.payment_terms || '',
      timeline: proposal.timeline || '',
      warranty: proposal.warranty || '',
      terms_and_conditions: proposal.terms_and_conditions || '',
    };

    // Defer state updates to next tick to avoid synchronous setState warnings
    const timeout = setTimeout(() => {
      setSections(nextSections);
      setTemplate(proposal.template_name || 'standard');
    }, 0);
    return () => clearTimeout(timeout);
  }, [proposal]);

  // Save proposal mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposal?.id) throw new Error('No proposal to save');

      const { error } = await supabase
        .from('proposals')
        .update({
          ...sections,
          template_name: template,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal', estimateId] });
      toast({
        title: t('proposals.saved'),
        description: t('proposals.savedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('proposals.error'),
        description: `${t('proposals.saveFailed')}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const sectionLabels: Record<keyof ProposalSections, string> = {
    cover_letter: t('proposals.sections.coverLetter'),
    scope_of_work: t('proposals.sections.scopeOfWork'),
    exclusions: t('proposals.sections.exclusions'),
    payment_terms: t('proposals.sections.paymentTerms'),
    timeline: t('proposals.sections.timeline'),
    warranty: t('proposals.sections.warranty'),
    terms_and_conditions: t('proposals.sections.termsAndConditions'),
  };

  const handleGenerateSection = async () => {
    if (!estimateId || !proposal?.id) return;

    try {
      const generatedContent = await generateSection(
        estimateId,
        activeSection,
        'professional',
        { name: t('proposals.companyName') }
      );

      // Update local state
      setSections((prev) => ({
        ...prev,
        [activeSection]: generatedContent,
      }));

      // Update proposal in database with AI tracking
      await supabase
        .from('proposals')
        .update({
          [activeSection]: generatedContent,
          ai_generated_sections: {
            ...(proposal.ai_generated_sections || {}),
            [activeSection]: true,
          },
        })
        .eq('id', proposal.id);

      queryClient.invalidateQueries({ queryKey: ['proposal', estimateId] });
    } catch (error) {
      // Error handling already done by useProposalGenerator hook (toast shown)
      console.error('Failed to generate section:', error);
    }
  };

  const isLoading = estimateLoading || proposalLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">{t('proposals.estimateNotFound')}</h2>
          <Button onClick={() => navigate('/estimates')}>
            {t('proposals.backToEstimates')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <SidebarHeaderShell variant="auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/estimates/${estimateId}`)}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('proposals.backToEstimate')}
              </Button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t('proposals.createProposal')}</h1>
            <p className="text-muted-foreground">
              {t('proposals.for')}: {estimate?.name} - {estimate?.clients?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/proposal/${proposal?.id}/preview`)} className="bg-white text-primary border-primary/20 hover:bg-primary/5">
              <Eye className="h-4 w-4 mr-2" />
              {t('proposals.preview')}
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? t('proposals.saving') : t('proposals.saveDraft')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('proposals.template')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  variant={template === t.id ? 'default' : 'outline'}
                  className="w-full justify-start text-left h-auto py-3 px-3"
                  onClick={() => setTemplate(t.id)}
                >
                  <Check className={`h-4 w-4 mr-2 flex-shrink-0 mt-0.5 ${template === t.id ? '' : 'invisible'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium break-words line-clamp-1">{t.name}</div>
                    <div className={`text-xs break-words line-clamp-1 ${template === t.id ? 'text-blue-100' : 'text-muted-foreground'}`}>{t.description}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Sections Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('proposals.sections.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(sectionLabels).map(([key, label]) => {
                const sectionKey = key as keyof ProposalSections;
                const hasContent = sections[sectionKey].trim().length > 0;
                return (
                  <Button
                    key={key}
                    variant={activeSection === key ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sm"
                    onClick={() => setActiveSection(sectionKey)}
                  >
                    {hasContent ? (
                      <Check className="h-3 w-3 mr-2 text-green-600" />
                    ) : (
                      <FileText className="h-3 w-3 mr-2" />
                    )}
                    {label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{sectionLabels[activeSection]}</CardTitle>
              <div className="flex gap-2">
                {proposal?.ai_generated_sections?.[activeSection] && (
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('proposals.aiGenerated')}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSection}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? t('proposals.generating') : t('proposals.generateWithAI')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sections[activeSection]}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    [activeSection]: e.target.value,
                  }))
                }
                rows={15}
                placeholder={`${t('proposals.enter')} ${sectionLabels[activeSection].toLowerCase()}...`}
                className="font-mono text-sm resize-none"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                {t('proposals.characters', { count: sections[activeSection].length })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProposalBuilder;
