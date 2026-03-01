import { useState, useEffect } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { exportAllData, importData, calculateDatabaseSize, exportTables, getAvailableTables, importCSVToTable } from "@/utils/dataExport";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Download, Upload, Trash2, Database, AlertTriangle, FileJson, FileSpreadsheet, Table, FileCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DataManagementPanel() {
  const { t } = useLocalization();
  const { toast } = useToast();
  const { formatLongDate } = useDateFormat();
  const { settings } = useAppSettings();
  const [stats, setStats] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExportingDump, setIsExportingDump] = useState(false);
  const [dumpProgress, setDumpProgress] = useState<string>('');
  const [selectedTableForCSV, setSelectedTableForCSV] = useState<string>('');
  const [csvImportMode, setCSVImportMode] = useState<'append' | 'replace'>('append');
  const [isCSVImporting, setIsCSVImporting] = useState(false);
  const [csvImportResult, setCSVImportResult] = useState<any>(null);
  const availableTables = getAvailableTables();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await calculateDatabaseSize();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAllData();
      toast({
        title: t("settings:dataManagement.toast.successTitle"),
        description: t("settings:dataManagement.toast.exportSuccess"),
      });
    } catch (error: any) {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: t("settings:dataManagement.toast.selectTableError"),
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportTables(selectedTables, exportFormat, setExportProgress);
      toast({
        title: t("settings:dataManagement.toast.successTitle"),
        description: t("settings:dataManagement.toast.exportSelectedSuccess", {
          format: exportFormat.toUpperCase(),
        }),
      });
    } catch (error: any) {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSelectAll = () => {
    if (selectedTables.length === availableTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(availableTables.map(t => t.name));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importData(file, 'merge');
      toast({
        title: t("settings:dataManagement.toast.successTitle"),
        description: t("settings:dataManagement.toast.importSuccess"),
      });
      loadStats();
    } catch (error: any) {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportDatabaseDump = async () => {
    setIsExportingDump(true);
    setDumpProgress(t("settings:dataManagement.dumpProgress.initializing"));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t("settings:dataManagement.errors.notAuthenticated"));
      }

      setDumpProgress(t("settings:dataManagement.dumpProgress.connecting"));
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database-dump`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || t("settings:dataManagement.errors.exportDumpFailed"));
      }

      setDumpProgress(t("settings:dataManagement.dumpProgress.generating"));
      // Get the SQL dump as blob
      const blob = await response.blob();
      
      setDumpProgress(t("settings:dataManagement.dumpProgress.preparing"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
      a.download = `supabase-dump-${timestamp}.sql`;
      a.click();
      URL.revokeObjectURL(url);

      setDumpProgress('');
      toast({
        title: t("settings:dataManagement.toast.exportDumpCompleteTitle"),
        description: t("settings:dataManagement.toast.exportDumpCompleteDescription", {
          size: (blob.size / 1024 / 1024).toFixed(2),
        }),
        duration: 8000,
      });
    } catch (error: any) {
      setDumpProgress('');
      toast({
        title: t("settings:dataManagement.toast.exportDumpFailedTitle"),
        description: error.message || t("settings:dataManagement.toast.exportDumpFailedDescription"),
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsExportingDump(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTableForCSV) {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: t("settings:dataManagement.toast.selectTableAndFileError"),
        variant: 'destructive',
      });
      return;
    }

    setIsCSVImporting(true);
    setCSVImportResult(null);
    try {
      const result = await importCSVToTable(file, selectedTableForCSV, csvImportMode);
      setCSVImportResult(result);

      if (result.failed === 0) {
        toast({
          title: t("settings:dataManagement.toast.successTitle"),
          description: t("settings:dataManagement.toast.csvImportSuccess", {
            count: result.success,
            table: selectedTableForCSV,
          }),
        });
        loadStats();
      } else {
        toast({
          title: t("settings:dataManagement.toast.partialImportTitle"),
          description: t("settings:dataManagement.toast.partialImportDescription", {
            success: result.success,
            failed: result.failed,
          }),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: t("settings:dataManagement.toast.importFailedTitle"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCSVImporting(false);
      e.target.value = '';
    }
  };

  const handleClearData = () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: t("settings:dataManagement.toast.errorTitle"),
        description: t("settings:dataManagement.toast.deleteConfirmError"),
        variant: 'destructive',
      });
      return;
    }

    // TODO: Implement data clearing
    toast({
      title: t("settings:dataManagement.toast.infoTitle"),
      description: t("settings:dataManagement.toast.clearDataNotAvailable"),
    });
    setShowDeleteDialog(false);
    setDeleteConfirmation('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.last_backup_date && (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                {t("settings:dataManagement.lastBackup", {
                  date: formatLongDate(new Date(settings.last_backup_date)),
                })}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="quick" variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick">{t("settings:tabs.quick-backup")}</TabsTrigger>
              <TabsTrigger value="selective">{t("settings:tabs.selective-export")}</TabsTrigger>
              <TabsTrigger value="csv-import">{t("settings:tabs.csv-import")}</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("settings:dataManagement.exportFormatLabel")}</Label>
                <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        {t("settings:dataManagement.exportFormatOptions.json")}
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        {t("settings:dataManagement.exportFormatOptions.csv")}
                      </div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {t("settings:dataManagement.exportFormatOptions.excel")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleExport} disabled={isExporting} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? t("settings:dataManagement.exportingAllData") : t("settings:dataManagement.exportAllData")}
              </Button>
            </TabsContent>

            <TabsContent value="selective" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("settings:dataManagement.selectTablesLabel")}</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll}
                  >
                    {selectedTables.length === availableTables.length
                      ? t("settings:dataManagement.deselectAll")
                      : t("settings:dataManagement.selectAll")}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                  {Object.entries(
                    availableTables.reduce((acc, table) => {
                      if (!acc[table.category]) acc[table.category] = [];
                      acc[table.category].push(table);
                      return acc;
                    }, {} as Record<string, typeof availableTables>)
                  ).map(([category, tables]) => (
                    <div key={category} className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">{category}</p>
                      {tables.map((table) => (
                        <div key={table.name} className="flex items-center space-x-2 ml-4">
                          <Checkbox
                            id={table.name}
                            checked={selectedTables.includes(table.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTables([...selectedTables, table.name]);
                              } else {
                                setSelectedTables(selectedTables.filter(t => t !== table.name));
                              }
                            }}
                          />
                          <label
                            htmlFor={table.name}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {table.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("settings:dataManagement.exportFormatLabel")}</Label>
                <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">{t("settings:dataManagement.exportFormatShort.json")}</SelectItem>
                    <SelectItem value="csv">{t("settings:dataManagement.exportFormatShort.csv")}</SelectItem>
                    <SelectItem value="excel">{t("settings:dataManagement.exportFormatShort.excel")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isExporting && exportProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("settings:dataManagement.exportingLabel")}</span>
                    <span>{Math.round(exportProgress)}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              <Button
                onClick={handleExportSelected}
                disabled={isExporting || selectedTables.length === 0}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting
                  ? t("settings:dataManagement.exportingLabel")
                  : selectedTables.length === 1
                    ? t("settings:dataManagement.exportTable", { count: selectedTables.length })
                    : t("settings:dataManagement.exportTables", { count: selectedTables.length })}
              </Button>
            </TabsContent>

            <TabsContent value="csv-import" className="space-y-4 mt-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  {t("settings:dataManagement.csvImportDescription")}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{t("settings:dataManagement.selectDestinationTableLabel")}</Label>
                <Select value={selectedTableForCSV} onValueChange={setSelectedTableForCSV}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("additionalPlaceholders.selectTable")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings:dataManagement.importModeLabel")}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="append"
                      checked={csvImportMode === 'append'}
                      onChange={(e) => setCSVImportMode(e.target.value as 'append' | 'replace')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t("settings:dataManagement.importModeAppend")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="replace"
                      checked={csvImportMode === 'replace'}
                      onChange={(e) => setCSVImportMode(e.target.value as 'append' | 'replace')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{t("settings:dataManagement.importModeReplace")}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-file">{t("settings:dataManagement.selectCsvFileLabel")}</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={isCSVImporting || !selectedTableForCSV}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings:dataManagement.csvFileHelper")}
                </p>
              </div>

              {csvImportResult && (
                <Alert variant={csvImportResult.failed === 0 ? 'default' : 'destructive'}>
                  <AlertDescription>
                    <p className="font-semibold mb-2">{t("settings:dataManagement.importResultsTitle")}</p>
                    <ul className="space-y-1 text-sm">
                      <li>{t("settings:dataManagement.importResultsSuccess", { count: csvImportResult.success })}</li>
                      <li>{t("settings:dataManagement.importResultsFailed", { count: csvImportResult.failed })}</li>
                      {csvImportResult.errors.length > 0 && (
                        <li className="mt-2">
                          <p className="font-semibold text-xs mb-1">{t("settings:dataManagement.importResultsErrorsTitle")}</p>
                          <ul className="list-disc list-inside space-y-1">
                            {csvImportResult.errors.map((error: string, idx: number) => (
                              <li key={idx} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <Label htmlFor="import-file" className="mb-2 block">{t("settings:dataManagement.importBackupTitle")}</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t("settings:dataManagement.importBackupDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.completeDatabaseExport") }</CardTitle>
          <CardDescription>
            {t("settings:dataManagement.completeDatabaseExportDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">{t("settings:dataManagement.sqlExportIntro")}</p>
              <p className="text-sm mb-2">{t("settings:dataManagement.sqlExportDetails")}</p>
              <ul className="list-disc list-inside space-y-1 text-sm mb-2">
                <li>{t("settings:dataManagement.sqlExportTargets.localSupabase")}</li>
                <li>{t("settings:dataManagement.sqlExportTargets.anotherSupabase")}</li>
                <li>{t("settings:dataManagement.sqlExportTargets.postgresql")}</li>
              </ul>
              <p className="text-sm font-semibold mt-2">{t("settings:dataManagement.importInstructionsTitle")}</p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>{t("settings:dataManagement.importInstructionsMigrations")} <code className="bg-muted px-1 rounded">supabase migration up</code></li>
                <li>{t("settings:dataManagement.importInstructionsImport")} <code className="bg-muted px-1 rounded">psql &lt;connection-string&gt; &lt; dump.sql</code></li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button 
              onClick={handleExportDatabaseDump} 
              disabled={isExportingDump}
              className="w-full"
              variant="outline"
            >
              <FileCode className="mr-2 h-4 w-4" />
              {isExportingDump
                ? t("settings:dataManagement.exportingDatabaseDump")
                : t("settings:dataManagement.exportDatabaseDump")}
            </Button>
            {isExportingDump && dumpProgress && (
              <p className="text-sm text-muted-foreground text-center">{dumpProgress}</p>
            )}
            {isExportingDump && (
              <Progress value={undefined} className="w-full" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.databaseStatistics") }</CardTitle>
          <CardDescription>
            {t("settings:dataManagement.databaseOverviewDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{t("commonUI.totalProjects") }</p>
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{t("commonUI.totalExpenses") }</p>
                <p className="text-2xl font-bold">{stats.totalExpenses}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{t("commonUI.totalMaterials") }</p>
                <p className="text-2xl font-bold">{stats.totalMaterials}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{t("settings:dataManagement.databaseSizeLabel")}</p>
                <p className="text-2xl font-bold">{stats.estimatedSize}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("settings:dataManagement.loadingStatistics")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings:dataManagement.dangerZoneTitle")}</CardTitle>
          <CardDescription>
            {t("settings:dataManagement.dangerZoneDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive/50 bg-destructive/10 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {t("settings:dataManagement.dangerZoneWarning")}
            </AlertDescription>
          </Alert>

          <Button 
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("settings:dataManagement.clearAllData")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings:dataManagement.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:dataManagement.deleteDialogDescription")}
              
              <div className="mt-4">
                <p className="font-semibold mb-2">{t("settings:dataManagement.deleteDialogConfirmLabel")}</p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={t("additionalPlaceholders.deleteConfirm")}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
              {t("settings:dataManagement.deleteDialogCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("settings:dataManagement.deleteDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
