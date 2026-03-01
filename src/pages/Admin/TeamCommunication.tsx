import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunicationLog } from '@/components/ClientPortal/Communication/CommunicationLog';
import { useAppProject } from '@/contexts/AppProjectContext';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { useLocalization } from '@/contexts/LocalizationContext';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * TeamCommunication Page
 * 
 * Provides team communication log for internal team collaboration.
 * Reuses the ClientPortal CommunicationLog component but with main app project context.
 */
export default function TeamCommunication() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { selectedProject, setSelectedProject, projects, isLoading } = useAppProject();

  // Redirect to projects if no project selected
  useEffect(() => {
    if (!isLoading && !selectedProject) {
      navigate('/projects');
    }
  }, [selectedProject, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <SidebarHeaderShell>
          <div>
            <h1 className="text-2xl font-bold">{t('navigation.teamCommunication')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('common.loading')}</p>
          </div>
        </SidebarHeaderShell>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex-1 space-y-6">
        <SidebarHeaderShell>
          <div>
            <h1 className="text-2xl font-bold">{t('navigation.teamCommunication')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('common.loading')}</p>
          </div>
        </SidebarHeaderShell>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a project to view communication log.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {t('navigation.teamCommunication')}
            </h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {selectedProject.name}
            </p>
          </div>
          {projects.length > 1 && (
            <div className="flex-shrink-0 min-w-[200px]">
              <Select
                value={selectedProject.id}
                onValueChange={(id) => {
                  const p = projects.find((x) => x.id === id);
                  if (p) setSelectedProject(p);
                }}
              >
                <SelectTrigger className="min-w-[200px] bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold focus:ring-2 focus:ring-white/30 focus:ring-offset-0 focus:ring-offset-transparent">
                  <SelectValue placeholder={t('common.noProject', 'Select project')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SidebarHeaderShell>

      <div className="h-[calc(100vh-12rem)]">
        <CommunicationLog mode="app" />
      </div>
    </div>
  );
}
