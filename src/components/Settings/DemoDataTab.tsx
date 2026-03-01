import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, Trash2, RefreshCw, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ExecutionLog, ExecutionLogEntry } from './ExecutionLog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createDemoDataActions, type SeedConfig } from './DemoData/seedActions';
import { createArchitectDemoDataActions } from './DemoData/architectSeedActions';
import { useLocalization } from "@/contexts/LocalizationContext";

export function DemoDataTab() {
  const { formatDate } = useDateFormat();
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  // Helper function to translate table names
  const translateTableName = (tableName: string): string => {
    const translationKey = `pages.demoData.tableNames.${tableName}`;
    const translated = t(translationKey);
    // If translation exists (not the key itself), return it; otherwise fallback to formatted name
    if (translated !== translationKey) {
      return translated;
    }
    // Fallback: format the table name nicely
    return tableName
      .replace(/^architect_/, '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [seedConfig, setSeedConfig] = useState<SeedConfig>({
    includeExpenses: true,
    includeMaterials: true,
    includeDocuments: false,
  });
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [architectExecutionLogs, setArchitectExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [isArchitectExecuting, setIsArchitectExecuting] = useState(false);
  const [architectSummaryData, setArchitectSummaryData] = useState<any>(null);
  const [showArchitectClearDialog, setShowArchitectClearDialog] = useState(false);
  const [showArchitectSummaryDialog, setShowArchitectSummaryDialog] = useState(false);

  // Helper function to add execution log
  const addLog = useCallback((type: ExecutionLogEntry['type'], message: string, phase?: string) => {
    const newLog: ExecutionLogEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
      phase,
    };
    setExecutionLogs(prev => [...prev, newLog]);
  }, []);

  // Check if seed data exists (check both registry and actual demo data)
  const { data: seedStats } = useQuery({
    queryKey: ['seed-stats'],
    queryFn: async () => {
      // Measure actual row counts to reflect reality (RLS-safe for admins)
      const tablesToCount = [
        'project_financial_entries',
        'project_resources',
        'project_materials',
        'project_budget_items',
        'project_milestones',
        'project_phases',
        'project_activities',
        'project_purchase_requests',
        'purchase_request_items',
        'quote_requests',
        'quotes',
        'purchase_orders',
        'projects',
        'clients',
        'suppliers',
        'contacts',
      ];

      const counts: Record<string, number> = {};

      await Promise.all(
        tablesToCount.map(async (table) => {
          try {
            const { count } = await (supabase as any)
              .from(table)
              .select('id', { count: 'exact', head: true });
            counts[table] = count ?? 0;
          } catch {
            counts[table] = 0;
          }
        })
      );

      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

      return {
        total,
        byType: counts,
      };
    },
  });

  // Fetch seed data version metadata
  const { data: seedVersion } = useQuery({
    queryKey: ['seed-version'],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('seed_data_registry')
        .select('metadata, created_at')
        .eq('entity_type', '_metadata')
        .order('created_at', { ascending: false })
        .limit(1);

      const data = rows?.[0];

      if (!data?.metadata) return null;

      const metadata = data.metadata as any;
      return {
        version: metadata?.version,
        timestamp: metadata?.timestamp || data.created_at,
        totalRecords: metadata?.totalRecords,
        description: metadata?.description,
      };
    },
  });

  const { fetchDetailedStats, clearSeedData, executeSeeding } = createDemoDataActions(addLog, seedConfig);
  
  // Architect demo data actions
  const architectAddLog = useCallback((type: ExecutionLogEntry['type'], message: string, phase?: string) => {
    const newLog: ExecutionLogEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
      phase,
    };
    setArchitectExecutionLogs(prev => [...prev, newLog]);
  }, []);

  const { fetchArchitectStats, clearArchitectSeedData, executeArchitectSeeding } = createArchitectDemoDataActions(architectAddLog);

  // Seed data mutation
  const seedData = useMutation({
    mutationFn: async () => {
      // Clear logs and set executing state
      setExecutionLogs([]);
      setIsExecuting(true);
      addLog('phase', t("pages.demoData.logStarting"), t("pages.demoData.logPhaseInitialization"));
      addLog('info', t("pages.demoData.logConfigLoaded", { config: JSON.stringify(seedConfig) }));

      return await executeSeeding();
    },
    onSuccess: (data) => {
      setIsExecuting(false);
      addLog('success', t("pages.demoData.logSeedSuccess"));
      addLog('phase', t("pages.demoData.logSummaryPhase"), t("pages.demoData.logCompletionStatsPhase"));

      // Add detailed statistics to logs
      if (data.stats) {
        const stats = data.stats;
        addLog('success', t("pages.demoData.logTotalRecordsCreated", { count: stats.total || 0 }));
        addLog('info', t("pages.demoData.logBaseEntities", {
          clients: stats.clients || 0,
          suppliers: stats.suppliers || 0,
          projects: stats.projects || 0,
        }));
        addLog('info', t("pages.demoData.logProjectStructure", {
          phases: stats.project_phases || 0,
          activities: stats.project_activities || 0,
        }));
        addLog('info', t("pages.demoData.logFinancial", {
          entries: stats.project_financial_entries || 0,
          budgetItems: stats.project_budget_items || 0,
        }));
        addLog('info', t("pages.demoData.logProcurement", {
          purchaseOrders: stats.purchase_orders || 0,
          payments: stats.payment_transactions || 0,
        }));
        addLog('info', t("pages.demoData.logOperations", {
          timeLogs: stats.time_logs || 0,
          dailyLogs: stats.daily_logs || 0,
        }));
      }

      // Show summary dialog
      setSummaryData(data.stats);
      setShowSummaryDialog(true);

      queryClient.invalidateQueries({ queryKey: ['seed-stats'] });
      queryClient.invalidateQueries({ queryKey: ['seed-version'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      toast({
        title: t("pages.demoData.toastSeedCreatedTitle"),
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setIsExecuting(false);
      addLog('error', t("pages.demoData.logError", { error: error.message }));
      toast({
        title: t("pages.demoData.toastSeedFailedTitle"),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear data mutation
  const clearData = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("pages.demoData.notAuthenticated"));

      await clearSeedData();

      return { message: t('pages.demoData.logSeedClearedSuccess') };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seed-stats'] });
      queryClient.invalidateQueries({ queryKey: ['seed-version'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowClearDialog(false);
      toast({
        title: t("pages.demoData.toastSeedClearedTitle"),
        description: data.message,
      });
      // Button will be enabled automatically when hasSeedData becomes false
    },
    onError: (error: Error) => {
      toast({
        title: t("pages.demoData.toastSeedClearFailedTitle"),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasSeedData = seedStats && seedStats.total > 0;

  // Fetch architect seed data statistics
  // Use seed_data_registry instead of direct table counts to avoid RLS issues
  const { data: architectSeedStats } = useQuery({
    queryKey: ['architect-seed-stats'],
    queryFn: async () => {
      const tableMapping: Record<string, string> = {
        'architect_projects': 'projects',
        'architect_clients': 'clients',
        'architect_opportunities': 'opportunities',
        'architect_briefings': 'briefings',
        'architect_meetings': 'meetings',
        'architect_tasks': 'tasks',
        'architect_task_comments': 'task_comments',
        'architect_site_diary': 'site_diary',
        'architect_moodboard_sections': 'moodboard_sections',
        'architect_moodboard_images': 'moodboard_images',
        'architect_moodboard_colors': 'moodboard_colors',
      };

      const counts: Record<string, number> = {};

      // Initialize all counts to 0
      Object.keys(tableMapping).forEach(table => {
        counts[table] = 0;
      });

        // Count from seed_data_registry (not affected by RLS on the actual tables)
      try {
        // Query all architect-related records - using like to catch all architect_* types
        const { data: registryData } = await supabase
          .from('seed_data_registry')
          .select('entity_type')
          .like('entity_type', 'architect_%');

        if (registryData) {
          // Group by entity type and count
          const registryCounts: Record<string, number> = {};
          registryData.forEach(record => {
            registryCounts[record.entity_type] = (registryCounts[record.entity_type] || 0) + 1;
          });

          // Map registry counts to table names
          Object.entries(tableMapping).forEach(([table, entityType]) => {
            // For 'architect_projects' and 'architect_clients', the registry key matches the table name
            // For other tables, the registry key is 'architect_{entityType}'
            const registryKey = (table === 'architect_projects' || table === 'architect_clients')
              ? table
              : `architect_${entityType}`;
            counts[table] = registryCounts[registryKey] || 0;
          });
        }
      } catch (error) {
        console.error('Error fetching architect seed stats from registry:', error);
        // Fallback to direct table counts if registry fails
        await Promise.all(
          Object.keys(tableMapping).map(async (table) => {
            try {
              const { count } = await (supabase as any)
                .from(table)
                .select('id', { count: 'exact', head: true });
              counts[table] = count ?? 0;
            } catch {
              counts[table] = 0;
            }
          })
        );
      }

      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

      return {
        total,
        byType: counts,
      };
    },
  });

  // Fetch architect seed data version metadata
  const { data: architectSeedVersion } = useQuery({
    queryKey: ['architect-seed-version'],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('seed_data_registry')
        .select('metadata, created_at')
        .eq('entity_type', '_metadata')
        .like('metadata->>description', '%architect%')
        .order('created_at', { ascending: false })
        .limit(1);

      const data = rows?.[0];

      if (!data?.metadata) return null;

      const metadata = data.metadata as any;
      return {
        version: metadata?.version,
        timestamp: metadata?.timestamp || data.created_at,
        totalRecords: metadata?.totalRecords,
        description: metadata?.description,
      };
    },
  });

  // Architect seed data mutation
  const seedArchitectData = useMutation({
    mutationFn: async () => {
      setArchitectExecutionLogs([]);
      setIsArchitectExecuting(true);
      architectAddLog('phase', t("pages.demoData.logArchitectStarting"), t("pages.demoData.logPhaseInitialization"));
      return await executeArchitectSeeding();
    },
    onSuccess: (data) => {
      setIsArchitectExecuting(false);
      architectAddLog('success', t("pages.demoData.logArchitectSuccess"));
      setArchitectSummaryData(data.stats);
      setShowArchitectSummaryDialog(true);

      queryClient.invalidateQueries({ queryKey: ['architect-seed-stats'] });
      queryClient.invalidateQueries({ queryKey: ['architect-seed-version'] });
      queryClient.invalidateQueries({ queryKey: ['architect_opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['architect_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['architect_meetings'] });

      toast({
        title: t("pages.demoData.toastArchitectSeedCreatedTitle"),
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setIsArchitectExecuting(false);
      architectAddLog('error', t("pages.demoData.logArchitectError", { error: error.message }));
      toast({
        title: t("pages.demoData.toastArchitectSeedFailedTitle"),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clear architect data mutation
  const clearArchitectData = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("pages.demoData.notAuthenticated"));

      await clearArchitectSeedData();

      return { message: t("pages.demoData.logArchitectSeedClearedSuccess") };
    },
    onSuccess: async (data) => {
      // Invalidate and refetch queries to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['architect-seed-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['architect-seed-version'] });
      await queryClient.invalidateQueries({ queryKey: ['architect_opportunities'] });
      await queryClient.invalidateQueries({ queryKey: ['architect_tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['architect_meetings'] });
      
      // Force refetch the stats query to ensure counts update
      await queryClient.refetchQueries({ queryKey: ['architect-seed-stats'] });
      await queryClient.refetchQueries({ queryKey: ['architect-seed-version'] });
      
      setShowArchitectClearDialog(false);
      toast({
        title: t("pages.demoData.toastArchitectSeedClearedTitle"),
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("pages.demoData.toastArchitectSeedClearFailedTitle"),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasArchitectSeedData = architectSeedStats && architectSeedStats.total > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Configuration and Controls */}
      <div className="space-y-6">
      {/* Comprehensive Project Seed Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("pages.demoData.cardTitle")}</CardTitle>
              <CardDescription>
                {t("pages.demoData.cardDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version Display */}
          {seedVersion && (
            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-primary">{seedVersion.version}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      • {t("pages.demoData.generatedAt", {
                        date: new Date(seedVersion.timestamp).toLocaleString(),
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-right">
                    <span className="font-medium">{seedVersion.totalRecords}</span>
                    <span className="text-muted-foreground"> {t("pages.demoData.recordsLabel")}</span>
                  </div>
                </div>
                {seedVersion.description && (
                  <p className="text-xs text-muted-foreground mt-1">{seedVersion.description}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Status Section */}
          <div className="space-y-3">
            <h4 className="font-medium">{t("pages.demoData.currentStatusTitle")}</h4>
            {hasSeedData ? (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{seedStats.total}</strong> {t("pages.demoData.seedRecordsFound")}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("pages.demoData.breakdownByType")}</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(seedStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-muted-foreground">{translateTableName(type)}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  {t("pages.demoData.noSeedDataFound")}
                </AlertDescription>
              </Alert>
            )}
          </div>
            
          {/* Actions Section */}
          {hasSeedData && (
            <Alert>
              <AlertDescription>
                {t("pages.demoData.clearingAlert")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => seedData.mutate()}
              disabled={seedData.isPending}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${seedData.isPending ? 'animate-spin' : ''}`} />
              {seedData.isPending ? t("pages.demoData.seedingButton") : hasSeedData ? t("pages.demoData.regenerateDatabaseButton") : t("pages.demoData.seedDatabaseButton")}
            </Button>

            <Button
              onClick={() => setShowClearDialog(true)}
              disabled={clearData.isPending || !hasSeedData}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearData.isPending ? t("pages.demoData.clearingButton") : t("pages.demoData.clearSeedDataButton")}
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              {t("pages.demoData.noteText")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Architect Demo Data Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>{t("pages.demoData.architectCardTitle")}</CardTitle>
              <CardDescription>
                {t("pages.demoData.architectCardDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version Display */}
          {architectSeedVersion && (
            <Alert className="bg-blue-500/5 border-blue-500/20">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <AlertDescription>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-blue-500">{architectSeedVersion.version}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      • {t("pages.demoData.generatedAt", {
                        date: new Date(architectSeedVersion.timestamp).toLocaleString(),
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-right">
                    <span className="font-medium">{architectSeedVersion.totalRecords}</span>
                    <span className="text-muted-foreground"> {t("pages.demoData.recordsLabel")}</span>
                  </div>
                </div>
                {architectSeedVersion.description && (
                  <p className="text-xs text-muted-foreground mt-1">{architectSeedVersion.description}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Status Section */}
          <div className="space-y-3">
            <h4 className="font-medium">{t("pages.demoData.currentStatusTitle")}</h4>
            {hasArchitectSeedData ? (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{architectSeedStats.total}</strong> {t("pages.demoData.seedRecordsFound")}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("pages.demoData.breakdownByType")}</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(architectSeedStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-muted-foreground">{translateTableName(type)}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  {t("pages.demoData.noSeedDataFound")}
                </AlertDescription>
              </Alert>
            )}
          </div>
            
          {/* Actions Section */}
          {hasArchitectSeedData && (
            <Alert>
              <AlertDescription>
                {t("pages.demoData.clearingAlert")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => seedArchitectData.mutate()}
              disabled={seedArchitectData.isPending}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${seedArchitectData.isPending ? 'animate-spin' : ''}`} />
              {seedArchitectData.isPending ? t("pages.demoData.seedingButton") : hasArchitectSeedData ? t("pages.demoData.regenerateDatabaseButton") : t("pages.demoData.seedArchitectDatabaseButton")}
            </Button>

            <Button
              onClick={() => setShowArchitectClearDialog(true)}
              disabled={clearArchitectData.isPending}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearArchitectData.isPending ? t("pages.demoData.clearingButton") : t("pages.demoData.clearArchitectDataButton")}
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              {t("pages.demoData.architectNoteText")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      </div>
      {/* Right Column: Execution Log */}
      <div className="lg:sticky lg:top-6 lg:h-[calc(116vh-200px)] space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">{t("pages.demoData.mainDemoDataLog")}</h3>
          <ExecutionLog logs={executionLogs} isActive={isExecuting} />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">{t("pages.demoData.architectDemoDataLog")}</h3>
          <ExecutionLog logs={architectExecutionLogs} isActive={isArchitectExecuting} />
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages.demoData.clearDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.demoData.clearDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pages.demoData.cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearData.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("pages.demoData.clearAllButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seed Data Summary Dialog */}
      <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t("pages.demoData.summaryDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.demoData.summaryDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {summaryData && (
            <div className="space-y-4">
              {/* Overview Card */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{summaryData.total || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.totalRecordsLabel")}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{summaryData.version || t("pages.demoData.notAvailableLabel")}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.versionLabel")}</div>
                  </div>
                  <div>
                    <div className="text-sm">{summaryData.timestamp ? formatDate(summaryData.timestamp) : t("pages.demoData.todayLabel")}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.generatedLabel")}</div>
                  </div>
                </div>
              </div>

              {/* Base Entities */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">{t("pages.demoData.baseEntitiesTitle")}</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3 text-center">
                    <div className="text-lg font-bold">{summaryData.clients || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.clientsLabel")}</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-lg font-bold">{summaryData.projects || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.projectsLabel")}</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-lg font-bold">{summaryData.suppliers || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.suppliersLabel")}</div>
                  </Card>
                </div>
              </div>

              {/* Project Structure */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-blue-600">{t("pages.demoData.projectStructureTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.phasesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_phases || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.activitiesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_activities || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.milestonesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_milestones || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.resourcesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_resources || 0}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Budget */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-emerald-600">{t("pages.demoData.financialBudgetTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.budgetItemsLabel")}</span>
                    <span className="font-semibold">{summaryData.project_budget_items || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.financialEntriesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_financial_entries || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.expensesLabel")}</span>
                    <span className="font-semibold">{summaryData.project_expenses || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.incomeLabel")}</span>
                    <span className="font-semibold">{summaryData.project_income || 0}</span>
                  </div>
                </div>
              </div>

              {/* Procurement & Supply Chain */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-orange-600">{t("pages.demoData.procurementTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.purchaseRequestsLabel")}</span>
                    <span className="font-semibold">{summaryData.purchase_requests || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.requestItemsLabel")}</span>
                    <span className="font-semibold">{summaryData.purchase_request_items || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.quoteRequestsLabel")}</span>
                    <span className="font-semibold">{summaryData.quote_requests || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.quotesLabel")}</span>
                    <span className="font-semibold">{summaryData.quotes || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.purchaseOrdersLabel")}</span>
                    <span className="font-semibold">{summaryData.purchase_orders || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.deliveriesLabel")}</span>
                    <span className="font-semibold">{summaryData.delivery_confirmations || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.paymentsLabel")}</span>
                    <span className="font-semibold">{summaryData.payment_transactions || 0}</span>
                  </div>
                </div>
              </div>

              {/* Project Operations */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-violet-600">{t("pages.demoData.projectOperationsTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("commonUI.materials") }</span>
                    <span className="font-semibold">{summaryData.project_materials || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.timLogsLabel")}</span>
                    <span className="font-semibold">{summaryData.time_logs || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.dailyLogsLabel")}</span>
                    <span className="font-semibold">{summaryData.daily_logs || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.resourceAssignmentsLabel")}</span>
                    <span className="font-semibold">{summaryData.activity_resource_assignments || 0}</span>
                  </div>
                </div>
              </div>

              {/* Client Portal */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-cyan-600">{t("pages.demoData.clientPortalTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.teamMembersLabel")}</span>
                    <span className="font-semibold">{summaryData.project_team_members || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.meetingsLabel")}</span>
                    <span className="font-semibold">{summaryData.client_meetings || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.meetingAttendeesLabel")}</span>
                    <span className="font-semibold">{summaryData.meeting_attendees || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("commonUI.tasks") }</span>
                    <span className="font-semibold">{summaryData.client_tasks || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.communicationsLabel")}</span>
                    <span className="font-semibold">{summaryData.communication_logs || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.chatMessagesLabel")}</span>
                    <span className="font-semibold">{summaryData.chat_messages || 0}</span>
                  </div>
                </div>
              </div>

              {/* Additional Data */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-600">{t("pages.demoData.additionalDataTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.estimatesLabel")}</span>
                    <span className="font-semibold">{summaryData.estimates || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.roadmapItemsLabel")}</span>
                    <span className="font-semibold">{summaryData.roadmap_items || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.documentsLabel")}</span>
                    <span className="font-semibold">{summaryData.project_documents || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.campaignsLabel")}</span>
                    <span className="font-semibold">{summaryData.outbound_campaigns || 0}</span>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-success inline-block mr-2" />
                <div className="font-semibold text-success">{t("pages.demoData.successMessage")}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {summaryData.total || 0} {t("pages.demoData.recordsCreated")} {Object.values(summaryData).filter((v: any) => typeof v === 'number' && v > 0).length - 2} {t("pages.demoData.tablesText")}
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSummaryDialog(false)}>
              {t("pages.demoData.closeButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Architect Clear Confirmation Dialog */}
      <AlertDialog open={showArchitectClearDialog} onOpenChange={setShowArchitectClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages.demoData.clearArchitectDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.demoData.clearArchitectDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pages.demoData.cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearArchitectData.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("pages.demoData.clearAllButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Architect Seed Data Summary Dialog */}
      <AlertDialog open={showArchitectSummaryDialog} onOpenChange={setShowArchitectSummaryDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              {t("pages.demoData.architectSummaryDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.demoData.architectSummaryDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {architectSummaryData && (
            <div className="space-y-4">
              {/* Overview Card */}
              <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">{architectSummaryData.total || 0}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.totalRecordsLabel")}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{architectSummaryData.version || t("pages.demoData.notAvailableLabel")}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.versionLabel")}</div>
                  </div>
                  <div>
                    <div className="text-sm">{architectSummaryData.timestamp ? formatDate(architectSummaryData.timestamp) : t("pages.demoData.todayLabel")}</div>
                    <div className="text-xs text-muted-foreground">{t("pages.demoData.generatedLabel")}</div>
                  </div>
                </div>
              </div>

              {/* Architect Tables */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-blue-600">{t("pages.demoData.architectModuleTitle")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.projectsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_projects || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.clientsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_clients || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.opportunitiesLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_opportunities || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.briefingsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_briefings || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.meetingsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_meetings || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("commonUI.tasks")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_tasks || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.taskCommentsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_task_comments || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.siteDiaryLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_site_diary || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.moodboardSectionsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_moodboard_sections || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.moodboardImagesLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_moodboard_images || 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t("pages.demoData.moodboardColorsLabel")}</span>
                    <span className="font-semibold">{architectSummaryData.architect_moodboard_colors || 0}</span>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-success inline-block mr-2" />
                <div className="font-semibold text-success">{t("pages.demoData.successMessage")}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {architectSummaryData.total || 0} {t("pages.demoData.recordsCreated")} {Object.keys(architectSummaryData).filter(key => 
                    key.startsWith('architect_') && typeof architectSummaryData[key] === 'number' && architectSummaryData[key] > 0
                  ).length} {t("pages.demoData.tablesText")}
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowArchitectSummaryDialog(false)}>
              {t("pages.demoData.closeButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
