import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/components/ClientPortal/Chat/ChatInterface';
import { useAppProject } from '@/contexts/AppProjectContext';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * TeamChat Page
 * 
 * Provides team chat interface for internal team communication.
 * Reuses the ClientPortal ChatInterface component but with main app project context.
 */
export default function TeamChat() {
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
            <h1 className="text-2xl font-bold">{t('navigation.teamChat')}</h1>
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
            <h1 className="text-2xl font-bold">{t('navigation.teamChat')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('common.loading')}</p>
          </div>
        </SidebarHeaderShell>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a project to view team chat.
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
              <MessageCircle className="h-6 w-6" />
              {t('navigation.teamChat')}
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

      <Card className="h-[calc(90vh-12rem)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {t('clientPortal.chat.title', { projectName: selectedProject.name, name: selectedProject.name })}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)] p-0">
          <div className="h-full">
            <ChatInterface mode="app" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
