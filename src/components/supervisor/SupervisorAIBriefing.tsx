import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Coffee, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useSupervisorProject } from '@/contexts/SupervisorProjectContext';
import { AICacheHeader } from '@/components/AI/AICacheHeader';

export const SupervisorAIBriefing = () => {
  const { t, language } = useLocalization();
  const { formatLongDate } = useDateFormat();
  const { selectedProject } = useSupervisorProject();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    insights,
    cached,
    generatedAt,
    isLoading,
    error,
    generateInsights,
    refresh,
  } = useAIInsights({
    insightType: 'daily-briefing',
    projectId: selectedProject || undefined,
  });



  // Auto-generate briefing on mount if project is selected (cache-first)
  useEffect(() => {
    if (selectedProject && !insights && !isLoading && !error) {
      generateInsights(false);
    }
  }, [selectedProject, insights, isLoading, error, generateInsights, language]);

  if (!selectedProject) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <Sun className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base leading-tight">
                {t('supervisor.dailyBriefing') || "Daily Briefing"}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {formatLongDate(new Date())}
              </p>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          </button>
          {insights ? (
            <div onClick={(e) => e.stopPropagation()}>
              <AICacheHeader
                lastUpdated={generatedAt}
                cached={cached}
                onRefresh={refresh}
                isRefreshing={isLoading}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                generateInsights(false);
              }}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Sparkles className="h-4 w-4" />
                {t('supervisor.generatingMorningReport') || "Generating your morning report..."}
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <span className="font-semibold">{t('common:error') || "Error"}:</span> {error}
              <Button variant="link" size="sm" onClick={() => generateInsights(true)} className="ml-auto text-destructive">
                {t('common:retry') || "Retry"}
              </Button>
            </div>
          ) : insights ? (
            <div className="prose prose-sm max-w-none prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-em:text-card-foreground prose-li:text-card-foreground dark:prose-invert">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('supervisor.readyToStartDay') || "Ready to start your day?"}</p>
              <Button variant="link" onClick={() => generateInsights(false)}>
                {t('supervisor.generateDailyBriefing') || "Generate Daily Briefing"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
