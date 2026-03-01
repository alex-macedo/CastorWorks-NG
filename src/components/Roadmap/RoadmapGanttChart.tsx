import { useMemo, useState, useEffect } from "react";
import { differenceInDays, format, addDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, ChevronDown, ChevronRight, Search, X, Filter } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { EPIC_METADATA } from "@/constants/epicMetadata";
import { EpicDocumentationViewer } from "./EpicDocumentationViewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Database } from "@/integrations/supabase/types";

type RoadmapItem = Database["public"]["Tables"]["roadmap_items"]["Row"];

interface RoadmapGanttChartProps {
  items: RoadmapItem[];
}

export function RoadmapGanttChart({ items }: RoadmapGanttChartProps) {
  const { t } = useLocalization();
  const [selectedEpic, setSelectedEpic] = useState<number | null>(null);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const toggleEpic = (epicName: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicName)) {
        next.delete(epicName);
      } else {
        next.add(epicName);
      }
      return next;
    });
  };

  // Get unique statuses and priorities for filters
  const { uniqueStatuses, uniquePriorities } = useMemo(() => {
    const statuses = new Set<string>();
    const priorities = new Set<string>();
    
    items.forEach(item => {
      if (item.status) statuses.add(item.status);
      if (item.priority) priorities.add(item.priority);
    });
    
    return {
      uniqueStatuses: Array.from(statuses).sort(),
      uniquePriorities: Array.from(priorities).sort(),
    };
  }, [items]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery.trim() === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, searchQuery, statusFilter, priorityFilter]);

  // Auto-expand epics that contain matching stories
  useEffect(() => {
    if (searchQuery.trim() !== "" || statusFilter !== "all" || priorityFilter !== "all") {
      const epicsWithMatches = new Set<string>();
      
      filteredItems.forEach(item => {
        const epicMatch = item.notes?.match(/Epic (\d+)/i);
        const epicNumber = epicMatch ? epicMatch[1] : 'other';
        epicsWithMatches.add(`Epic ${epicNumber}`);
      });
      
      setExpandedEpics(epicsWithMatches);
    }
  }, [searchQuery, statusFilter, priorityFilter, filteredItems]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || priorityFilter !== "all";

  // Group filtered items by epic
  const epicGroups = useMemo(() => {
    const groups: { [key: string]: RoadmapItem[] } = {};
    
    filteredItems.forEach(item => {
      // Extract epic number from notes field
      const epicMatch = item.notes?.match(/Epic (\d+)/i);
      const epicNumber = epicMatch ? epicMatch[1] : 'other';
      const epicKey = `Epic ${epicNumber}`;
      
      if (!groups[epicKey]) {
        groups[epicKey] = [];
      }
      groups[epicKey].push(item);
    });

    // Sort epics
    return Object.entries(groups).sort(([a], [b]) => {
      const numA = parseInt(a.replace('Epic ', '')) || 999;
      const numB = parseInt(b.replace('Epic ', '')) || 999;
      return numA - numB;
    });
  }, [filteredItems]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const itemsToUse = filteredItems.length > 0 ? filteredItems : items;
    
    if (itemsToUse.length === 0) {
      const today = new Date();
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 30),
        totalDays: 30,
      };
    }

    const dates = itemsToUse
      .filter(i => i.completed_at || i.created_at)
      .map(i => parseISO(i.completed_at || i.created_at));

    if (dates.length === 0) {
      const today = new Date();
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 30),
        totalDays: 30,
      };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      timelineStart: startOfMonth(minDate),
      timelineEnd: endOfMonth(maxDate),
      totalDays: differenceInDays(endOfMonth(maxDate), startOfMonth(minDate)),
    };
  }, [filteredItems, items]);

  const getItemPosition = (item: RoadmapItem) => {
    const completedDate = item.completed_at ? parseISO(item.completed_at) : parseISO(item.created_at);
    const createdDate = parseISO(item.created_at);

    const startOffset = differenceInDays(createdDate, timelineStart);
    const duration = item.completed_at 
      ? differenceInDays(completedDate, createdDate) || 1
      : 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "critical":
        return "bg-destructive";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-primary";
      case "low":
        return "bg-muted";
      default:
        return "bg-success";
    }
  };

  const monthsInTimeline = useMemo(() => {
    const months: Date[] = [];
    let current = startOfMonth(timelineStart);
    const end = endOfMonth(timelineEnd);

    while (current <= end) {
      months.push(new Date(current));
      current = addDays(current, 1);
      current = startOfMonth(addDays(endOfMonth(current), 1));
    }

    return months;
  }, [timelineStart, timelineEnd]);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("roadmap.title")} Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No completed roadmap items to display
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalMatchingStories = filteredItems.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("roadmap.title")} Timeline - Completed Epics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("additionalPlaceholders.searchStories")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("additionalPlaceholders.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("additionalPlaceholders.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {uniquePriorities.map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{totalMatchingStories}</span> of{" "}
              <span className="font-semibold text-foreground">{items.length}</span> stories
              {hasActiveFilters && " (filtered)"}
            </p>
            {epicGroups.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (expandedEpics.size === epicGroups.length) {
                    setExpandedEpics(new Set());
                  } else {
                    setExpandedEpics(new Set(epicGroups.map(([name]) => name)));
                  }
                }}
                className="gap-2"
              >
                {expandedEpics.size === epicGroups.length ? (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expand All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* No Results Message */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium mb-1">No stories found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {filteredItems.length > 0 && (
        <div className="overflow-x-auto">
          {/* Timeline header */}
          <div className="min-w-[800px] mb-4">
            <div className="flex border-b pb-2">
              <div className="w-64 flex-shrink-0"></div>
              <div className="flex-1 flex">
                {monthsInTimeline.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-center text-sm font-medium text-muted-foreground"
                  >
                    {format(month, "MMM yyyy")}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt rows grouped by epic */}
          <div className="min-w-[800px]">
            {epicGroups.map(([epicName, epicItems]) => {
              const epicNumber = parseInt(epicName.replace('Epic ', '')) || 0;
              const epicMeta = EPIC_METADATA[epicNumber];

              const isExpanded = expandedEpics.has(epicName);

              return (
                <Collapsible
                  key={epicName}
                  open={isExpanded}
                  onOpenChange={() => toggleEpic(epicName)}
                  className="mb-6"
                >
                  {/* Epic header */}
                  <div className="flex items-start gap-3 py-4 px-4 bg-muted/30 border-y sticky top-0 z-20">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-background"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-sm font-semibold">{epicName}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEpic(epicNumber)}
                          className="h-7 gap-1.5 text-xs"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Full Details
                        </Button>
                      </div>
                      {epicMeta && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-normal mb-1">
                          {epicMeta.expandedGoal}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground font-normal">
                        {epicItems.length} {epicItems.length === 1 ? 'story' : 'stories'}
                        {epicMeta && ` • ${epicMeta.estimatedEffort}`}
                      </p>
                    </div>
                  </div>

                  <CollapsibleContent>

                    {/* Story List with Details */}
                    <div className="bg-background/50 border-l-2 border-primary/20 ml-4 mb-4">
                      <div className="px-6 py-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          Stories in {epicName}
                        </h4>
                        {epicItems
                          .sort((a, b) => {
                            const dateA = parseISO(a.completed_at || a.created_at);
                            const dateB = parseISO(b.completed_at || b.created_at);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .map((item, idx) => (
                            <div
                              key={item.id}
                              className="border rounded-lg p-3 bg-card hover:bg-primary/5 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <Badge variant="outline" className="mt-0.5 shrink-0">
                                  {epicNumber}.{idx + 1}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {item.status && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.status}
                                      </Badge>
                                    )}
                                    {item.priority && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getPriorityColor(item.priority)}`}
                                      >
                                        {item.priority}
                                      </Badge>
                                    )}
                                    {item.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.category}
                                      </Badge>
                                    )}
                                    {item.completed_at && (
                                      <span className="text-xs text-muted-foreground">
                                        ✓ Completed: {format(parseISO(item.completed_at), "MMM d, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Timeline visualization */}
                    <div className="px-4">
                      {epicItems
                        .sort((a, b) => {
                          const dateA = parseISO(a.completed_at || a.created_at);
                          const dateB = parseISO(b.completed_at || b.created_at);
                          return dateA.getTime() - dateB.getTime();
                        })
                        .map((item) => {
                          const position = getItemPosition(item);
                          const color = getPriorityColor(item.priority);

                          return (
                            <div 
                              key={item.id} 
                              className="flex items-center py-2 border-b group hover:bg-muted/50"
                            >
                              <div className="w-64 flex-shrink-0 pr-4 pl-8">
                                <p className="text-xs font-medium truncate" title={item.title}>
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.category && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                                      {item.category}
                                    </span>
                                  )}
                                  {item.completed_at && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(parseISO(item.completed_at), "MMM d")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 relative h-8">
                                <div
                                  className={`absolute h-6 ${color} rounded cursor-pointer transition-all hover:opacity-80 group-hover:shadow-md`}
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    minWidth: '4px',
                                  }}
                                  title={`${item.title}\n${item.status}\nCompleted: ${item.completed_at ? format(parseISO(item.completed_at), "MMM d, yyyy") : 'N/A'}`}
                                >
                                  <div className="h-full flex items-center justify-center text-xs text-white font-medium px-2">
                                    ✓
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
        )}

        {/* Epic Documentation Viewer */}
        {selectedEpic !== null && (
          <EpicDocumentationViewer
            epicNumber={selectedEpic}
            open={selectedEpic !== null}
            onOpenChange={(open) => !open && setSelectedEpic(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
