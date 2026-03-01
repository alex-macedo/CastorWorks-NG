import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTaxGuide } from '@/features/tax/hooks/useTaxGuide';
import { useTaxProject } from '@/features/tax/hooks/useTaxProject';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ExternalLink, 
  FileText, 
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';
import { formatDate } from '@/utils/reportFormatters';

export function INSSStrategyContainer() {
  const { projectId } = useClientPortalAuth();
  const { t, dateFormat } = useLocalization();
  const { taxProject, isLoading: loadingProject } = useTaxProject(projectId);
  const { steps, isLoading: loadingGuide } = useTaxGuide(taxProject?.id);

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (loadingProject || loadingGuide) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  if (!taxProject) {
    return (
      <Card className="m-8">
        <CardContent className="p-12 text-center">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">{t('clientPortal.inssStrategy.notSetupTitle')}</CardTitle>
          <CardDescription>
            {t('clientPortal.inssStrategy.notSetupDescription')}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const handleRequestActivation = async () => {
    try {
      const { error } = await supabase
        .from('tax_alerts')
        .insert({
          tax_project_id: taxProject.id,
          alert_type: 'DOCUMENT_MISSING',
          severity: 'INFO',
          message: `Client requested activation of Strategic INSS service.`,
          metadata: { requested_at: new Date().toISOString() }
        });

      if (error) throw error;
      toast.success(t('clientPortal.inssPlanning.labels.requestSent', { defaultValue: "Request sent to your project manager." }));
    } catch (error) {
      console.error('Error sending activation request:', error);
      toast.error(t('common.errorTitle', { defaultValue: "Error" }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-6 w-6 text-blue-500 animate-pulse" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return t('clientPortal.inssStrategy.status.completed');
      case 'IN_PROGRESS':
        return t('clientPortal.inssStrategy.status.active');
      default:
        return t('clientPortal.inssStrategy.status.pending');
    }
  };

  const PageContent = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Visual Progress Ribbon */}
      <div className="hidden lg:flex items-center justify-between px-4 py-8 bg-muted/30 rounded-xl border relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-3 z-10 relative bg-background/0 px-2 text-center max-w-[120px]">
            <div className={cn(
              "h-12 w-12 rounded-full border-4 flex items-center justify-center bg-background transition-all shadow-sm",
              step.status === 'COMPLETED' ? "border-green-500 bg-green-50" : 
              step.status === 'IN_PROGRESS' ? "border-blue-500 bg-blue-50 scale-110" : 
              "border-muted bg-muted/20"
            )}>
              <span className="text-xs font-bold">{step.step_order}</span>
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase leading-tight",
              step.status === 'COMPLETED' ? "text-green-700" : 
              step.status === 'IN_PROGRESS' ? "text-blue-700" : 
              "text-muted-foreground"
            )}>
              {step.summary}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6">
        {steps.map((step) => (
          <Card key={step.id} className={cn(
            "transition-all border-l-4",
            step.status === 'COMPLETED' ? "border-l-green-500 bg-green-50/10" : 
            step.status === 'IN_PROGRESS' ? "border-l-blue-500 bg-blue-50/10 shadow-md" : 
            "border-l-muted"
          )}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <div className="pt-1">{getStatusIcon(step.status)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{step.summary}</h3>
                      {step.status === 'COMPLETED' && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          {getStatusLabel(step.status)}
                        </Badge>
                      )}
                      {step.status === 'IN_PROGRESS' && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          {getStatusLabel(step.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    {step.due_date && (
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-600 mt-2">
                        <Clock className="h-3 w-3" />
                        {t('clientPortal.inssStrategy.dueDate', { date: formatDate(step.due_date, dateFormat) })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[160px]">
                  {step.external_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => window.open(step.external_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('clientPortal.inssStrategy.accessPortal')}
                    </Button>
                  )}
                  {step.attachment_url ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => window.open(step.attachment_url!, '_blank')}
                    >
                      <FileText className="h-4 w-4" />
                      {t('clientPortal.inssStrategy.viewDocument')}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled className="w-full justify-start gap-2 text-muted-foreground italic">
                      {t('clientPortal.inssStrategy.noAttachment')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.inssStrategy.title", { defaultValue: "INSS Strategy" })}
        subtitle={t('clientPortal.inssStrategy.subtitle')}
        actions={
          <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                {t('clientPortal.inssStrategy.labels.help')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl border-b pb-4">
                  {t('clientPortal.inssStrategy.labels.helpTitle')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4 text-sm leading-relaxed">
                <section className="space-y-2">
                  <h4 className="font-bold text-base text-primary uppercase tracking-tight">
                    {t('clientPortal.inssStrategy.helpContent.aboutDebtTitle')}
                  </h4>
                  <p className="whitespace-pre-line">
                    {t('clientPortal.inssStrategy.helpContent.aboutDebtText')}
                  </p>
                </section>

                <section className="space-y-4 border-t pt-6">
                  <div className="space-y-1">
                    <h4 className="font-black text-lg text-primary">
                      {t('clientPortal.inssStrategy.helpContent.installmentsTitle')}
                    </h4>
                    <p className="text-muted-foreground font-medium italic">
                      {t('clientPortal.inssStrategy.helpContent.installmentsSubtitle')}
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.penaltyTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.penaltyText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.installmentCountTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.installmentCountText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.whenTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.whenText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.chargesTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.chargesText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.fillingTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.fillingText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.firstInstallmentTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.firstInstallmentText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.autoDebitTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.autoDebitText')}</p>
                    </div>

                    <div className="space-y-1">
                      <p><strong>{t('clientPortal.inssStrategy.helpContent.dueDatesTitle')}</strong> {t('clientPortal.inssStrategy.helpContent.dueDatesText')}</p>
                    </div>
                  </div>
                </section>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('clientPortal.inssStrategy.classification')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('clientPortal.inssStrategy.labels.type')}</span>
              <p className="font-medium">{t(`clientPortal.inssStrategy.types.${taxProject.construction_type}`)}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('clientPortal.inssStrategy.labels.category')}</span>
              <p className="font-medium">{t(`clientPortal.inssStrategy.categories.${taxProject.category}`)}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('clientPortal.inssStrategy.labels.totalArea')}</span>
              <p className="font-medium">{taxProject.area_total} m²</p>
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('clientPortal.inssStrategy.labels.state')}</span>
              <p className="font-medium">{taxProject.state_code}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full space-y-2"
        disabled={!taxProject.has_strategy_service}
      >
        <div className="flex items-center justify-between space-x-4 px-4 py-2 border rounded-lg bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            {t('clientPortal.inssStrategy.pageTitle', { defaultValue: 'INSS Strategy' })}
            {!taxProject.has_strategy_service && (
              <Badge variant="secondary" className="ml-2 gap-1 text-blue-600">
                <Lock className="h-3 w-3" />
                {t('clientPortal.inssPlanning.labels.exclusiveContent')}
              </Badge>
            )}
          </h2>
          {taxProject.has_strategy_service ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          ) : (
            <Button variant="outline" size="sm" onClick={() => toast.info(t('clientPortal.inssPlanning.labels.logicLockedDesc'))}>
              {t('clientPortal.inssPlanning.labels.learnMore')}
            </Button>
          )}
        </div>

        {taxProject.has_strategy_service ? (
          <CollapsibleContent className="space-y-6 pt-4 animate-in fade-in duration-500">
            <PageContent />
          </CollapsibleContent>
        ) : (
          <div className="p-12 text-center border rounded-lg bg-muted/20 border-dashed">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold">{t('clientPortal.inssPlanning.labels.logicLocked')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {t('clientPortal.inssPlanning.labels.logicLockedDesc')}
            </p>
            <Button className="mt-6" variant="default" onClick={handleRequestActivation}>
              {t('clientPortal.inssPlanning.labels.requestActivation')}
            </Button>
          </div>
        )}
      </Collapsible>
    </div>
  );
}
