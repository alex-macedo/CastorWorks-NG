import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectOpportunities } from '@/hooks/useArchitectOpportunities';
import { useArchitectStatuses } from '@/hooks/useArchitectStatuses';
import { useClients } from '@/hooks/useClients';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DisplaySettings } from '@/components/TaskManagement/DisplaySettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Filter, X, DollarSign, LayoutDashboard } from 'lucide-react';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityForm } from './OpportunityForm';
import { KanbanColumn } from './KanbanColumn';
import { PipelineColumnManager } from './PipelineColumnManager';
import type { ArchitectOpportunity } from '@/hooks/useArchitectOpportunities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ColumnDensity } from '@/components/Architect/Tasks/TasksBoardView';

// Column density presets (matching TasksBoardView)
const COLUMN_DENSITY_PRESETS: Record<ColumnDensity, { minWidth: number }> = {
  superCompact: { minWidth: 220 },
  compact: { minWidth: 260 },
  default: { minWidth: 320 },
  relaxed: { minWidth: 380 },
};

const RELAXED_COLUMN_MIN_WIDTH = COLUMN_DENSITY_PRESETS.relaxed.minWidth;
const MAX_COLUMN_WIDTH_MULTIPLIER = 1.5;

interface OpportunitiesKanbanProps {
  externalFormOpen?: boolean;
  onExternalFormOpenChange?: (open: boolean) => void;
}

