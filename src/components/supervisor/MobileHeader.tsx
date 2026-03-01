import { useEffect } from "react";
import { RefreshCw, Globe, Moon, Sun, LogOut, CloudOff, Bell, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import castorworksLogo from '@/assets/castorworks-logo.png';
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTheme } from "next-themes";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSupervisorNotifications } from "@/hooks/useSupervisorNotifications";
import { useCriticalNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";

interface MobileHeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
  title?: string;
}

export function MobileHeader({
  onRefresh,
  refreshing,
  title,
}: MobileHeaderProps) {
  const { projects, selectedProject, setSelectedProject, loading } = useSupervisorProject();
  const { t, language, setLanguage } = useLocalization();
  const { theme, setTheme } = useTheme();
  const { data: userProfile } = useUserProfile();
  const { data: userRoles } = useUserRoles();
  const { data: notifications } = useSupervisorNotifications();
  const { criticalCount } = useCriticalNotificationAlerts();
  const { queueCount } = useOfflineQueue();
  const navigate = useNavigate();

  const pageLabel = title || t("supervisor.hub");
  const selectedProjectName =
    projects.find((project) => project.id === selectedProject)?.name ||
    (loading
      ? t("supervisor.loadingProjects") || "Loading..."
      : projects.length === 0
      ? t("supervisor.noProjects") || "No projects"
      : t("supervisor.selectProject") || "Select Project");

  useEffect(() => {
    if (theme !== 'dark') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear all storage to prevent session persistence
      localStorage.clear();
      sessionStorage.clear();
      
      // Full page reload to ensure complete cleanup
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear and redirect even if sign-out fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: t("supervisor.roles.admin"),
      project_manager: t("supervisor.roles.projectManager"),
      site_supervisor: t("supervisor.roles.siteSupervisor"),
      viewer: t("supervisor.roles.viewer"),
      admin_office: t("supervisor.roles.adminOffice"),
      client: t("supervisor.roles.client"),
      accountant: t("supervisor.roles.accountant"),
    };
    return roleMap[role] || role;
  };

  const languageFlags: Record<string, string> = {
    'en-US': '🇺🇸',
    'pt-BR': '🇧🇷',
    'es-ES': '🇪🇸',
    'fr-FR': '🇫🇷'
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/95 text-white backdrop-blur-xl" aria-label={pageLabel}>
      <div className="px-2 py-3 space-y-3">
        {/* Top Row */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0">
            <img src={castorworksLogo} alt={t("images.castorworks")} className="h-11 w-11 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-tight">
                CastorWorks
              </span>
              <span className="text-base font-bold leading-tight truncate">
                {userProfile?.display_name || t("supervisor.guest")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Offline Queue Indicator */}
            {queueCount > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 rounded-xl border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/20"
                  title={t("supervisor.pendingSync", { count: queueCount })}
                >
                  <CloudOff className="h-4 w-4 text-orange-500" />
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 bg-orange-500 text-white hover:bg-orange-600 border-0"
                  >
                    {queueCount > 99 ? '99+' : queueCount}
                  </Badge>
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-10 w-10 rounded-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white shrink-0"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 w-11 relative rounded-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white shrink-0 p-0 overflow-hidden"
                >
                  <Avatar className="size-11 border-2 border-amber-400/40">
                    <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || 'User'} />
                    <AvatarFallback className="bg-amber-500 text-black font-bold text-xs">
                      {(userProfile?.display_name || 'CW').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {notifications && notifications.total > 0 && (
                    <Badge
                      variant={criticalCount > 0 ? "destructive" : "default"}
                      className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ${
                        criticalCount > 0 ? "animate-pulse" : ""
                      }`}
                    >
                      {notifications.total > 9 ? '9+' : notifications.total}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.display_name || t("supervisor.guest")}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs text-muted-foreground">{t("supervisor.role")}</p>
                    <p className="text-sm">
                      {userRoles && userRoles.length > 0
                        ? getRoleLabel(userRoles[0].role)
                        : t("supervisor.noRole")}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Language Selector */}
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground mb-2">{t("supervisor.language")}</p>
                  <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="text-lg">{languageFlags[language]}</span>
                          <span className="text-sm">
                            {language === 'en-US' && 'English'}
                            {language === 'pt-BR' && 'Português'}
                            {language === 'es-ES' && 'Español'}
                            {language === 'fr-FR' && 'Français'}
                          </span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background z-[100]">
                      <SelectItem value="en-US">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{languageFlags['en-US']}</span>
                          <span>{t("ui.english")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pt-BR">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{languageFlags['pt-BR']}</span>
                          <span>Português</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="es-ES">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{languageFlags['es-ES']}</span>
                          <span>Español</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="fr-FR">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{languageFlags['fr-FR']}</span>
                          <span>Français</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </DropdownMenuLabel>
                
                {/* Theme Toggle */}
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground mb-2">{t("supervisor.theme")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full h-10 justify-start gap-2"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>{t("supervisor.lightMode")}</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>{t("supervisor.darkMode")}</span>
                      </>
                    )}
                  </Button>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("supervisor.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project Selector Row */}
        <div className="relative">
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
            disabled={loading || projects.length === 0}
          >
            <SelectTrigger className="h-[58px] rounded-2xl border border-amber-400/35 bg-[#14263c] w-full pl-3 pr-14 text-white hover:bg-[#1b334f] disabled:opacity-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl border border-amber-400/30 bg-amber-400/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-[15px] leading-tight font-semibold">
                    {selectedProjectName}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {projects.length} {projects.length === 1 ? 'project available' : 'projects available'}
                  </p>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#10161d] text-white">
              {loading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {t("supervisor.loadingProjects") || "Loading projects..."}
                </div>
              ) : projects.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {t("supervisor.noProjects") || "No projects available"}
                </div>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="max-w-full">
                    <div className="truncate w-full" title={project.name}>
                      {project.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <button
            onClick={() => navigate('/notifications')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-[#121619] border border-white/10 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            <Bell className="h-5 w-5 text-amber-400" />
            {(criticalCount > 0 || (notifications?.total || 0) > 0) && (
              <span className="absolute top-2 right-2 size-2.5 bg-amber-400 rounded-full border-2 border-[#121619] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
