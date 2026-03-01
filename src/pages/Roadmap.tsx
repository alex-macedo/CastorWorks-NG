import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, Plus, CheckCircle2, Layers, ArrowUp, AlertCircle, Package, BarChart3, Network, Calendar, LayoutList, Columns3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoadmapItems, useUpdateRoadmapItem, type RoadmapItem } from '@/hooks/useRoadmapItems';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapCard } from '@/components/Roadmap/RoadmapCard';
import { NewRoadmapItemDialog } from '@/components/Roadmap/NewRoadmapItemDialog';
import { EditRoadmapItemDialog } from '@/components/Roadmap/EditRoadmapItemDialog';
import { RoadmapItemDetailDialog } from '@/components/Roadmap/RoadmapItemDetailDialog';
import { ReleaseManagementDialog } from '@/components/Roadmap/ReleaseManagementDialog';
import { RoadmapSuggestionsPanel } from '@/components/Roadmap/RoadmapSuggestionsPanel';
import { DependencyLines } from '@/components/Roadmap/DependencyLines';
import { KeyboardShortcutsHelp } from '@/components/Roadmap/KeyboardShortcutsHelp';
import { RoadmapKanbanColumnsSection } from '@/components/Roadmap/RoadmapKanbanColumnsSection';
import { useRoadmapKanbanColumns } from '@/hooks/useRoadmapKanbanColumns';
import { getColumnBgClass, getColumnTextClass } from '@/utils/roadmapColumnColors';
import { useBugRecorder } from '@/contexts/BugRecorderContext';
import { SprintBoard } from '@/components/Sprint/SprintBoard';
import { SprintHistory } from '@/components/Sprint/SprintHistory';
import { SprintManagementDialog } from '@/components/Sprint/SprintManagementDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { cn } from '@/lib/utils';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DisplaySettings } from '@/components/TaskManagement/DisplaySettings';
import type { ColumnDensity } from '@/components/Architect/Tasks/TasksBoardView';

const ROADMAP_COLUMN_DENSITY_KEY = 'roadmap_column_density';
const TASK_RUNNER_BRIDGE_URL = (import.meta as unknown as { env?: { VITE_TASK_RUNNER_BRIDGE_URL?: string } }).env?.VITE_TASK_RUNNER_BRIDGE_URL ?? 'http://localhost:3847';

const ROADMAP_COLUMN_WIDTH: Record<ColumnDensity, number> = {
  superCompact: 220,
  compact: 260,
  default: 320,
  relaxed: 380,
};

const COLUMN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  backlog: Layers,
  next_up: ArrowUp,
  in_progress: RefreshCw,
  blocked: AlertCircle,
  done: CheckCircle2,
};

