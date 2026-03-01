import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency } from "@/utils/formatters";
import { Pencil, Eye, Sparkles } from "lucide-react";
import { useConfigDropdown } from "@/hooks/useConfigDropdown";
import { useSeedDataStatus } from "@/hooks/useSeedDataStatus";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";
import { ProjectScheduleStatusBadge } from "@/components/Projects/ProjectScheduleStatusBadge";
// import {
//   ConstructionUnit,
//   getConstructionUnitSymbol,
// } from "@/constants/constructionUnits";

interface Project {
  id: string;
  name: string;
  client_name?: string;
  city?: string;
  total_area?: number;
  budget_total?: number;
  description?: string;
  status: string;
  schedule_status?: string | null;
  avg_progress?: number;
  budget_used_percentage?: number;
  // construction_unit?: ConstructionUnit | null;
}

interface ProjectTableViewProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onView?: (project: Project) => void;
  getProjectTypeLabel: (typeKey: string | null | undefined) => string;
  isDemoProject: (id: string) => boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableFiltering?: boolean;
  pageSize?: number;
  onRowClick?: (project: Project) => void;
}

export const ProjectTableView = ({ projects, onEdit, onView, getProjectTypeLabel, isDemoProject, enableRowSelection, enableColumnVisibility, enableFiltering, pageSize, onRowClick }: ProjectTableViewProps) => {
  const navigate = useNavigate();
  const { t, currency, dateFormat } = useLocalization();
  const { values: projectTypeOptions } = useConfigDropdown('project_types');
  const { data: seedIds } = useSeedDataStatus();

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">{t('projects:projectName')}</TableHead>
            <TableHead className="w-32">{t('projects:client')}</TableHead>
            <TableHead className="w-24">{t('projects:type.label')}</TableHead>
            <TableHead className="w-28">{t('projects:cityLabel')}</TableHead>
            <TableHead className="text-right w-20">{t('projects:area')}</TableHead>
            <TableHead className="text-right w-24">{t('projects:budget')}</TableHead>
            <TableHead className="w-24">{t('projects:status')}</TableHead>
            <TableHead className="text-right w-32">{t('projects:actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, index) => (
            <TableRow key={project.id} className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-blue-50' : ''}`}>
              <TableCell className="font-medium w-40">{project.name}</TableCell>
              <TableCell className="w-32">{project.client_name || '-'}</TableCell>
              <TableCell className="w-24">
                {(project as any).type ? (
                  <Badge variant="outline" className="text-primary border-primary">
                    {getProjectTypeLabel((project as any).type)}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="w-28">{project.city || '-'}</TableCell>
              <TableCell className="text-right w-20">
                {project.total_area
                  ? `${project.total_area} m²` /* ${getConstructionUnitSymbol(project.construction_unit)} */
                  : '-'}
              </TableCell>
              <TableCell className="text-right w-24">
                {project.budget_total ? formatCurrency(Number(project.budget_total), currency) : '-'}
              </TableCell>
              <TableCell className="w-24">
                <ProjectScheduleStatusBadge status={getProjectScheduleStatus(project)} />
              </TableCell>
              <TableCell className="text-right w-32">
                <div className="flex gap-2 justify-end">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(project)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t('projects:viewDetails')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