export const OpportunitiesKanban = ({ externalFormOpen, onExternalFormOpenChange }: OpportunitiesKanbanProps) => {
  const { t } = useLocalization();
  const { isLoading, error, opportunities, updateOpportunityStage } = useArchitectOpportunities();
  const { statuses } = useArchitectStatuses();
  const { clients } = useClients();
  const { settings: appSettings } = useAppSettings();

  const [internalFormOpen, setInternalFormOpen] = useState(false);
  const isFormOpen = externalFormOpen !== undefined ? externalFormOpen : internalFormOpen;
  const setIsFormOpen = onExternalFormOpenChange !== undefined ? onExternalFormOpenChange : setInternalFormOpen;
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArchitectOpportunity | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');
  const [columnDensity, setColumnDensity] = useState<ColumnDensity>(() => {
    const stored = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('sales-pipeline-column-density')
      : null;
    return (stored === 'superCompact' || stored === 'compact' || stored === 'default' || stored === 'relaxed') ? stored : 'default';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('sales-pipeline-column-density', columnDensity);
  }, [columnDensity]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          opp.project_name.toLowerCase().includes(searchLower) ||
          opp.clients?.name.toLowerCase().includes(searchLower) ||
          opp.notes?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Client filter
      if (filterClient && filterClient !== 'all' && opp.client_id !== filterClient) {
        return false;
      }

      // Value range filter
      if (filterMinValue && opp.estimated_value) {
        if (opp.estimated_value < parseFloat(filterMinValue)) return false;
      }
      if (filterMaxValue && opp.estimated_value) {
        if (opp.estimated_value > parseFloat(filterMaxValue)) return false;
      }

      return true;
    });
  }, [opportunities, searchTerm, filterClient, filterMinValue, filterMaxValue]);

  // Filter visible statuses based on configuration
  const visibleStatuses = useMemo(() => {
    const configuredColumns = appSettings?.sales_pipeline_columns;
    const hasCustomColumns =
      Array.isArray(configuredColumns) && configuredColumns.length > 0;

    // If there is no custom configuration, or some configured ids
    // no longer exist in the current statuses (e.g. mock/demo mode),
    // fall back to showing all statuses so the board is never empty.
    if (!hasCustomColumns) {
      return statuses;
    }

    const allConfiguredIdsExist = configuredColumns!.every((id) =>
      statuses.some((status) => status.id === id),
    );

    if (!allConfiguredIdsExist) {
      return statuses;
    }

    const visible = statuses.filter((status) => configuredColumns!.includes(status.id));

    // Only show statuses explicitly selected in settings when they
    // are all valid for the current status list.
    return visible;
  }, [appSettings?.sales_pipeline_columns, statuses]);

  // Helper to resolve an opportunity's stage to a concrete status.id,
  // handling both real DB ids and demo/mock stage names.
  const resolveStageId = useCallback((opp: ArchitectOpportunity): string | null => {
    // 1) Direct match on id
    if (statuses.some((s) => s.id === opp.stage_id)) {
      return opp.stage_id;
    }

    // 2) Handle known demo mappings from mock data
    const stageMappings: Record<string, string> = {
      // mock -> real status.name
      lead: 'initial_contact',
      proposal: 'proposal_sent',
    };

    const candidates = [
      opp.stage_id,
      (opp as any).stage,
      (opp as any).status,
    ].filter(Boolean) as string[];

    for (const raw of candidates) {
      // a) If this raw value is directly used as a status name
      const byName = statuses.find((s) => s.name === raw);
      if (byName) return byName.id;

      // b) If we have a mapping from the mock value to a real status name
      const mappedName = stageMappings[raw];
      if (mappedName) {
        const mappedStatus = statuses.find((s) => s.name === mappedName);
        if (mappedStatus) return mappedStatus.id;
      }
    }

    return null;
  }, [statuses]);

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, ArchitectOpportunity[]> = {};

    // Initialize all visible status buckets
    for (const status of visibleStatuses) {
      grouped[status.id] = [];
    }

    // Assign each opportunity to a resolved stage bucket (if any)
    for (const opp of filteredOpportunities) {
      const resolved = resolveStageId(opp);
      if (resolved && grouped[resolved]) {
        grouped[resolved].push(opp);
      }
    }

    return grouped;
  }, [visibleStatuses, filteredOpportunities, resolveStageId]);

  // Calculate totals per stage
  const stageTotals = useMemo(() => {
    return visibleStatuses.reduce((acc, status) => {
      const stageOpps = opportunitiesByStage[status.id] || [];
      acc[status.id] = stageOpps.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0);
      return acc;
    }, {} as Record<string, number>);
  }, [visibleStatuses, opportunitiesByStage]);

  // Calculate overall pipeline value
  const totalPipelineValue = useMemo(() => {
    return filteredOpportunities.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0);
  }, [filteredOpportunities]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Column density presets (matching TasksBoardView)
  const COLUMN_DENSITY_PRESETS: Record<ColumnDensity, { minWidth: number }> = {
    compact: { minWidth: 260 },
    default: { minWidth: 320 },
    relaxed: { minWidth: 380 },
  };


  // Container ref for measuring available width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Measure the parent container's width, not the scrollable container itself
        const parent = containerRef.current.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          setContainerWidth(rect.width);
        } else {
          // Fallback to window width if parent not found
          setContainerWidth(window.innerWidth);
        }
      } else {
        // Fallback to window width
        setContainerWidth(window.innerWidth);
      }
    };

    // Use ResizeObserver for more accurate measurements
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    // Observe window resize as well
    window.addEventListener('resize', updateWidth);
    
    // Initial measurement
    updateWidth();

    // Observe the container's parent if available
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Calculate minimum column width based on available space
  // Columns will use flex-1 to distribute evenly, but minWidth ensures they don't shrink too much
  const calculatedColumnWidth = useMemo(() => {
    const preferredMinWidth = COLUMN_DENSITY_PRESETS[columnDensity]?.minWidth ?? COLUMN_DENSITY_PRESETS.default.minWidth;
    
    if (!containerWidth || visibleStatuses.length === 0) {
      return preferredMinWidth;
    }

    // Account for gaps (gap-4 = 1rem = 16px) and padding (px-4 = 1rem = 16px on each side)
    const gapSize = 16; // gap-4
    const paddingSize = 16 * 2; // px-4 on both sides
    const totalGaps = gapSize * (visibleStatuses.length - 1);
    const availableWidth = containerWidth - paddingSize - totalGaps;
    const widthPerColumn = availableWidth / visibleStatuses.length;

    // Absolute minimum width to ensure columns remain usable (200px)
    const absoluteMinWidth = 200;
    
    // Calculate the minimum width that would allow all columns to fit
    const minWidthToFit = Math.max(absoluteMinWidth, widthPerColumn);
    
    // If calculated width is less than preferred, use calculated width to ensure all columns fit
    // Otherwise, use preferred minimum (columns will grow with flex-1 if there's extra space)
    return Math.min(preferredMinWidth, minWidthToFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, visibleStatuses.length, columnDensity]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    // Check if dropping on a stage (not another opportunity)
    const isStage = statuses.some((s) => s.id === newStageId);
    if (!isStage) return;

    // Find the opportunity being moved
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity || opportunity.stage_id === newStageId) return;

    // Update the opportunity stage
    await updateOpportunityStage.mutateAsync({
      id: opportunityId,
      stage_id: newStageId,
    });
  };

  const handleNewOpportunity = (stageId?: string) => {
    setSelectedStageId(stageId || visibleStatuses[0]?.id || statuses[0]?.id);
    setSelectedOpportunity(null);
    setIsFormOpen(true);
  };

  const handleEditOpportunity = (opportunity: ArchitectOpportunity) => {
    setSelectedOpportunity(opportunity);
    setSelectedStageId(opportunity.stage_id);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedOpportunity(null);
      setSelectedStageId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('all');
    setFilterMinValue('');
    setFilterMaxValue('');
  };

  const activeOpportunity = activeId
    ? opportunities.find((opp) => opp.id === activeId)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-bold">{t('architect.opportunities.title')}</h1>
          <Button
            type="button"
            onClick={() => handleNewOpportunity(statuses[0]?.id)}
            disabled={!statuses.length}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('architect.opportunities.new')}
          </Button>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">
                {t('common.errorTitle')}: {error instanceof Error ? error.message : 'Failed to load opportunities'}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('architect.opportunities.backendNotAvailable')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasActiveFilters = searchTerm || filterClient !== 'all' || filterMinValue || filterMaxValue;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{t('architect.opportunities.title')}</h1>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="font-mono">
              <DollarSign className="h-3 w-3 mr-1" />
              {totalPipelineValue.toLocaleString()}
            </Badge>
            <Badge variant="outline">
              {filteredOpportunities.length} {t('architect.opportunities.opportunities')}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filters')}
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDisplaySettings(true)}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            {t('projectDetail.displaySettings')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.search')}</label>
                <Input
                  placeholder={t('architect.opportunities.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('architect.opportunities.client')}</label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('architect.opportunities.minValue')}</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filterMinValue}
                  onChange={(e) => setFilterMinValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('architect.opportunities.maxValue')}</label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filterMaxValue}
                  onChange={(e) => setFilterMaxValue(e.target.value)}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('common.clearFilters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={containerRef} className="w-full max-w-full overflow-x-auto pb-4">
          <div className="flex gap-4 px-4">
            {visibleStatuses.map((status) => {
              const items = opportunitiesByStage[status.id] || [];
              const total = stageTotals[status.id] || 0;

              return (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  opportunities={items}
                  total={total}
                  onAddOpportunity={() => handleNewOpportunity(status.id)}
                  onEditOpportunity={handleEditOpportunity}
                  columnDensity={columnDensity}
                  columnMinWidth={calculatedColumnWidth}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeOpportunity ? (
            <div className="opacity-50 rotate-3">
              <OpportunityCard
                opportunity={activeOpportunity}
                onDragStart={() => {}}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Opportunity Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={handleFormClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedOpportunity
                ? t('architect.opportunities.edit')
                : t('architect.opportunities.new')}
            </SheetTitle>
            <SheetDescription>
              {selectedOpportunity
                ? t('architect.opportunities.editDescription')
                : t('architect.opportunities.newDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <OpportunityForm
              initialStageId={selectedStageId || undefined}
              opportunity={selectedOpportunity}
              onSuccess={() => handleFormClose(false)}
              onCancel={() => handleFormClose(false)}
            />
          </div>
        </SheetContent>
      </Sheet>



       {/* Display Settings */}
       <Sheet open={showDisplaySettings} onOpenChange={setShowDisplaySettings}>
         <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
           <SheetHeader className="px-6 pt-6 pb-4 border-b">
             <SheetTitle>
               {t('projectDetail.displaySettings')}
             </SheetTitle>
             <SheetDescription>
               {t('projectDetail.displaySettingsTab.description')}
             </SheetDescription>
           </SheetHeader>
           <ScrollArea className="flex-1 px-6 py-4">
             <div className="space-y-6 pb-8">
               <PipelineColumnManager
                 onUpdate={() => {
                   // Invalidate queries to refresh the board
                 }}
               />
               <DisplaySettings
                 projectId="sales-pipeline"
                 currentDensity={columnDensity}
                 disablePersistence
                 onDensityChange={(density) => {
                   setColumnDensity(density);
                 }}
                 hideHeader
               />
             </div>
           </ScrollArea>
         </SheetContent>
       </Sheet>
     </div>
   );
 };
