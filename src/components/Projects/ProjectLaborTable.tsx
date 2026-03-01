import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useProjectLabor } from "@/hooks/useProjectLabor";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle, Search, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Edit, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";


type ProjectLabor = Database["public"]["Tables"]["project_labor"]["Row"];

interface ProjectLaborTableProps {
  projectId: string;
}

export const ProjectLaborTable = ({ projectId }: ProjectLaborTableProps) => {
  const { t, currency, language } = useLocalization();
  const navigate = useNavigate();
  const { laborItems, isLoading } = useProjectLabor(projectId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    setExpandedGroups(prev => {
      const next: Record<string, boolean> = {};
      laborItems.forEach(item => {
        const key = item.group || t("materials:laborSection.defaultGroup", { defaultValue: "Labor" });
        next[key] = prev[key] ?? true;
      });
      return next;
    });
  }, [laborItems, t]);

  const columns = useMemo<ColumnDef<ProjectLabor>[]>(() => [
    {
      accessorKey: "group",
      header: t("materials:groupName"),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("group")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: t("materials:description"),
      cell: ({ row }) => (
        <div className="max-w-[360px]">{row.getValue("description")}</div>
      ),
    },
    {
      accessorKey: "percentage",
      header: t("materials:table.percentage"),
      cell: ({ row }) => {
        const value = Number(row.getValue("percentage") || 0);
        return (
          <div className="text-right font-mono text-sm text-muted-foreground">
            {value.toFixed(2)}%
          </div>
        );
      },
      meta: {
        className: "text-right",
      },
    },
    {
      accessorKey: "total_value",
      header: t("materials:table.totalValue"),
      cell: ({ row }) => {
        const total = Number(row.getValue("total_value") || 0);
        return (
          <div className="text-right font-mono font-semibold">
            {new Intl.NumberFormat(language, {
              style: "currency",
              currency: currency || "BRL",
            }).format(total)}
          </div>
        );
      },
    },
    {
      accessorKey: "editable",
      header: t("materials:table.editable"),
      cell: ({ row }) => {
        const editable = row.getValue("editable");
        const isEditable = editable !== false;
        return (
          <div className="flex justify-center">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isEditable
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {isEditable ? t("common.yes") : t("common.no")}
            </span>
          </div>
        );
      },
    },
  ], [t, currency, language]);

  const filteredLabor = useMemo(() => {
    if (!searchQuery) return laborItems;
    const query = searchQuery.toLowerCase();
    return laborItems.filter(item =>
      item.description.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query)
    );
  }, [laborItems, searchQuery]);

  const groupedLabor = useMemo(() => {
    const groups: Record<string, { items: ProjectLabor[]; total: number }> = {};
    filteredLabor.forEach(item => {
      const groupName = item.group || t("materials:laborSection.defaultGroup", { defaultValue: "Labor" });
      if (!groups[groupName]) {
        groups[groupName] = { items: [], total: 0 };
      }
      groups[groupName].items.push(item);
      groups[groupName].total += Number(item.total_value || 0);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map(([name, data]) => ({
        name,
        items: data.items,
        total: data.total,
      }));
  }, [filteredLabor, t]);

  const formatCurrencyValue = (value: number) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const isGroupExpanded = (groupName: string) => expandedGroups[groupName] !== false;

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    groupedLabor.forEach(group => {
      allExpanded[group.name] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    groupedLabor.forEach(group => {
      collapsed[group.name] = false;
    });
    setExpandedGroups(collapsed);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDuplicateTemplate = async () => {
    if (!projectId || isDuplicating) return;

    setIsDuplicating(true);
    try {
      // Use RPC function to duplicate labor template
      const { data: itemsInserted, error: rpcError } = await supabase.rpc('duplicate_labor_template', {
        p_project_id: projectId
      });

      if (rpcError) throw rpcError;

      if (itemsInserted === 0) {
        toast({
          title: t("materials:laborSection.errorTitle"),
          description: t("materials:laborSection.noTemplateDescription"),
          variant: "destructive",
        });
        return;
      }

      // The RPC function handles the insertion, so we just need to invalidate queries
      toast({
        title: t("materials:laborSection.successTitle"),
        description: t("materials:laborSection.successDescription"),
      });

      await queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
      window.location.reload();
    } catch (error: any) {
      console.error("[ProjectLaborTable] Failed to duplicate labor template:", error);
      toast({
        title: t("materials:laborSection.errorTitle"),
        description: error?.message || t("materials:laborSection.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  if (!laborItems || laborItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("materials:laborSection.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-base font-medium">
              {t("materials:laborSection.prompt")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("materials:laborSection.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDuplicateTemplate} disabled={isDuplicating}>
              {isDuplicating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDuplicating
                ? t("materials:laborSection.importing")
                : t("materials:laborSection.import")}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/labor/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("materials:laborSection.empty")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("materials:laborSearchPlaceholder", { defaultValue: "Search labor items..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/labor/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          {t("common.edit")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allExpanded = groupedLabor.every(group => isGroupExpanded(group.name));
            if (allExpanded) {
              collapseAll();
            } else {
              expandAll();
            }
          }}
          className="flex items-center gap-2"
        >
          {groupedLabor.every(group => isGroupExpanded(group.name)) ? (
            <>
              <ChevronsUp className="h-4 w-4" />
              {t("common.collapseAll")}
            </>
          ) : (
            <>
              <ChevronsDown className="h-4 w-4" />
              {t("common.expandAll")}
            </>
          )}
        </Button>
      </div>

      <div className="space-y-8">
        {groupedLabor.map(group => (
          <Card key={group.name} className="overflow-hidden border-none shadow-none">
            <CardHeader className="bg-muted/50 py-3 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => toggleGroup(group.name)}
                >
                  {isGroupExpanded(group.name) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <CardTitle className="text-lg font-semibold text-primary">
                  {group.name}
                </CardTitle>
                <span className="text-xs px-2 py-0.5 bg-background border rounded-full text-muted-foreground">
                  {group.items.length} {t("materials:totalItems")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">{t("materials:table.totalValue")}:</span>
                <span className="font-bold font-mono">{formatCurrencyValue(group.total)}</span>
              </div>
            </CardHeader>
            {isGroupExpanded(group.name) && (
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={group.items}
                  enablePagination={false}
                  enableFiltering={false}
                  enableColumnVisibility={false}
                  enableSorting={true}
                  className="border-0 rounded-none"
                />
              </CardContent>
            )}
          </Card>
        ))}
        {groupedLabor.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            {t("materials:noResults")}
          </div>
        )}
      </div>
    </div>
  );
};
