import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, DollarSign, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Database } from '@/integrations/supabase/types';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { getScheduleStatusTranslationKey, getStatusBadgeVariant } from '@/utils/badgeVariants';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectsStatusTableProps {
  projects: Project[];
  budgetAnalysis: Map<string, { spent: number; budget: number }>;
}

export function ProjectsStatusTable({ projects, budgetAnalysis }: ProjectsStatusTableProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();

  const getBudgetStatus = (project: Project) => {
    const analysis = budgetAnalysis.get(project.id);
    if (!analysis || analysis.budget === 0) return { label: t('overallStatus.noBudget'), variant: 'secondary' as const };
    
    const percentUsed = (analysis.spent / analysis.budget) * 100;
    if (percentUsed < 90) return { label: t('overallStatus.onBudget'), variant: 'default' as const };
    if (percentUsed < 100) return { label: t('overallStatus.nearLimit'), variant: 'secondary' as const };
    return { label: t('overallStatus.overBudget'), variant: 'destructive' as const };
  };

  const getScheduleStatus = (project: Project) => {
    const scheduleStatus = getProjectScheduleStatus(project as any);
    return {
      label: t(getScheduleStatusTranslationKey(scheduleStatus)),
      variant: getStatusBadgeVariant(scheduleStatus),
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overallStatus.projectsStatus')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('overallStatus.projectName')}</TableHead>
              <TableHead className="w-32">{t('overallStatus.client')}</TableHead>
              <TableHead className="w-16">{t('overallStatus.progress')}</TableHead>
              <TableHead className="w-24">{t('overallStatus.budgetStatusColumn')}</TableHead>
              <TableHead className="w-24">{t('overallStatus.scheduleStatus')}</TableHead>
              <TableHead className="w-[70px]">{t('overallStatus.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('overallStatus.noProjectsAvailable')}
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project, index) => {
                const budgetStatus = getBudgetStatus(project);
                const scheduleStatus = getScheduleStatus(project);
                const progress = Number((project as any).avg_progress || 0);
                
                return (
                  <TableRow key={project.id} className={`group transition-all border-b ${index % 2 === 0 ? 'bg-blue-50' : ''}`}>
                    <TableCell className="font-medium w-40">
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="hover:underline text-left"
                      >
                        {project.name || t('overallStatus.unnamedProject')}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground w-32">
                      {project.client_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="w-24">
                      <Badge variant={budgetStatus.variant}>
                        {budgetStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-24">
                      <Badge variant={scheduleStatus.variant}>
                        {scheduleStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[70px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/financial?project=${project.id}`)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Add Expense
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/schedule/${project.id}`)}>
                            <Calendar className="mr-2 h-4 w-4" />
                            View Schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
