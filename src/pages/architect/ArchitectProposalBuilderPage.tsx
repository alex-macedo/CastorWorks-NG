import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  Save,
  FolderOpen,
  Plus,
  Trash2
} from 'lucide-react';
import { ArchitectProposalPreview } from '@/components/Architect/Proposals/ArchitectProposalPreview';
import { ProposalSectionEditor } from '@/components/Architect/Proposals/ProposalSectionEditor';
import { 
  useGenerateProposal,
  useArchitectBriefings,
  useSaveProposalDraft,
  useProposalDrafts,
  useDeleteProposalDraft,
  getSectionLabel,
  getToneLabel,
  type ProposalSectionType,
  type ProposalTone,
} from '@/hooks/useArchitectProposals';
import { useProjects } from '@/hooks/useProjects';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';

export default function ArchitectProposalBuilderPage() {
  useRouteTranslations();
  const { t, language } = useLocalization();
  const { data: roles } = useUserRoles();
  const { t: translate } = useTranslation();
  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBriefingId, setSelectedBriefingId] = useState<string>('');
  const [selectedSections, setSelectedSections] = useState<ProposalSectionType[]>([]);
  const [selectedTone, setSelectedTone] = useState<ProposalTone>('professional');
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [generatingSections, setGeneratingSections] = useState<Record<ProposalSectionType, boolean>>({
    cover_letter: false,
    design_philosophy: false,
    scope_of_work: false,
    project_methodology: false,
    fee_structure: false,
    sustainability_approach: false,
    timeline: false,
    payment_terms: false,
    exclusions: false,
    warranty: false,
    terms_and_conditions: false,
  });

  const { projects = [] } = useProjects();
  const { data: briefings = [] } = useArchitectBriefings(selectedProjectId || undefined);
  const { data: drafts = [] } = useProposalDrafts(selectedProjectId || undefined);
  const generateMutation = useGenerateProposal();
  const saveDraftMutation = useSaveProposalDraft();
  const deleteDraftMutation = useDeleteProposalDraft();
  const noBriefingsValue = '__no_briefings__';

  const getBriefingOptionLabel = (briefing: (typeof briefings)[number]) => {
    const title = briefing.title?.trim();
    if (title) {
      return title;
    }

    const projectType = briefing.project_type?.trim();
    if (projectType) {
      return projectType;
    }

    const clientObjectives = briefing.client_objectives?.trim();
    if (clientObjectives) {
      return clientObjectives.length > 40
        ? `${clientObjectives.slice(0, 40).trimEnd()}...`
        : clientObjectives;
    }

    if (briefing.created_at) {
      const createdAt = new Date(briefing.created_at);
      if (!Number.isNaN(createdAt.getTime())) {
        return `${t('architect.proposals.briefing')} • ${createdAt.toLocaleDateString(language)}`;
      }
    }

    return t('architect.proposals.briefing');
  };

  // Available sections
  const availableSections: ProposalSectionType[] = [
    'cover_letter',
    'design_philosophy',
    'scope_of_work',
    'project_methodology',
    'fee_structure',
    'sustainability_approach',
    'timeline',
    'payment_terms',
    'exclusions',
    'warranty',
    'terms_and_conditions',
  ];

  // Tone options
  const toneOptions: ProposalTone[] = ['professional', 'friendly', 'detailed', 'concise'];

  // Handle section selection
  const handleSectionToggle = (section: ProposalSectionType) => {
    setSelectedSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Handle select all sections
  const handleSelectAll = () => {
    setSelectedSections(availableSections);
  };

  // Handle clear all sections
  const handleClearAll = () => {
    setSelectedSections([]);
  };

  // Handle generate proposal
  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      return;
    }

    setIsGenerating(true);
    
    try {
      // Initialize generating state for all selected sections
      const initialGeneratingState: Record<ProposalSectionType, boolean> = {
        cover_letter: false,
        design_philosophy: false,
        scope_of_work: false,
        project_methodology: false,
        fee_structure: false,
        sustainability_approach: false,
        timeline: false,
        payment_terms: false,
        exclusions: false,
        warranty: false,
        terms_and_conditions: false,
      };
      selectedSections.forEach(section => {
        initialGeneratingState[section] = true;
      });
      setGeneratingSections(initialGeneratingState);

      const result = await generateMutation.mutateAsync({
        projectId: selectedProjectId || undefined,
        briefingId: selectedBriefingId || undefined,
        sections: selectedSections,
        tone: selectedTone,
        language: language as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR',
      });

      if (result.success) {
        setGeneratedContent(result.sections);
        // Clear generating state after successful generation
        setGeneratingSections({
          cover_letter: false,
          design_philosophy: false,
          scope_of_work: false,
          project_methodology: false,
          fee_structure: false,
          sustainability_approach: false,
          timeline: false,
          payment_terms: false,
          exclusions: false,
          warranty: false,
          terms_and_conditions: false,
        });
        setActiveTab('preview');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle regenerate section
  const handleRegenerateSection = async (section: ProposalSectionType) => {
    setIsGenerating(true);
    setGeneratingSections(prev => ({
      ...prev,
      [section]: true,
    }));
    
    try {
      const result = await generateMutation.mutateAsync({
        projectId: selectedProjectId || undefined,
        briefingId: selectedBriefingId || undefined,
        sections: [section],
        tone: selectedTone,
        language: language as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR',
      });

      if (result.success) {
        setGeneratedContent(prev => ({
          ...prev,
          ...result.sections,
        }));
        // Clear generating state for this section
        setGeneratingSections(prev => ({
          ...prev,
          [section]: false,
        }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    if (!proposalTitle.trim()) {
      return;
    }

    saveDraftMutation.mutate({
      projectId: selectedProjectId || undefined,
      briefingId: selectedBriefingId || undefined,
      title: proposalTitle,
      content: generatedContent,
      sections: selectedSections,
    });
  };

  // Handle load draft
  const handleLoadDraft = (draft: any) => {
    if (draft.project_id) {
      setSelectedProjectId(draft.project_id);
    }
    if (draft.briefing_id) {
      setSelectedBriefingId(draft.briefing_id);
    }
    setProposalTitle(draft.title);
    setGeneratedContent(draft.content || {});
    setSelectedSections(draft.sections || []);
    setActiveTab('builder');
  };

  // Handle delete draft
  const handleDeleteDraft = (draftId: string) => {
    deleteDraftMutation.mutate(draftId);
  };

  // Handle edit section
  const handleEditSection = (section: ProposalSectionType, newContent: string) => {
    setGeneratedContent(prev => ({
      ...prev,
      [section]: newContent,
    }));
  };

  // Handle export PDF
  const handleExportPDF = () => {
    window.print();
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedBriefing = briefings.find(b => b.id === selectedBriefingId);

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-500">
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {t('architect.proposals.pageTitle')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('architect.proposals.pageDescription')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Drafts Dropdown */}
            {drafts.length > 0 && (
              <Select onValueChange={(value) => {
                const draft = drafts.find(d => d.id === value);
                if (draft) handleLoadDraft(draft);
              }}>
                <SelectTrigger className="w-[200px]">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t('architect.proposals.loadDraft')} />
                </SelectTrigger>
                <SelectContent>
                  {drafts.map((draft) => (
                    <SelectItem key={draft.id} value={draft.id}>
                      {draft.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Save Draft Button */}
             <Button 
               variant="glass-style-white"
               onClick={handleSaveDraft}
               disabled={!proposalTitle.trim() || Object.keys(generatedContent).length === 0}
             >
               <Save className="mr-2 h-4 w-4" />
               {t('architect.proposals.saveDraft')}
             </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Content */}
      <div className="px-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full" variant="pill">
          <TabsList className="grid w-full grid-cols-2 h-12 sticky top-24 z-40">
            <TabsTrigger value="builder" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('architect.proposals.builder')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              {t('architect.proposals.preview')}
              {Object.keys(generatedContent).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(generatedContent).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6 mt-6">
            {/* Project, Briefing and Title Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('architect.proposals.selectContext')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Single row for Project, Briefing, and Title */}
                <div className="grid gap-4 md:grid-cols-4 items-end">
                  {/* Project Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('architect.proposals.project')}
                    </label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('architect.proposals.selectProject')} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Briefing Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('architect.proposals.briefing')}
                    </label>
                    <Select 
                      value={selectedBriefingId} 
                      onValueChange={setSelectedBriefingId}
                      disabled={!selectedProjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('architect.proposals.selectBriefing')} />
                      </SelectTrigger>
                      <SelectContent>
                        {briefings.length === 0 ? (
                          <SelectItem value={noBriefingsValue} disabled>
                            No briefings found
                          </SelectItem>
                        ) : (
                          briefings.map((briefing) => (
                            <SelectItem key={briefing.id} value={briefing.id}>
                              {getBriefingOptionLabel(briefing)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Proposal Title */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      {t('architect.proposals.proposalTitle')}
                    </label>
                    <input
                      type="text"
                      value={proposalTitle}
                      onChange={(e) => setProposalTitle(e.target.value)}
                      placeholder={t('architect.proposals.proposalTitlePlaceholder')}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('architect.proposals.selectSections')}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      {t('common.selectAll')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      {t('common.clearAll')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tone Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('architect.proposals.tone')}
                  </label>
                  <div className="flex gap-2">
                    {toneOptions.map((tone) => (
                      <Badge
                        key={tone}
                        variant={selectedTone === tone ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedTone(tone)}
                      >
                        {getToneLabel(tone, t)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Section Checkboxes - Using 3 columns for better space utilization */}
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {availableSections.map((section) => (
                    <div key={section} className="flex items-start gap-3">
                      <Checkbox
                        id={section}
                        checked={selectedSections.includes(section)}
                        onCheckedChange={() => handleSectionToggle(section)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <label
                          htmlFor={section}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {getSectionLabel(section, t)}
                        </label>
        {generatingSections[section] && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{t('architect.proposals.generating')}</span>
          </div>
        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generate Button - Fixed position to the right */}
            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={selectedSections.length === 0 || isGenerating}
                className="min-w-[200px]"
              >
                <Sparkles className={cn('mr-2 h-4 w-4', isGenerating && 'animate-spin')} />
                {isGenerating ? t('architect.proposals.generating') : t('architect.proposals.generateProposal')}
              </Button>
            </div>

            {/* Generated Sections */}
            {Object.keys(generatedContent).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('architect.proposals.generatedSections')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSections.map((section) => (
                    generatedContent[section] && (
                      <ProposalSectionEditor
                        key={section}
                        section={section}
                        content={generatedContent[section]}
                        isGenerating={isGenerating}
                        onRegenerate={() => handleRegenerateSection(section)}
                        onEdit={(newContent) => handleEditSection(section, newContent)}
                        tone={selectedTone}
                        onChangeTone={setSelectedTone}
                      />
                    )
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            {Object.keys(generatedContent).length > 0 ? (
              <ArchitectProposalPreview
                title={proposalTitle || t('architect.proposals.untitledProposal')}
                sections={generatedContent}
                sectionOrder={selectedSections}
                clientName={selectedBriefing?.client_name}
                projectName={selectedProject?.name}
                onEdit={() => setActiveTab('builder')}
                onExportPDF={handleExportPDF}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('architect.proposals.noContentToPreview')}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {t('architect.proposals.generateSectionsFirst')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
