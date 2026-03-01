import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Bell, LogOut, HardHat, Settings as SettingsIcon, MessageSquare, User, Lock, RotateCw, Bot, Bug } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Skeleton } from "@/components/ui/skeleton";
import { PrefetchLink } from "@/components/Navigation/PrefetchLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AvatarProgressive } from "@/components/ui/avatar-progressive";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';
import { toast } from "sonner";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getStoredClientPortalToken } from "@/lib/clientPortalAuth";
import { SIDEBAR_OPTIONS } from "@/constants/rolePermissions";
import { useSidebarPermissions } from "@/hooks/useSidebarPermissions";
import { useLicensedModules } from "@/hooks/useLicensedModules";
import { ChatWidget } from "@/components/AIChat/ChatWidget";
import { EditProfileDialog } from "@/components/Settings/EditProfileDialog";
import { ProjectSelectionModal } from "@/components/ClientPortal/Dialogs/ProjectSelectionModal";
import { useQueryClient } from "@tanstack/react-query";
import { useTaxProject } from "@/features/tax/hooks/useTaxProject";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBugRecorder } from "@/contexts/BugRecorderContext";

type PortalModalConfig = {
  id: "mobile-app" | "supervisor";
  title: string;
  path: string;
};

type DevicePreset = {
  id: string;
  label: string;
  width?: number;
  height?: number;
};

type PortalViewport = {
  deviceId: string;
  rotate: boolean;
};

const DEVICE_PRESETS: DevicePreset[] = [
  { id: "responsive", label: "Responsive" },
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-xr", label: "iPhone XR", width: 414, height: 896 },
  { id: "iphone-12-pro", label: "iPhone 12 Pro", width: 390, height: 844 },
  { id: "iphone-14-pro-max", label: "iPhone 14 Pro Max", width: 430, height: 932 },
  { id: "pixel-7", label: "Pixel 7", width: 412, height: 915 },
  { id: "galaxy-s20-ultra", label: "Samsung Galaxy S20 Ultra", width: 412, height: 915 },
  { id: "ipad-mini", label: "iPad Mini", width: 768, height: 1024 },
  { id: "ipad-air", label: "iPad Air", width: 820, height: 1180 },
  { id: "ipad-pro", label: "iPad Pro", width: 1024, height: 1366 },
];

const TAB_PERMISSION_ALIASES: Record<string, string[]> = {
  'projects.projects-overview': ['projects.project-schedule'],
  'architect.architect-projects-overview': ['architect.architect-schedule'],
}

