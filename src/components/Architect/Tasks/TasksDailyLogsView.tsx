import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';
import { formatDate } from '@/utils/reportFormatters';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { useDailyLogs } from '@/hooks/useDailyLogs';

interface TasksDailyLogsViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
  projectId?: string;
}

export const TasksDailyLogsView = ({ tasks, onTaskEdit, projectId }: TasksDailyLogsViewProps) => {
  const { t, dateFormat } = useLocalization();
  const { projects } = useProjects();
  const { dailyLogs = [], isLoading } = useDailyLogs(projectId);

  const columns: ColumnDef<typeof dailyLogs[0]>[] = useMemo(
    () => {
      const formatDateLocalized = (dateString: string) => {
        try {
          return formatDate(dateString);
        } catch {
          return dateString;
        }
      };

      const getProjectName = (projectId: string) => {
        const project = projects?.find((p) => p.id === projectId);
        return project?.name || projectId;
      };

      return [
        {
          accessorKey: 'log_date',
          header: t('architect.tasks.dailyLogs.date'),
          cell: ({ row }) => formatDateLocalized(row.original.log_date),
        },
        {
          accessorKey: 'project_id',
          header: t('architect.tasks.project'),
          cell: ({ row }) => getProjectName(row.original.project_id),
        },
      {
        accessorKey: 'weather',
          header: t('architect.tasks.dailyLogs.weather'),
          cell: ({ row }) => {
            const weather = row.original.weather;
            return weather ? (
              <Badge variant="outline">
                {t(`architect.tasks.dailyLogs.weatherOptions.${weather}`)}
              </Badge>
            ) : (
              '-'
            );
          },
        },
        {
          accessorKey: 'tasks_completed',
          header: t('architect.tasks.dailyLogs.tasksCompleted'),
          cell: ({ row }) => row.original.tasks_completed || '-',
        },
      {
        accessorKey: 'workers_count',
        header: t('architect.tasks.dailyLogs.workers'),
        cell: ({ row }) => row.original.workers_count || '-',
      },
      {
        accessorKey: 'equipment_used',
        header: t('architect.tasks.dailyLogs.equipment'),
        cell: ({ row }) => row.original.equipment_used || '-',
      },
      {
        accessorKey: 'materials_delivered',
        header: t('architect.tasks.dailyLogs.materials'),
        cell: ({ row }) => row.original.materials_delivered || '-',
      },
      {
        accessorKey: 'issues',
        header: t('architect.tasks.dailyLogs.issues'),
        cell: ({ row }) => {
          const issues = row.original.issues;
          return issues ? (
            <span className="text-destructive text-sm">{issues}</span>
          ) : (
            '-'
          );
        },
      },
      ];
    },
    [t, projects]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('architect.tasks.viewModes.dailyLogs')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('architect.tasks.dailyLogsDescription')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('architect.tasks.viewModes.dailyLogs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLogs.length > 0 ? (
            <DataTable
              columns={columns}
              data={dailyLogs}
              enablePagination={true}
              enableSorting={true}
              enableFiltering={true}
              pageSize={10}
              searchPlaceholder={t('architect.tasks.searchDailyLogs')}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('architect.tasks.dailyLogs.noLogs')}
              <p className="text-sm mt-2">{t('architect.tasks.dailyLogs.selectProject')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
