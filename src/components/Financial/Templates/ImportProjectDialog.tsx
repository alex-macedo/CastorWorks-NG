import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Building2, Calendar, BadgeCheck, Download } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjects } from '@/hooks/useProjects';
import { Badge } from '@/components/ui/badge';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { ProjectScheduleStatusBadge } from '@/components/Projects/ProjectScheduleStatusBadge';

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelect: (project: any) => void;
}

export function ImportProjectDialog({ open, onOpenChange, onProjectSelect }: ImportProjectDialogProps) {
  const { t } = useLocalization();
  const { projects = [], isLoading: projectsLoading } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = (projects || []).filter(project => {
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );

  const getProjectTypeLabel = (type?: string) => {
    if (!type) return '';
    return type === 'residential'
      ? t('projects:type.residential', 'Residential')
      : type === 'commercial'
        ? t('projects:type.commercial', 'Commercial')
        : t('projects:type.other', 'Other');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('templates.selectProject', 'Select Project')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            {t('templates.selectProjectDescription', 'Choose a project to import materials and labor from')}
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search', 'Search projects...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {projectsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('common.loading', 'Loading...')}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>
                {searchQuery
                  ? t('templates.noProjectsMatch', 'No projects match your search')
                  : t('templates.noProjects', 'No projects available')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onProjectSelect(project)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <ProjectScheduleStatusBadge status={getProjectScheduleStatus(project as any)} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {project.client_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {project.client_name}
                        </span>
                      )}
                      {project.type && (
                        <Badge variant="outline" className="font-normal">
                          {getProjectTypeLabel(project.type)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">
                    <BadgeCheck className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
