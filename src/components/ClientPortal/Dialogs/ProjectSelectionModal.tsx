import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderIcon, CalendarIcon, Search } from 'lucide-react';
import { useClientAccessibleProjects } from '@/hooks/clientPortal/useClientAccessibleProjects';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';
import { getScheduleStatusTranslationKey } from '@/utils/badgeVariants';
import type { Project } from '@/components/Reports/viewers/types';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSelectionModal({ isOpen, onClose }: ProjectSelectionModalProps) {
  const navigate = useNavigate();
  const { t, dateFormat } = useLocalization();
  const { data: projects = [], isLoading } = useClientAccessibleProjects();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase().trim();
    return projects.filter(project => 
      project.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const handleProjectSelect = (project: Project) => {
    navigate(`/portal/${project.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            {t('clientPortal.documents.selectProject')}
          </DialogTitle>
          <DialogDescription>
            {t('clientPortal.documents.selectProjectDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('clientPortal.documents.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FolderIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium">
                {searchQuery 
                  ? t('common.noResults') || "No projects match your search"
                  : t('clientPortal.documents.noProjects')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? t('common.tryDifferentSearch') || "Try a different search term"
                  : t('clientPortal.documents.noProjectsDescription')}
              </p>
              {searchQuery && (
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  {t('common.clearSearch') || "Clear search"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredProjects.map((project) => {
                const scheduleStatus = getProjectScheduleStatus(project as any)
                return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full"
                  onClick={() => handleProjectSelect(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{project.name}</CardTitle>
                      <Badge variant={scheduleStatus === 'on_schedule' ? 'default' : 'secondary'} className="shrink-0">
                        {t(getScheduleStatusTranslationKey(scheduleStatus))}
                      </Badge>
                    </div>
                     <CardDescription className="flex items-center gap-1 text-xs">
                       <CalendarIcon className="h-3 w-3" />
                       {formatDate(new Date(project.created_at), dateFormat)}
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectSelect(project);
                      }}
                    >
                      {t('clientPortal.documents.viewDocuments')}
                    </Button>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
