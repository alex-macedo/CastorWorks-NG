import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Languages, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  analyzeAllTranslations, 
  getOverallStats 
} from '@/utils/translationAnalyzer';
import { 
  analyzeSyncNeeds,
  generateSyncedContent,
  getKnownNamespaces 
} from '@/utils/translationSync';
import type { analyzeNamespace } from '@/utils/translationAnalyzer';
import { useLocalization } from '@/contexts/LocalizationContext';

type TranslationStats = Awaited<ReturnType<typeof analyzeNamespace>>;

const LANGUAGE_NAMES: { [key: string]: string } = {
  'en-US': 'English (US)',
  'pt-BR': 'Portuguese (BR)',
  'es-ES': 'Spanish (ES)',
  'fr-FR': 'French (FR)',
};

const LANGUAGE_FLAGS: { [key: string]: string } = {
  'en-US': '🇺🇸',
  'pt-BR': '🇧🇷',
  'es-ES': '🇪🇸',
  'fr-FR': '🇫🇷',
};

export function TranslationDashboard() {
  const { t } = useLocalization();
  const [stats, setStats] = useState<TranslationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const results = await analyzeAllTranslations();
        setStats(results);
      } catch (error) {
        console.error('Failed to load translation stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  async function handleSync() {
    setSyncing(true);
    
    try {
      const namespaces = getKnownNamespaces();
      const syncAnalysis = await analyzeSyncNeeds(namespaces);
      
      const needsSync = syncAnalysis.filter(s => s.synced);
      
      if (needsSync.length === 0) {
        toast.success(t('settings.translationDashboard.syncNoChanges'));
        setSyncing(false);
        return;
      }

      let totalKeysAdded = 0;
      const syncedFiles: string[] = [];

      // Generate synced content for each namespace/language combination
      for (const syncResult of needsSync) {
        for (const [lang, keys] of Object.entries(syncResult.changes)) {
          if (keys.length > 0) {
            const result = await generateSyncedContent(syncResult.namespace, lang);
            if (result) {
              totalKeysAdded += result.addedKeys.length;
              syncedFiles.push(`${lang}/${syncResult.namespace}.json`);
              
              // Create downloadable file
              const blob = new Blob([result.content], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${syncResult.namespace}-${lang}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }
        }
      }

      toast.success(
        t('settings.translationDashboard.syncSuccess', { count: totalKeysAdded, files: syncedFiles.length }),
        { duration: 5000 }
      );

      // Reload stats
      const results = await analyzeAllTranslations();
      setStats(results);
      
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(t('settings.translationDashboard.syncError'));
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportMissing() {
    try {
      const namespaces = getKnownNamespaces();
      const syncAnalysis = await analyzeSyncNeeds(namespaces);
      
      const report = syncAnalysis
        .filter(s => s.synced)
        .map(s => ({
          namespace: s.namespace,
          missingKeys: s.changes,
        }));

      if (report.length === 0) {
        toast.info(t('settings.translationDashboard.exportNoMissing'));
        return;
      }

      const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `missing-translations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('settings.translationDashboard.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('settings.translationDashboard.exportError'));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const overallStats = getOverallStats(stats);
  const sortedStats = [...stats].sort((a, b) => {
    const avgA = Object.values(a.languages).reduce((sum, lang) => sum + lang.completionPercentage, 0) / 4;
    const avgB = Object.values(b.languages).reduce((sum, lang) => sum + lang.completionPercentage, 0) / 4;
    return avgA - avgB; // Sort by completion (lowest first)
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Languages className="h-7 w-7" />
            {t('settings.translationDashboard.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('settings.translationDashboard.description')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportMissing}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('settings.translationDashboard.exportMissing')}
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('settings.translationDashboard.syncing') : t('settings.translationDashboard.syncTranslations')}
          </Button>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(LANGUAGE_NAMES).map(([lang, name]) => {
          const langStats = overallStats[lang];
          const isComplete = langStats.completionPercentage >= 100;
          const hasIssues = langStats.completionPercentage < 90;

          return (
            <Card key={lang}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{LANGUAGE_FLAGS[lang]}</span>
                    {name}
                  </span>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : hasIssues ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('settings.translationDashboard.completion')}</span>
                    <span className="font-bold">
                      {langStats.completionPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={langStats.completionPercentage} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {langStats.translatedKeys} / {langStats.totalKeys} {t('settings.translations.translationLabel')}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('settings.translationDashboard.coverageByNamespace')}
          </CardTitle>
          <CardDescription>
            {t('settings.translationDashboard.coverageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {sortedStats.map((stat) => {
                const avgCompletion = Object.values(stat.languages)
                  .reduce((sum, lang) => sum + lang.completionPercentage, 0) / 4;
                const isExpanded = selectedNamespace === stat.namespace;

                return (
                  <div key={stat.namespace} className="space-y-2">
                    <button
                      onClick={() => setSelectedNamespace(
                        isExpanded ? null : stat.namespace
                      )}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{stat.namespace}</h3>
                            <Badge 
                              variant={avgCompletion >= 100 ? 'default' : avgCompletion >= 90 ? 'secondary' : 'destructive'}
                            >
                              {avgCompletion.toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(LANGUAGE_NAMES).map(([lang, name]) => {
                              const langStats = stat.languages[lang];
                              return (
                                <div key={lang} className="text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span>{LANGUAGE_FLAGS[lang]}</span>
                                    <span className="font-medium">
                                      {langStats.completionPercentage.toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={langStats.completionPercentage} 
                                    className="h-1"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 p-4 border rounded-lg bg-muted/30">
                        <Tabs defaultValue={Object.keys(LANGUAGE_NAMES)[0]} variant="pill">
                          <TabsList className="grid w-full grid-cols-4">
                            {Object.entries(LANGUAGE_NAMES).map(([lang, name]) => (
                              <TabsTrigger key={lang} value={lang}>
                                {LANGUAGE_FLAGS[lang]} {name.split(' ')[0]}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          {Object.entries(LANGUAGE_NAMES).map(([lang]) => {
                            const langStats = stat.languages[lang];
                            const allIssues = [
                              ...langStats.missingKeys.map(k => ({ key: k, type: 'missing' })),
                              ...langStats.emptyKeys.map(k => ({ key: k, type: 'empty' })),
                            ];

                            return (
                              <TabsContent key={lang} value={lang} className="mt-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                      {langStats.translatedKeys} / {langStats.totalKeys} {t('settings.translations.translationLabel')}
                                    </span>
                                    <Badge variant={langStats.completionPercentage >= 100 ? 'default' : 'secondary'}>
                                      {langStats.completionPercentage.toFixed(1)}%
                                    </Badge>
                                  </div>

                                  {allIssues.length > 0 ? (
                                    <div className="mt-4">
                                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {t('settings.translationDashboard.issuesFound', { count: allIssues.length })}
                                      </h4>
                                      <ScrollArea className="h-48 rounded-md border p-2">
                                        <div className="space-y-1">
                                          {allIssues.map((issue, idx) => (
                                            <div 
                                              key={idx}
                                              className="text-xs flex items-center gap-2 p-1 rounded hover:bg-muted"
                                            >
                                              <Badge 
                                                variant={issue.type === 'missing' ? 'destructive' : 'secondary'}
                                                className="text-[10px] px-1.5 py-0"
                                              >
                                                {issue.type}
                                              </Badge>
                                              <code className="text-muted-foreground">{issue.key}</code>
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm text-green-600 mt-4">
                                      <CheckCircle2 className="h-4 w-4" />
                                      {t('settings.translationDashboard.allComplete')}
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            );
                          })}
                        </Tabs>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