const getRoleAvatarColor = (role: string) => {
  if (role === 'admin') return 'bg-red-500';
  if (role === 'project_manager') return 'bg-blue-500';
  if (role === 'client') return 'bg-green-500';
  return 'bg-primary';
};

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: rolesData, isLoading: rolesLoading } = useUserRoles();
  const roles = useMemo(() => rolesData?.map(r => r.role) || [], [rolesData]);
  const { settings: companySettings } = useCompanySettings();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const { setOpen: setBugRecorderOpen } = useBugRecorder();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [pendingPortalModal, setPendingPortalModal] = useState<PortalModalConfig | null>(null);
  const [portalModal, setPortalModal] = useState<PortalModalConfig | null>(null);
  const [portalViewport, setPortalViewport] = useState<PortalViewport>({
    deviceId: "responsive",
    rotate: false,
  });
  const [isPortalModalMinimized, setIsPortalModalMinimized] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("responsive");
  const [rotateDevice, setRotateDevice] = useState(false);

  // Load collapsed state from localStorage
  const getStoredCollapsedState = (key: string, defaultValue: boolean = false): boolean => {
    try {
      const stored = localStorage.getItem(`sidebar-collapsed-${key}`);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Save collapsed state to localStorage
  const saveCollapsedState = (key: string, value: boolean) => {
    try {
      localStorage.setItem(`sidebar-collapsed-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  };

  // State for platform group collapse - default to true (expanded) so navigation is visible
  const [isPlatformOpen, setIsPlatformOpen] = useState(() => 
    getStoredCollapsedState('platform', true)
  );

  // State for individual sidebar options collapse - initialize from localStorage
  const [openOptions, setOpenOptions] = useState<Record<string, boolean>>(() => {
    // Initialize all collapsible options from localStorage
    const initialState: Record<string, boolean> = {};
    SIDEBAR_OPTIONS.forEach(option => {
      if (option.type === 'collapsible') {
        initialState[option.id] = getStoredCollapsedState(option.id, false);
      }
    });
    return initialState;
  });

  // Handle platform group toggle
  const handlePlatformToggle = (open: boolean) => {
    setIsPlatformOpen(open);
    saveCollapsedState('platform', open);
  };

  // Handle option toggle
  const handleOptionToggle = (optionId: string, open: boolean) => {
    setOpenOptions(prev => ({ ...prev, [optionId]: open }));
    saveCollapsedState(optionId, open);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("auth:signOutError"));
    } else {
      navigate("/login");
    }
  };

  useEffect(() => {
    const loadLogo = async () => {
      if (companySettings?.company_logo_url) {
        try {
          const url = await resolveStorageUrl(companySettings.company_logo_url);
          setLogoUrl(url);
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }
    };
    loadLogo();
  }, [companySettings?.company_logo_url]);

  const primaryRole = roles[0] || 'viewer';

  // Get sidebar permissions from database
  const { optionPermissions, tabPermissions, optionSortOrder, tabSortOrder, hasOptionAccess, hasTabAccess, hasTabPermissions, optionHasAnyTabPermissions, isLoading: isLoadingPermissions } = useSidebarPermissions();
  const { hasModule, isLoading: isLoadingModules } = useLicensedModules();

  // Ensure architect menu is expanded by default ONLY for architect users
  useEffect(() => {
    if (rolesLoading) return;

    const isArchitect = roles.includes('architect' as AppRole);

    setOpenOptions((prev) => {
      // Only apply role-based default if no user preference has been saved
      // This ensures architects get expanded by default, others get collapsed
      const hasUserPreference = localStorage.getItem('sidebar-collapsed-architect') !== null;
      const shouldBeOpen = hasUserPreference
        ? getStoredCollapsedState('architect', false)
        : isArchitect; // Default: expanded for architects, collapsed for others

      if (prev.architect === shouldBeOpen) return prev;
      return { ...prev, architect: shouldBeOpen };
    });
  }, [roles, rolesLoading]);

  // Detect current projectId from URL or session storage
  const urlMatch = location.pathname.match(/^\/portal\/([^/]+)/);
  const currentProjectId = urlMatch ? urlMatch[1] : getStoredClientPortalToken();
  const { taxProject } = useTaxProject(currentProjectId);
  const hasStrategy = taxProject?.has_strategy_service ?? false;

  const handleTabClick = (tabId: string, e: React.MouseEvent) => {
    if (tabId === 'client-portal-switch') {
      e.preventDefault();
      setIsProjectSwitcherOpen(true);
    }
  };

  const openPortalModal = (config: PortalModalConfig) => {
    // Ensure no previously opened portal modal remains mounted behind the selector
    setPortalModal(null);
    setIsPortalModalMinimized(false);
    setPendingPortalModal(config);
  };

  const launchPortalModalWithSelectedDimensions = () => {
    if (!pendingPortalModal) return;
    setPortalViewport({
      deviceId: selectedDeviceId,
      rotate: rotateDevice,
    });
    setPortalModal(pendingPortalModal);
    setPendingPortalModal(null);
    setIsPortalModalMinimized(false);
  };

  const activeDevice = DEVICE_PRESETS.find(d => d.id === portalViewport.deviceId) || DEVICE_PRESETS[0];
  const activeDeviceWidth = activeDevice.width && activeDevice.height
    ? (portalViewport.rotate ? activeDevice.height : activeDevice.width)
    : undefined;
  const activeDeviceHeight = activeDevice.width && activeDevice.height
    ? (portalViewport.rotate ? activeDevice.width : activeDevice.height)
    : undefined;
  const isAnyPortalLayerOpen = Boolean(pendingPortalModal || portalModal);

  useEffect(() => {
    if (!isAnyPortalLayerOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, [isAnyPortalLayerOpen]);

  // Compute visible options based on database permissions (with fallback to constants)
  const visibleOptions = useMemo(() => {
    const resolveTabSortOrder = (optionId: string, tabId: string): number | undefined => {
      const key = `${optionId}.${tabId}`
      const directOrder = tabSortOrder.get(key)
      if (directOrder !== undefined) return directOrder

      const aliases = TAB_PERMISSION_ALIASES[key] || []
      for (const alias of aliases) {
        const aliasOrder = tabSortOrder.get(alias)
        if (aliasOrder !== undefined) return aliasOrder
      }

      return undefined
    }

    const hasAliasedTabAccess = (optionId: string, tabId: string): boolean => {
      const key = `${optionId}.${tabId}`
      const aliases = TAB_PERMISSION_ALIASES[key] || []

      for (const alias of aliases) {
        const [aliasOptionId, aliasTabId] = alias.split('.')
        if (!aliasOptionId || !aliasTabId) continue
        if (hasTabPermissions(aliasOptionId, aliasTabId) && hasTabAccess(aliasOptionId, aliasTabId)) {
          return true
        }
      }

      return false
    }

    const useDatabasePermissions = !isLoadingPermissions;

    if (!useDatabasePermissions) {
      // Fallback to constants while loading
      return SIDEBAR_OPTIONS.filter(option => {
        const roleOk = !option.allowedRoles || option.allowedRoles.some(role => roles.includes(role as AppRole));
        if (!roleOk) return false;
        if (option.required_module) {
          if (isLoadingModules) return false;
          if (!hasModule(option.required_module)) return false;
        }
        return true;
      }).map(option => {
        if (option.id === 'client-portal' && currentProjectId) {
          return {
            ...option,
            tabs: option.tabs.map(tab => {
              if (tab.path.includes('/client-portal/section/')) {
                const section = tab.path.split('/section/')[1];
                return {
                  ...tab,
                  path: section === 'dashboard' ? `/portal/${currentProjectId}` : `/portal/${currentProjectId}/${section}`
                };
              }
              if (tab.path === '/client-portal/documents') {
                return {
                  ...tab,
                  path: `/portal/${currentProjectId}/documents`
                };
              }
              return tab;
            })
          };
        }
        return option;
      });
    }

    // Use database-only visibility when option is configured in Permission Management; otherwise fall back to constants
    // Module gating: hide options whose required_module is not licensed (when modules loaded); while loading, hide module-gated options
    const filtered = SIDEBAR_OPTIONS.filter(option => {
      const roleOk = (() => {
        const isConfiguredInDb = optionPermissions.has(option.id);
        if (isConfiguredInDb) return hasOptionAccess(option.id);
        return option.allowedRoles?.some(role => roles.includes(role as AppRole)) ?? false;
      })();
      if (!roleOk) return false;
      if (option.required_module) {
        if (isLoadingModules) return false;
        if (!hasModule(option.required_module)) return false;
      }
      return true;
    });

    // Sort the filtered options based on sort_order from database, fallback to original order
    const sorted = filtered.sort((a, b) => {
      const aOrder = optionSortOrder.get(a.id);
      const bOrder = optionSortOrder.get(b.id);
      
      // If both have sort orders, use them
      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }
      
      // If only one has a sort order, prioritize it
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      
      // Fallback to original order from SIDEBAR_OPTIONS
      const aIndex = SIDEBAR_OPTIONS.findIndex(opt => opt.id === a.id);
      const bIndex = SIDEBAR_OPTIONS.findIndex(opt => opt.id === b.id);
      return aIndex - bIndex;
    });

    return sorted.map(option => {
      // Filter tabs: when option has any tab-level permissions in DB, show only explicitly granted tabs; otherwise inherit from option
      const strictTabs = optionHasAnyTabPermissions(option.id);
      const filteredTabs = option.tabs.filter(tab => {
        const tabHasPermissions = hasTabPermissions(option.id, tab.id);
        if (tabHasPermissions) return hasTabAccess(option.id, tab.id) || hasAliasedTabAccess(option.id, tab.id);
        if (strictTabs) return hasAliasedTabAccess(option.id, tab.id);
        return true;
      });

      // Sort tabs based on sort_order from database, fallback to original order
      const sortedTabs = filteredTabs.sort((a, b) => {
        const aOrder = resolveTabSortOrder(option.id, a.id);
        const bOrder = resolveTabSortOrder(option.id, b.id);
        
        // If both have sort orders, use them
        if (aOrder !== undefined && bOrder !== undefined) {
          return aOrder - bOrder;
        }
        
        // If only one has a sort order, prioritize it
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        
        // Fallback to original order from option.tabs
        const aIndex = option.tabs.findIndex(tab => tab.id === a.id);
        const bIndex = option.tabs.findIndex(tab => tab.id === b.id);
        return aIndex - bIndex;
      });

      const processedOption = {
        ...option,
        tabs: sortedTabs.map(tab => {
          // Transform client portal paths
          if (option.id === 'client-portal' && currentProjectId) {
            if (tab.path.includes('/client-portal/section/')) {
              const section = tab.path.split('/section/')[1];
              return {
                ...tab,
                path: section === 'dashboard' ? `/portal/${currentProjectId}` : `/portal/${currentProjectId}/${section}`
              };
            }
            if (tab.path === '/client-portal/documents') {
              return {
                ...tab,
                path: `/portal/${currentProjectId}/documents`
              };
            }
          }
          return tab;
        })
      };

      return processedOption;
    });
  }, [roles, currentProjectId, optionPermissions, hasOptionAccess, hasTabAccess, hasTabPermissions, optionHasAnyTabPermissions, isLoadingPermissions, isLoadingModules, hasModule, optionSortOrder, tabSortOrder]);

  return (
    <>
      <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={t("images.companyLogo")} 
                    width={48}
                    height={48}
                    decoding="async"
                    loading="eager"
                    className="w-12 h-12 rounded-lg object-contain bg-white/5 p-1"
                  />
                ) : (
                  <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <HardHat className="size-6" />
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {companySettings?.company_name || t("navigation.companyFallback")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{t("navigation.enterpriseLabel")}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide">{/* Hide scrollbar */}
        {/* Platform Group - Hierarchical Navigation */}
        <Collapsible open={isPlatformOpen} onOpenChange={handlePlatformToggle} className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="group/label">
                {t("navigation.platform")}
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {(visibleOptions || []).map((option) =>
                    option.type === "link" ? (
                      <SidebarMenuItem key={option.id}>
                        {option.id === "mobile-app" || option.id === "supervisor" ? (
                          <SidebarMenuButton
                            onClick={() =>
                              openPortalModal({
                                id: option.id as "mobile-app" | "supervisor",
                                title: option.title || (option.titleKey ? t(option.titleKey) : ""),
                                path: option.path || "/",
                              })
                            }
                            className={cn(
                              portalModal?.id === option.id && !isPortalModalMinimized && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            )}
                          >
                            <option.icon />
                            <span>{option.title || (option.titleKey ? t(option.titleKey) : "")}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton asChild>
                            <PrefetchLink
                              to={option.path || "/"}
                              end={option.path === "/"}
                              className={({ isActive }) =>
                                cn(isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium")
                              }
                            >
                              <option.icon />
                              <span>{option.title || t(option.titleKey)}</span>
                            </PrefetchLink>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ) : (
                      <Collapsible 
                        key={option.id} 
                        open={openOptions[option.id] ?? false}
                        onOpenChange={(open) => handleOptionToggle(option.id, open)}
                        className={`group/${option.id}`}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full">
                              <option.icon />
                              <span>{option.title || t(option.titleKey)}</span>
                              <ChevronRight className={`ml-auto transition-transform duration-200 group-data-[state=open]/${option.id}:rotate-90`} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenu className="pl-4">
                              {option.tabs.map((tab) => (
                                  <SidebarMenuItem key={tab.id}>
                                    <SidebarMenuButton asChild onClick={(e) => handleTabClick(tab.id, e)}>
                                      <PrefetchLink
                                        to={tab.path}
                                        className={({ isActive }) =>
                                          cn(
                                            isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
                                            "flex items-center justify-between w-full"
                                          )
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <tab.icon className="h-4 w-4 shrink-0" />
                                          <span className="truncate">{tab.title || t(tab.titleKey)}</span>
                                        </div>
                                        {(tab.id.includes('inss-planning') || tab.id.includes('inss-strategy')) && !hasStrategy && (
                                          <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-auto" />
                                        )}
                                      </PrefetchLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setIsChatOpen(true)} className="w-full">
              <MessageSquare className="h-5 w-5" />
              <span>{t("navigation.aiChat") || "AI Assistant"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton data-testid="open-superbot" onClick={() => navigate('/castormind-ai')} className="w-full">
              <Bot className="h-5 w-5" />
              <span>{t("navigation.superBot") || "CastorMind-AI"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            {profileLoading || rolesLoading ? (
              <SidebarMenuButton size="lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="grid flex-1 gap-1">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </SidebarMenuButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <AvatarProgressive
                      src={profile?.avatar_url}
                      alt={profile?.display_name || t("navigation.userFallback")}
                      fallback={profile?.display_name?.substring(0, 2).toUpperCase() || profile?.email?.substring(0, 2).toUpperCase() || t("navigation.userInitial")}
                      className={cn("h-8 w-8 rounded-lg ring-2", getRoleAvatarColor(primaryRole))}
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {profile?.display_name || profile?.email || t("navigation.userFallback")}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("settings:userProfile") || "Profile"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notifications")}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>{t("navigation.notifications")}</span>
                    <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                      3
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>{t("navigation.settings")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBugRecorderOpen(true)}>
                    <Bug className="mr-2 h-4 w-4" />
                    <span>{t("roadmap:bugRecorder.reportBug")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("clientPortal.layout.signOut") || "Sign out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      
      <ChatWidget isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      {profile && (
        <EditProfileDialog 
          userId={profile.id}
          open={isProfileDialogOpen} 
          onClose={() => setIsProfileDialogOpen(false)} 
        />
      )}
      <ProjectSelectionModal 
        isOpen={isProjectSwitcherOpen} 
        onClose={() => setIsProjectSwitcherOpen(false)} 
      />

      </Sidebar>
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {pendingPortalModal && (
              <div className="fixed inset-0 z-[100000] bg-black p-4 md:p-8">
                <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-[#0b0f17] shadow-2xl overflow-hidden">
                  <div className="h-12 px-4 border-b border-white/10 bg-[#181a20] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Close dimension selector"
                        onClick={() => setPendingPortalModal(null)}
                        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/20"
                      />
                      <button
                        aria-label="Minimize dimension selector"
                        onClick={() => setPendingPortalModal(null)}
                        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/20"
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-200 truncate">Select Dimensions</p>
                    <div className="w-10" />
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{pendingPortalModal.title}</p>
                      <p className="text-xs text-slate-400">
                        Choose a viewport before opening the modal window.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300">Dimensions</label>
                      <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                        <SelectTrigger className="h-10 w-full border-white/15 bg-[#0f1116] text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100100] bg-[#0f1116] border-white/15 text-slate-200">
                          {DEVICE_PRESETS.map((device) => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        aria-label="Rotate viewport"
                        onClick={() => setRotateDevice(prev => !prev)}
                        disabled={selectedDeviceId === "responsive"}
                        className="h-10 px-3 rounded-md border border-white/15 bg-[#0f1116] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        <RotateCw className="h-4 w-4" />
                        Rotate
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingPortalModal(null)}
                          className="h-10 px-4 rounded-md border border-white/15 bg-[#0f1116] text-slate-200 hover:bg-[#171b24]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={launchPortalModalWithSelectedDimensions}
                          className="h-10 px-4 rounded-md bg-[#1f6feb] text-white hover:bg-[#1a5dc7]"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {portalModal && !isPortalModalMinimized && (
              <div className="fixed inset-0 z-[99990] bg-black p-4 md:p-8">
                <div
                  className={cn(
                    "mx-auto rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl overflow-hidden",
                    portalViewport.deviceId === "responsive" ? "h-full max-w-6xl flex flex-col" : "w-fit"
                  )}
                >
                  <div className="h-12 px-4 border-b border-white/10 bg-[#181a20] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Close"
                        onClick={() => {
                          setPortalModal(null);
                          setPendingPortalModal(null);
                        }}
                        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/20"
                      />
                      <button
                        aria-label="Minimize"
                        onClick={() => setIsPortalModalMinimized(true)}
                        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/20"
                      />
                    </div>
                    <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
                      <p className="text-sm font-medium text-slate-200 truncate max-w-[240px]">{portalModal.title}</p>
                      <span className="hidden md:inline-flex rounded-full border border-white/10 bg-[#11141b] px-2 py-0.5 text-[10px] text-slate-300">
                        {activeDevice.label}
                        {activeDeviceWidth && activeDeviceHeight ? ` · ${activeDeviceWidth}x${activeDeviceHeight}` : ""}
                      </span>
                    </div>
                    <div className="w-10" />
                  </div>
                  {portalViewport.deviceId === "responsive" ? (
                    <div className="flex-1 bg-black p-4 overflow-auto">
                      <div className="h-full w-full flex items-center justify-center">
                        <iframe
                          title={portalModal.title}
                          src={portalModal.path}
                          className="h-full w-full border-0 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black p-4">
                      <div
                        className="rounded-[28px] border border-white/15 bg-black overflow-hidden shadow-2xl"
                        style={{
                          width: `${activeDeviceWidth}px`,
                          height: `${activeDeviceHeight}px`,
                          maxWidth: "calc(100vw - 3rem)",
                          maxHeight: "calc(100vh - 8rem)",
                        }}
                      >
                        <iframe
                          title={`${portalModal.title} (${activeDevice.label})`}
                          src={portalModal.path}
                          className="h-full w-full border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {portalModal && isPortalModalMinimized && (
              <button
                onClick={() => setIsPortalModalMinimized(false)}
                className="fixed bottom-6 left-6 z-[99995] rounded-full border border-white/10 bg-[#1b1f27] px-4 py-2 text-sm font-medium text-white shadow-xl hover:bg-[#232936]"
              >
                {portalModal.title}
              </button>
            )}
          </>,
          document.body
        )}
    </>
  );
}
