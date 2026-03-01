import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  type DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, RotateCcw, Save } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SIDEBAR_OPTIONS } from "@/constants/rolePermissions";
import { useSidebarPermissions } from "@/hooks/useSidebarPermissions";
import { useSidebarOrderManagement } from "@/hooks/useSidebarOrderManagement";
import { RequireAdmin } from "@/components/RoleGuard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SortableSidebarOptionProps {
  option: typeof SIDEBAR_OPTIONS[0];
  isExpanded: boolean;
  onToggle: () => void;
}

function SortableSidebarOption({ option, isExpanded, onToggle }: SortableSidebarOptionProps) {
  const { t } = useLocalization();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2" data-testid="sortable-option">
      <Card className={`${isDragging ? 'shadow-lg' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Icon */}
            <option.icon className="h-5 w-5 text-muted-foreground" />

            {/* Title */}
            <div className="flex-1">
              <h4 className="font-medium">
                {option.titleKey ? t(option.titleKey) : (option.title ?? option.id)}
              </h4>
              <p className="text-sm text-muted-foreground">
                {option.type === 'link' ? 'Direct link' : `${option.tabs.length} items`}
              </p>
            </div>

            {/* Expand/Collapse Button */}
            {option.type === 'collapsible' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="p-1"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Type Badge */}
            <Badge variant={option.type === 'link' ? 'default' : 'secondary'}>
              {option.type === 'link' ? 'Link' : 'Menu'}
            </Badge>
          </div>

           {/* Collapsible Tabs */}
           {option.type === 'collapsible' && isExpanded && (
             <div className="mt-4 pl-8">
               <SortableContext items={option.tabs.map(tab => `${option.id}.${tab.id}`)} strategy={verticalListSortingStrategy}>
                 <div className="space-y-1">
                   {option.tabs.map((tab) => (
                     <SortableSidebarTab
                       key={`${option.id}.${tab.id}`}
                       tab={tab}
                       optionId={option.id}
                     />
                   ))}
                 </div>
               </SortableContext>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SortableSidebarTabProps {
  tab: typeof SIDEBAR_OPTIONS[0]['tabs'][0];
  optionId: string;
}

function SortableSidebarTab({ tab, optionId }: SortableSidebarTabProps) {
  const { t } = useLocalization();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${optionId}.${tab.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1" data-testid="sortable-tab">
      <div className={`flex items-center gap-3 p-3 rounded border bg-card ${isDragging ? 'shadow-lg' : ''}`}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Icon */}
        <tab.icon className="h-4 w-4 text-muted-foreground" />

        {/* Title */}
        <span className="text-sm flex-1">
          {tab.titleKey ? t(tab.titleKey) : (tab.title ?? tab.id)}
        </span>
      </div>
    </div>
  );
}

export function SidebarOrderManager() {
  const { t } = useLocalization();
  const { optionSortOrder, tabSortOrder, isLoading: isLoadingPermissions } = useSidebarPermissions();
  const { bulkUpdateSortOrders, resetToDefaultOrder, isUpdating } = useSidebarOrderManagement();

  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<typeof SIDEBAR_OPTIONS>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const previousSortOrderRef = useRef<Map<string, number>>(optionSortOrder);
  const hasPendingMutationRef = useRef(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort tabs within each option
  function getSortedTabs(optionId: string) {
    const option = SIDEBAR_OPTIONS.find(opt => opt.id === optionId);
    if (!option) return [];
    
    return [...option.tabs].sort((a, b) => {
      const aOrder = tabSortOrder.get(`${optionId}.${a.id}`) ?? 999;
      const bOrder = tabSortOrder.get(`${optionId}.${b.id}`) ?? 999;
      return aOrder - bOrder;
    });
  }

  // Sort options and tabs based on current sort order
  const sortedOptions = [...SIDEBAR_OPTIONS]
    .sort((a, b) => {
      const aOrder = optionSortOrder.get(a.id) ?? 999;
      const bOrder = optionSortOrder.get(b.id) ?? 999;
      return aOrder - bOrder;
    })
    .map((option) => ({
      ...option,
      tabs: getSortedTabs(option.id),
    }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentOptions = pendingChanges.length > 0 ? pendingChanges : sortedOptions;

    // Check if we're reordering options or tabs
    if (activeId.includes('.') && overId.includes('.')) {
      // Reordering tabs within the same option
      const [activeOptionId] = activeId.split('.');
      const [overOptionId] = overId.split('.');

      if (activeOptionId === overOptionId) {
        const option = currentOptions.find(opt => opt.id === activeOptionId);
        
        if (option) {
          const oldIndex = option.tabs.findIndex(tab => `${activeOptionId}.${tab.id}` === activeId);
          const newIndex = option.tabs.findIndex(tab => `${overOptionId}.${tab.id}` === overId);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newTabs = arrayMove(option.tabs, oldIndex, newIndex);
            const updatedOption = { ...option, tabs: newTabs };

            // Update pending changes
            setPendingChanges(prev => {
              const newOptions = prev.length > 0 ? [...prev] : [...sortedOptions];
              const optionIndex = newOptions.findIndex(opt => opt.id === activeOptionId);
              if (optionIndex !== -1) {
                newOptions[optionIndex] = updatedOption;
              }
              return newOptions;
            });
          }
        }
      }
    } else if (!activeId.includes('.') && !overId.includes('.')) {
      // Reordering options
      const oldIndex = currentOptions.findIndex(opt => opt.id === activeId);
      const newIndex = currentOptions.findIndex(opt => opt.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOptions = arrayMove(currentOptions, oldIndex, newIndex);
        setPendingChanges(newOptions);
      }
    }

    setActiveId(null);
  };

  const handleToggleOption = (optionId: string) => {
    setExpandedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  };

  // Clear pending changes when the refetch completes and updates optionSortOrder
  useEffect(() => {
    // Mark that we're waiting for a mutation to complete
    if (bulkUpdateSortOrders.isPending) {
      hasPendingMutationRef.current = true;
    }
  }, [bulkUpdateSortOrders.isPending]);

  // Watch for optionSortOrder to change - this indicates the refetch has completed
  useEffect(() => {
    if (hasPendingMutationRef.current && pendingChanges.length > 0) {
      // Check if optionSortOrder has changed to a new Map instance
      // (indicates the query was refetched and cache was updated)
      if (previousSortOrderRef.current !== optionSortOrder) {
        hasPendingMutationRef.current = false;
        setPendingChanges([]);
      }
    }
    previousSortOrderRef.current = optionSortOrder;
  }, [optionSortOrder, pendingChanges.length]);

  const handleSaveChanges = () => {
    const updates: any[] = [];

    // Process option reorderings
    pendingChanges.forEach((option, index) => {
      updates.push({
        type: "option",
        optionId: option.id,
        newSortOrder: index,
      });
    });

    // Process tab reorderings
    pendingChanges.forEach((option) => {
      option.tabs.forEach((tab, tabIndex) => {
        updates.push({
          type: "tab",
          optionId: option.id,
          tabId: tab.id,
          newSortOrder: tabIndex,
        });
      });
    });

    if (updates.length > 0) {
      bulkUpdateSortOrders.mutate({ updates });
      // Don't clear pendingChanges yet - let the mutation lifecycle handle it
    }
  };

  const handleReset = () => {
    resetToDefaultOrder.mutate();
    setPendingChanges([]);
  };

  const hasChanges = pendingChanges.length > 0;
  const displayedOptions = pendingChanges.length > 0 ? pendingChanges : sortedOptions;

  if (isLoadingPermissions) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Menu Order Management</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder sidebar menu items and submenus
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isUpdating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={!hasChanges || isUpdating}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Alert */}
        {hasChanges && (
          <Alert>
            <AlertDescription>
              You have unsaved changes. Click "Save Changes" to apply the new menu order.
            </AlertDescription>
          </Alert>
        )}

        {/* Drag and Drop Context */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={displayedOptions.map(opt => opt.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {displayedOptions.map((option) => (
                <SortableSidebarOption
                  key={option.id}
                  option={option}
                  isExpanded={expandedOptions.has(option.id)}
                  onToggle={() => handleToggleOption(option.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {activeId.includes('.') ? (
                  (() => {
                    const [optionId, tabId] = activeId.split('.');
                    const option = SIDEBAR_OPTIONS.find(opt => opt.id === optionId);
                    const tab = option?.tabs.find(t => t.id === tabId);
                    return tab ? (
                      <div className="flex items-center gap-3 p-3 rounded border bg-card shadow-lg">
                        <tab.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {tab.titleKey ? t(tab.titleKey) : (tab.title ?? tab.id)}
                        </span>
                      </div>
                    ) : null;
                  })()
                ) : (
                  (() => {
                    const option = SIDEBAR_OPTIONS.find(opt => opt.id === activeId);
                    return option ? (
                      <Card className="shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <option.icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <h4 className="font-medium">
                              {option.titleKey ? t(option.titleKey) : (option.title ?? option.id)}
                            </h4>
                              <p className="text-sm text-muted-foreground">
                                {option.type === 'link' ? 'Direct link' : `${option.tabs.length} items`}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })()
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </RequireAdmin>
  );
}