export default function Roadmap() {
  useRouteTranslations(); // Load translations for this route
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [aiToWorkDialogOpen, setAiToWorkDialogOpen] = useState(false);
  const [aiToWorkCopySuccess, setAiToWorkCopySuccess] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const aiToWorkOutputRef = useRef<HTMLPreElement>(null);
  const { open: bugRecorderOpen } = useBugRecorder();
  const [selectedItem, setSelectedItem] = useState<(RoadmapItem & { upvotes: number }) | null>(null);
  const { columns: kanbanColumns, visibleColumns } = useRoadmapKanbanColumns();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showDependencyLines, setShowDependencyLines] = useState(true);
  const [focusedColumnIndex, setFocusedColumnIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('kanban');
  const [columnDensity, setColumnDensity] = useState<ColumnDensity>(() => {
    const saved = sessionStorage.getItem(ROADMAP_COLUMN_DENSITY_KEY);
    if (saved === 'superCompact' || saved === 'compact' || saved === 'default' || saved === 'relaxed') return saved;
    return 'default';
  });
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiToWorkOutputRef.current && outputLines.length > 0) {
      aiToWorkOutputRef.current.scrollTop = aiToWorkOutputRef.current.scrollHeight;
    }
  }, [outputLines]);

  const columnWidth = ROADMAP_COLUMN_WIDTH[columnDensity];
  
  const { roadmapItems, isLoading } = useRoadmapItems({
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const updateItem = useUpdateRoadmapItem();

  // Group items by status (include all configured column ids; unknown statuses go to first column)
  const itemsByStatus = useMemo(() => {
    const columnIds = kanbanColumns.map((c) => c.id);
    const grouped: Record<string, typeof roadmapItems> = {};
    columnIds.forEach((id) => {
      grouped[id] = [];
    });

    roadmapItems?.forEach((item) => {
      const status = item.status;
      if (grouped[status]) {
        grouped[status].push(item);
      } else if (columnIds.length > 0) {
        grouped[columnIds[0]].push(item);
      }
    });

    return grouped;
  }, [roadmapItems, kanbanColumns]);

  const handleDragStart = (e: React.DragEvent, itemId: string, status: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.setData('sourceStatus', status);
  };

  const handleDragOver = (e: React.DragEvent, status: string, targetId?: string) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string, targetId?: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');

    if (itemId && sourceStatus !== targetStatus) {
      try {
        await updateItem.mutateAsync({
          id: itemId,
          status: targetStatus,
        });
      } catch (error) {
        console.error('Failed to update roadmap item status:', error);
      }
    }
  };

  const handleMarkCompleted = async () => {
    const doneItems = itemsByStatus.done || [];
    // Here we would typically mark items as fully processed/archived
    console.log('Marking completed items as processed', doneItems);
  };

  const handleAiToWorkClick = async () => {
    setAiToWorkCopySuccess(false);
    try {
      const healthRes = await fetch(`${TASK_RUNNER_BRIDGE_URL}/health`);
      const ok = healthRes.ok && (await healthRes.json()).ok;
      if (ok) {
        window.open(`${window.location.origin}/roadmap/ai-to-work?maxItems=1`, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch {
      // ignore
    }
    setBridgeOnline(false);
    setOutputLines([]);
    setRunError(null);
    setAiToWorkDialogOpen(true);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewItem: () => setNewItemDialogOpen(true),
    onToggleDependencies: () => setShowDependencyLines(!showDependencyLines),
    onRefresh: () => window.location.reload(),
    onNavigateLeft: () => {
      setFocusedColumnIndex((prev) => Math.max(0, prev - 1));
    },
    onNavigateRight: () => {
      setFocusedColumnIndex((prev) => Math.min(visibleColumns.length - 1, prev + 1));
    },
    onNavigateUp: () => {
      setFocusedItemIndex((prev) => Math.max(0, prev - 1));
    },
    onNavigateDown: () => {
      const columnId = visibleColumns[focusedColumnIndex]?.id;
      const currentColumn = columnId ? itemsByStatus[columnId] || [] : [];
      setFocusedItemIndex((prev) => Math.min(currentColumn.length - 1, prev + 1));
    },
    enabled: !newItemDialogOpen && !editItemDialogOpen && !detailDialogOpen && !releaseDialogOpen && !sprintDialogOpen && !bugRecorderOpen,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('roadmap.title')}</h1>
          <div className="flex gap-2">
            <Button
              variant="glass-style-white"
              onClick={handleAiToWorkClick}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('roadmap.aiToWork')}
            </Button>
            <KeyboardShortcutsHelp />
            <Button
              variant="glass-style-white"
              onClick={() => navigate('/roadmap/analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {t('roadmap.analytics')}
            </Button>
            <Button
              variant="glass-style-white"
              onClick={() => navigate('/releases-report')}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              {t('roadmap.releases')}
            </Button>
            <Button
              variant="glass-style-white"
              onClick={() => setSprintDialogOpen(true)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('roadmap.createSprint')}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>
      </div>

      {/* AI Suggestions Panel */}
      <RoadmapSuggestionsPanel />

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black/50 dark:text-white/50 z-10" />
          <Input
            placeholder={t('roadmap.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-black/20 dark:hover:bg-white/20 backdrop-blur-sm h-10 !rounded-full font-bold placeholder:text-black/50 dark:placeholder:text-white/50"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-black/20 dark:hover:bg-white/20 backdrop-blur-sm h-10 px-6 !rounded-full font-bold">
            <div className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t('roadmap.allCategories')} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('roadmap.allCategories')}</SelectItem>
            <SelectItem value="feature">{t('roadmap.category.feature')}</SelectItem>
            <SelectItem value="bug_fix">{t('roadmap.category.bugFix')}</SelectItem>
            <SelectItem value="integration">{t('roadmap.category.integration')}</SelectItem>
            <SelectItem value="refinement">{t('roadmap.category.refinement')}</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="glass-style-dark" onClick={handleMarkCompleted}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t('roadmap.markCompleted')}
        </Button>

        <Button 
          variant="glass-style-dark"
          onClick={() => setShowDependencyLines(!showDependencyLines)}
        >
          <Network className="mr-2 h-4 w-4" />
          {showDependencyLines ? t('roadmap.hideDependencies') : t('roadmap.showDependencies')}
        </Button>

        <Button variant="glass-style-dark" onClick={() => setReleaseDialogOpen(true)}>
          <Package className="mr-2 h-4 w-4" />
          {t('roadmap.manageReleases')}
        </Button>

        <Button variant="glass-style-dark" onClick={() => setNewItemDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('roadmap.newItem')}
        </Button>
      </div>
      {/* Tabs for Kanban and Sprint Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill">
        <TabsList className="flex flex-wrap items-center gap-1.5">
          <TabsTrigger value="kanban">{t('roadmap.kanbanBoard')}</TabsTrigger>
          <TabsTrigger value="sprints">{t('roadmap.activeSprint')}</TabsTrigger>
          <TabsTrigger value="sprint-history">{t('roadmap.sprintHistory')}</TabsTrigger>
          <span className="mx-1 h-6 w-px shrink-0 bg-border/60" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setDisplaySettingsOpen(true)}
            title={t('projectDetail.displaySettings')}
          >
            <Columns3 className="mr-2 h-4 w-4" />
            {t('projectDetail.displaySettings')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('roadmap.refresh')}
          </Button>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          {/* Kanban Board */}
          <div className="flex justify-center overflow-x-auto pb-4 relative" data-kanban-container>
            {showDependencyLines && <DependencyLines items={roadmapItems || []} />}
            <div className="flex gap-4 relative z-[2]">
              {visibleColumns.map((column, colIndex) => {
                const Icon = COLUMN_ICONS[column.id] || LayoutList;
                const items = itemsByStatus[column.id] || [];
                const count = items.length;
                const columnLabel = column.labelKey ? t(column.labelKey) : (column.label || column.id);

                return (
                  <div
                    key={column.id}
                    className={cn(
                      "flex-shrink-0 transition-all",
                      focusedColumnIndex === colIndex && "ring-2 ring-primary/50 rounded-lg"
                    )}
                    style={{ width: columnWidth }}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    <div className="bg-muted/50 rounded-lg p-4 h-full min-h-[600px]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn('h-4 w-4 shrink-0 rounded-full', getColumnBgClass(column))}
                            aria-hidden
                          />
                          <Icon className={cn('h-4 w-4 shrink-0', getColumnTextClass(column))} />
                          <h2 className={cn('font-semibold text-base', getColumnTextClass(column))}>
                            {columnLabel}
                          </h2>
                        </div>
                        <span className="text-sm text-muted-foreground bg-background px-2.5 py-1 rounded-full font-medium">
                          {count}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {isLoading ? (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            {t('common.loading')}
                          </div>
                        ) : items.length === 0 ? (
                          <div
                            className="text-center text-sm text-muted-foreground py-8 min-h-[100px] border-2 border-dashed border-muted rounded-lg flex items-center justify-center"
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                          >
                            {t('roadmap.noItems')}
                          </div>
                        ) : (
                          items.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className={cn(
                                "transition-all",
                                focusedColumnIndex === colIndex &&
                                focusedItemIndex === itemIndex &&
                                "ring-2 ring-primary rounded-lg"
                              )}
                              onDragOver={(e) => handleDragOver(e, column.id, item.id)}
                              onDragLeave={(e) => handleDragLeave(e, item.id)}
                              onDrop={(e) => handleDrop(e, column.id, item.id)}
                            >
                              <RoadmapCard
                                item={{
                                  ...item,
                                  upvotes: item.upvotes_count || 0,
                                }}
                                allItems={roadmapItems || []}
                                onDragStart={(e, id) => handleDragStart(e, id, column.id)}
                                onDragEnd={() => setDraggedItem(null)}
                                onClick={() => {
                                  setSelectedItem({
                                    ...item,
                                    upvotes: item.upvotes_count || 0,
                                  });
                                  setDetailDialogOpen(true);
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sprints" className="mt-6">
          <SprintBoard />
        </TabsContent>

        <TabsContent value="sprint-history" className="mt-6">
          <SprintHistory />
        </TabsContent>
      </Tabs>

      <NewRoadmapItemDialog
        open={newItemDialogOpen}
        onOpenChange={setNewItemDialogOpen}
      />

      <EditRoadmapItemDialog
        open={editItemDialogOpen}
        onOpenChange={setEditItemDialogOpen}
        item={selectedItem}
      />

      <RoadmapItemDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={() => {
          setDetailDialogOpen(false);
          setEditItemDialogOpen(true);
        }}
        item={selectedItem}
      />

      <ReleaseManagementDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
      />

      <SprintManagementDialog
        open={sprintDialogOpen}
        onOpenChange={setSprintDialogOpen}
      />

      <Dialog open={aiToWorkDialogOpen} onOpenChange={setAiToWorkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('roadmap.aiToWorkDialog.title')}</DialogTitle>
            <DialogDescription>
              {bridgeOnline === false
                ? t('roadmap.aiToWorkDialog.bridgeNotRunning')
                : t('roadmap.aiToWorkDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2 flex-1 min-h-0">
            {bridgeOnline === false ? (
              <>
                <p className="text-sm text-muted-foreground">{t('roadmap.aiToWorkDialog.startBridge')}</p>
                <code className="block rounded-md bg-muted px-3 py-2 text-sm font-mono">
                  npm run task-runner:bridge
                </code>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText('npm run task-runner:bridge');
                      setAiToWorkCopySuccess(true);
                      setTimeout(() => setAiToWorkCopySuccess(false), 2000);
                    }}
                  >
                    {aiToWorkCopySuccess ? t('roadmap.aiToWorkDialog.copied') : t('roadmap.aiToWorkDialog.copy')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText('npm run task-runner');
                      setAiToWorkCopySuccess(true);
                      setTimeout(() => setAiToWorkCopySuccess(false), 2000);
                    }}
                  >
                    {t('roadmap.aiToWorkDialog.copyTerminalCommand')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {(running || outputLines.length > 0) && (
                  <div className="flex flex-col gap-2 flex-1 min-h-0">
                    {running && (
                      <p className="text-sm text-muted-foreground">{t('roadmap.aiToWorkDialog.running')}</p>
                    )}
                    {runError && (
                      <p className="text-sm text-destructive">{runError}</p>
                    )}
                    <ScrollArea className="rounded-md border bg-zinc-900 text-zinc-100 font-mono text-xs p-3 h-[320px]">
                      <pre ref={aiToWorkOutputRef} className="whitespace-pre-wrap break-words">
                        {outputLines.length === 0 && !running ? t('roadmap.aiToWorkDialog.output') : outputLines.join('\n')}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                {!running && outputLines.length === 0 && bridgeOnline === true && (
                  <p className="text-sm text-muted-foreground">{t('roadmap.aiToWorkDialog.description')}</p>
                )}
                {bridgeOnline === null && !running && outputLines.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('roadmap.aiToWorkDialog.checking')}</p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={displaySettingsOpen} onOpenChange={setDisplaySettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{t('projectDetail.displaySettings')}</SheetTitle>
            <SheetDescription>
              {t('projectDetail.displaySettingsTab.description')}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6 pb-8">
              <RoadmapKanbanColumnsSection />
              <DisplaySettings
                currentDensity={columnDensity}
                storageKey={ROADMAP_COLUMN_DENSITY_KEY}
                onDensityChange={setColumnDensity}
                hideHeader
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

