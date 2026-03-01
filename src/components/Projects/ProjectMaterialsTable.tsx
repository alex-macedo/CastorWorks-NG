import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertCircle, Search, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type ProjectMaterial = Database["public"]["Tables"]["project_materials"]["Row"];

interface ProjectMaterialsTableProps {
  projectId: string;
}

export const ProjectMaterialsTable = ({ projectId }: ProjectMaterialsTableProps) => {
  const { t, currency, language } = useLocalization();
  const { materials, isLoading } = useProjectMaterials(projectId);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Initialize expanded groups based on materials
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (materials.length > 0) {
      const allCollapsed: Record<string, boolean> = {};
      const uniqueGroups = new Set(materials.map(m => m.group_name));
      uniqueGroups.forEach(group => {
        allCollapsed[group] = false;
      });
      return allCollapsed;
    }
    return {};
  });
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<ProjectMaterial>[]>(
    () => [
      {
        accessorKey: "group_name",
        header: t("materials:groupName"),
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("group_name")}</div>
        ),
      },
      {
        accessorKey: "description",
        header: t("materials:description"),
        cell: ({ row }) => (
          <div className="max-w-[300px]">
            <div className="font-medium">{row.getValue("description")}</div>
            {row.original.sinapi_code && (
              <div className="text-xs text-muted-foreground">
                SINAPI: {row.original.sinapi_code}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: t("materials:quantity"),
        cell: ({ row }) => (
          <div className="text-right font-mono">
            {Number(row.getValue("quantity")).toLocaleString(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      },
      {
        accessorKey: "unit",
        header: t("materials:unit"),
        cell: ({ row }) => (
          <div className="text-center">{row.getValue("unit") || "-"}</div>
        ),
      },
      {
        accessorKey: "factor",
        header: t("materials:factor"),
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm text-muted-foreground">
            {Number(row.getValue("factor")).toLocaleString(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      },
      {
        accessorKey: "tgfa_applicable",
        header: t("materials:tgfaApplicable"),
        cell: ({ row }) => {
          const applicable = row.getValue("tgfa_applicable");
          return (
            <div className="text-center">
              {applicable ? (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {t("common.yes")}
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {t("common.no")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "price_per_unit",
        header: t("materials:unitPrice"),
        cell: ({ row }) => {
          const price = Number(row.getValue("price_per_unit"));
          return (
            <div className="text-right font-mono">
              {new Intl.NumberFormat(language, {
                style: "currency",
                currency: currency || "BRL",
              }).format(price)}
            </div>
          );
        },
      },
      {
        accessorKey: "total",
        header: t("materials:total"),
        cell: ({ row }) => {
          const total = Number(row.getValue("total") || 0);
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
    ],
    [t, currency, language]
  );

  // Filter materials based on search query
  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    const lowerQuery = searchQuery.toLowerCase();
    return materials.filter(m => 
      m.description.toLowerCase().includes(lowerQuery) || 
      m.group_name.toLowerCase().includes(lowerQuery) ||
      m.sinapi_code?.toLowerCase().includes(lowerQuery)
    );
  }, [materials, searchQuery]);

  // Group materials by group_name
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, { items: ProjectMaterial[], total: number }> = {};
    
    // Calculate total of all materials EXCEPT "Custo Total Estimado"
    const grandTotal = filteredMaterials
      .filter(material => material.group_name !== "Custo Total Estimado")
      .reduce((sum, material) => sum + Number(material.total || 0), 0);
    
    filteredMaterials.forEach(material => {
      const groupName = material.group_name;
      if (!groups[groupName]) {
        groups[groupName] = { items: [], total: 0 };
      }
      groups[groupName].items.push(material);
      groups[groupName].total += (material.total || 0);
    });

    // Sort groups alphabetically, but put "Custo Total Estimado" first
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === "Custo Total Estimado") return -1;
        if (b === "Custo Total Estimado") return 1;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      })
      .map(([name, data]) => ({
        name,
        items: data.items,
        // For "Custo Total Estimado", show grand total of all OTHER items
        total: name === "Custo Total Estimado" ? grandTotal : data.total
      }));
  }, [filteredMaterials]);

  // Calculate totals
  const summary = useMemo(() => {
    const totalCost = filteredMaterials.reduce(
      (sum, material) => sum + Number(material.total || 0),
      0
    );
    const itemCount = filteredMaterials.length;
    const groupCount = new Set(filteredMaterials.map((m) => m.group_name)).size;

    return { totalCost, itemCount, groupCount };
  }, [filteredMaterials]);

  // Render currency formatter
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  };

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Check if a group is expanded (default to true)
  const isGroupExpanded = (groupName: string) => {
    return expandedGroups[groupName] !== false;
  };

  // Expand all groups
  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    groupedMaterials.forEach(group => {
      allExpanded[group.name] = true;
    });
    setExpandedGroups(allExpanded);
  };

  // Collapse all groups
  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedMaterials.forEach(group => {
      allCollapsed[group.name] = false;
    });
    setExpandedGroups(allCollapsed);
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

  if (!materials || materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("projectDetail.materialsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("materials:noMaterials")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Search */}
      <div className="flex items-center space-x-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("materials:searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/materials/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          {t("common.edit")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allExpanded = groupedMaterials.every(group => isGroupExpanded(group.name));
            if (allExpanded) {
              collapseAll();
            } else {
              expandAll();
            }
          }}
          className="flex items-center gap-2"
        >
          {groupedMaterials.every(group => isGroupExpanded(group.name)) ? (
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

      {/* Grouped Tables */}
      <div className="space-y-8">
        {groupedMaterials.map((group) => (
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
                  {group.items.length} items
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">{t("materials:total")}:</span>
                <span className="font-bold font-mono">{formatCurrency(group.total)}</span>
              </div>
            </CardHeader>
            {isGroupExpanded(group.name) && (
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={group.items}
                  enablePagination={false}
                  enableFiltering={false} // We handle filtering globally
                  enableColumnVisibility={false}
                  enableSorting={true}
                  className="border-0 rounded-none"
                />
              </CardContent>
            )}
          </Card>
        ))}
        {groupedMaterials.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            {t("materials:noResults")}
          </div>
        )}
      </div>
    </div>
  );
};
