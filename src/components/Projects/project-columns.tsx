"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/formatters";
import type { Database } from "@/integrations/supabase/types";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";
import { ProjectScheduleStatusBadge } from "@/components/Projects/ProjectScheduleStatusBadge";

type Project = Database['public']['Tables']['projects']['Row'] & {
  avg_progress?: number;
  budget_used_percentage?: number;
  total_spent?: number;
};

interface ProjectColumnsProps {
  t: (key: string) => string;
  currency: string;
  onEdit?: (project: Project) => void;
  canEditProject?: (project: Project) => boolean;
  onView?: (project: Project) => void;
  getProjectTypeLabel: (type: string | null | undefined) => string;
  isDemoProject: (projectId: string) => boolean;
}

export function createProjectColumns({
  t,
  currency,
  onEdit,
  onView,
  getProjectTypeLabel,
  isDemoProject,
  enableRowSelection = false,
  canEditProject,
}: ProjectColumnsProps & { enableRowSelection?: boolean; canEditProject?: (project: Project) => boolean }): ColumnDef<Project>[] {
  const columns: ColumnDef<Project>[] = [];
  
  if (enableRowSelection) {
    columns.push({
      id: "select",
      enableHiding: false,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    });
  }
  
  return [
    ...columns,
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:projectName')} />
      ),
      cell: ({ row }) => (
        <div className="font-medium text-sm py-1">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "clients.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:client')} />
      ),
      cell: ({ row }) => {
        const clients = row.original.clients as any;
        return <div className="text-sm py-1">{clients?.name || row.original.client_name || "-"}</div>;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:type.label')} />
      ),
      cell: ({ row }) => {
        const type = row.original.type;
        if (!type) return <div className="text-sm py-1">-</div>;
        return (
          <Badge variant="outline" className="text-primary border-primary text-xs py-0 px-2 h-5">
            {getProjectTypeLabel(type)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.type);
      },
    },
    {
      accessorKey: "city",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:cityLabel')} />
      ),
      cell: ({ row }) => <div className="text-sm py-1">{row.original.city || "-"}</div>,
    },
    {
      accessorKey: "total_gross_floor_area",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:area')} className="text-right" />
      ),
      cell: ({ row }) => {
        const area = row.original.total_gross_floor_area;
        return (
          <div className="text-right text-sm py-1">
            {area ? `${area} m²` : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "budget_total",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:budget')} className="text-right" />
      ),
      cell: ({ row }) => {
        const budget = row.original.budget_total;
        return (
          <div className="text-right text-sm py-1">
            {budget ? formatCurrency(Number(budget), currency as any) : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('projects:projectStatusLabel')} />
      ),
      cell: ({ row }) => {
        const project = row.original;
        const scheduleStatus = getProjectScheduleStatus(project as any)
        return (
          <div className="flex gap-1">
            {isDemoProject(project.id) && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-0 px-1 h-4">
                <Sparkles className="h-2 w-2 mr-1" />
                Demo
              </Badge>
            )}
            <ProjectScheduleStatusBadge
              status={scheduleStatus}
              className="gap-1"
              statusBadgeClassName="text-xs py-0 px-2 h-5"
              timezoneBadgeClassName="text-[9px] px-1.5 h-5"
            />
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(getProjectScheduleStatus(row.original as any));
      },
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex gap-1 justify-end py-1" onClick={(e) => e.stopPropagation()}>
            {onEdit && canEditProject?.(project) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(project)}
                title={t('projects:editProject')}
                className="h-6 w-6 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(project)}
                title={t('projects:viewDetails')}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
