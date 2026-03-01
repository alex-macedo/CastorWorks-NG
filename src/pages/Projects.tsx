import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, User, Calendar, TrendingUp, LayoutGrid, List, Table as TableIcon, ArrowUpDown, Folder, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from '@/utils/storage';
import { useProjects } from "@/hooks/useProjects";
import { useTemplateMaterialsDuplication } from "@/hooks/useTemplateMaterialsDuplication";
import { useTemplateLaborDuplication } from "@/hooks/useTemplateLaborDuplication";
import { formatCurrency } from "@/utils/formatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { CompactValue } from "@/components/ui/compact-value";
import { ProjectFilters, type ProjectFilters as ProjectFiltersType } from "@/components/Projects/ProjectFilters";
import { ProjectCardSkeleton } from "@/components/ui/skeleton-variants";
import { EmptyState } from "@/components/EmptyState";
import { ProjectForm } from "@/components/Projects/ProjectForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSeedDataStatus } from "@/hooks/useSeedDataStatus";
import { Container } from "@/components/Layout";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";
import { ProjectTableView } from "@/components/Projects/ProjectTableView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useSystemPreferences } from "@/hooks/useSystemPreferences";
import { useUserRoles, useHasRole } from "@/hooks/useUserRoles";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { loadDraft, clearDraft, saveDraft } from "@/utils/draftManager";
import { useMultiFilter } from "@/hooks/useMultiFilter";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { ProjectScheduleStatusBadge } from "@/components/Projects/ProjectScheduleStatusBadge";

const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currency, numberFormat } = useLocalization();
  const { formatDate } = useDateFormat();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filters, setFilters] = useState<ProjectFiltersType>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const { duplicateTemplateToProject } = useTemplateMaterialsDuplication();
  const { duplicateLaborTemplateToProject } = useTemplateLaborDuplication();
  const [newProjectSheetOpen, setNewProjectSheetOpen] = useState(false);
  const [budgetPromptOpen, setBudgetPromptOpen] = useState(false);
  const [pendingProject, setPendingProject] = useState<any>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [draftFormData, setDraftFormData] = useState<any>(null);
  
  const { createPhasesFromTemplate } = useProjectPhases(undefined);
  const { templates } = usePhaseTemplates();
  const { settings: appSettings } = useAppSettings();
  const { data: systemPreferences } = useSystemPreferences();
  const { data: roles } = useUserRoles();
  const { data: currentUser } = useCurrentUserProfile();
  const isClient = useHasRole('client');
  const isAdmin = roles?.some(r => r.role === 'admin');
  const isProjectManager = roles?.some(r => r.role === 'project_manager');
  const isViewer = roles?.some(r => r.role === 'viewer');
  const canCreateProject = roles?.some(r => ['admin', 'project_manager', 'admin_office', 'office_admin', 'architect'].includes(r.role));

  const [searchParams] = useSearchParams();

  // Check if user can edit a specific project
  const canEditProject = (project: any) => {
    if (isAdmin) return true;
    if (isProjectManager && currentUser?.display_name === project.manager) return true;
    return false;
  };

  // Check for saved drafts on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setSavedDraft(draft);
      setDraftDialogOpen(true);
    }
  }, []);

  // Handle opening the sheet from navigation state
  useEffect(() => {
    if (location.state?.openNewProjectSheet) {
      setTimeout(() => setNewProjectSheetOpen(true), 0);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Read status filter from URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',');
      setFilters(prev => ({ ...prev, status: statuses }));
    }
  }, [searchParams]);

  const { projects, isLoading, updateProject, createProject } = useProjects() as any;
  const projectTypeOptions = [
    { key: 'Project Owned', label: t('projects:projectOwned') },
    { key: 'Project Customer', label: t('projects:projectCustomer') },
  ];
  const { data: seedIds } = useSeedDataStatus();
  const [projectImageUrls, setProjectImageUrls] = useState<Record<string, string>>({});

  // Support deep links that request editing a specific project
  useEffect(() => {
    const editProjectId = (location.state as { editProjectId?: string } | null)?.editProjectId;
    if (!editProjectId || !projects) return;

    const projectToEdit = (projects as any[]).find(p => p.id === editProjectId);
    if (projectToEdit) {
      setTimeout(() => {
        setEditingProject(projectToEdit);
        setEditDialogOpen(true);
      }, 0);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, projects]);

  const getProjectTypeLabel = (typeKey: string | null | undefined) => {
    if (!typeKey) return '';
    const option = projectTypeOptions.find(opt => opt.key === typeKey);
    return option?.label || typeKey;
  };

  const getBudgetModelLabel = (budgetModel: string | null | undefined) => {
    if (!budgetModel) return '';
    switch (budgetModel) {
      case 'simple': return t('projects:budgetTypeSimple');
      case 'bdi_brazil': return t('projects:budgetTypeBDIBrazil');
      case 'cost_control': return t('projects:budgetTypeCostControl');
      default: return budgetModel;
    }
  };

  const getProjectImageUrl = useCallback(async (project: any): Promise<string> => {
    if (!project.image_url || project.image_url === '/placeholder.svg' || project.image_url.includes('placeholder')) {
      return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";
    }

    if (project.image_url.startsWith('http')) {
      setProjectImageUrls(prev => ({ ...prev, [project.id]: project.image_url }));
      return project.image_url;
    }

    try {
      const url = await resolveStorageUrl(project.image_url, 60 * 60 * 24 * 365);
      setProjectImageUrls(prev => ({ ...prev, [project.id]: url }));
      return url;
    } catch (error) {
      const fallbackUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";
      setProjectImageUrls(prev => ({ ...prev, [project.id]: fallbackUrl }));
      return fallbackUrl;
    }
  }, []);

  const filterGroups = useMemo(() => ({
    status: filters.status,
    type: filters.type,
  }), [filters.status, filters.type]);

  const projectsFromFilter = useMultiFilter(projects || [], filterGroups);

  const filteredProjects = useMemo(() => {
    return (projectsFromFilter as any[]).filter((project: any) => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.client_name && project.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.manager)?.toLowerCase().includes(searchTerm.toLowerCase());

      const budget = Number(project.budget_total || project.budget_total_value || 0);
      const matchesBudget = (!filters.minBudget || budget >= filters.minBudget) && (!filters.maxBudget || budget <= filters.maxBudget);

      const startDate = project.start_date ? new Date(project.start_date).getTime() : 0;
      const matchesDate = (!filters.startDateFrom || startDate >= new Date(filters.startDateFrom).getTime()) && (!filters.startDateTo || startDate <= new Date(filters.startDateTo).getTime());

      return matchesSearch && matchesBudget && matchesDate;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "budgetHighToLow": return Number(b.budget_total || b.budget_total_value || 0) - Number(a.budget_total || a.budget_total_value || 0);
        case "budgetLowToHigh": return Number(a.budget_total || a.budget_total_value || 0) - Number(b.budget_total || b.budget_total_value || 0);
        case "nameAZ": return a.name.localeCompare(b.name);
        case "nameZA": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
  }, [projectsFromFilter, searchTerm, sortBy, filters.minBudget, filters.maxBudget, filters.startDateFrom, filters.startDateTo]);

  useEffect(() => {
    if (!filteredProjects.length) return;
    const loadImages = async () => {
      for (const project of (filteredProjects as any[])) {
        if (project.image_url && !projectImageUrls[project.id]) {
          await getProjectImageUrl(project);
        }
      }
    };
    loadImages();
  }, [filteredProjects, getProjectImageUrl, projectImageUrls]);

  const handleFilterChange = (newFilters: ProjectFiltersType) => setFilters(newFilters);
  const handleEdit = (project: any) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (data: any) => {
    updateProject.mutate({ id: editingProject.id, ...data }, {
      onSuccess: async () => {
        if (data.image_url !== editingProject.image_url) {
          setProjectImageUrls(prev => {
            const newUrls = { ...prev };
            delete newUrls[editingProject.id];
            return newUrls;
          });
        }
        if (data.total_gross_floor_area && data.total_gross_floor_area > 0) {
          try {
            await duplicateTemplateToProject.mutateAsync({
              projectId: editingProject.id,
              totalGrossFloorArea: Number(data.total_gross_floor_area),
            });
          } catch (materialError) {
            console.error('[Project Update] Failed to check/duplicate materials:', materialError);
          }
        }
        setEditDialogOpen(false);
        setEditingProject(null);
      }
    });
  };

  const handleNewProjectSubmit = (data: any) => {
    createProject.mutate(data, {
      onSuccess: (newProject: any) => {
        clearDraft();
        setDraftFormData(null);
        const shouldAutoCreate = (
          (data.budget_model === 'simple' && appSettings?.auto_create_simple_budget) ||
          (data.budget_model === 'bdi_brazil' && appSettings?.auto_create_bdi_brazil_budget) ||
          (data.budget_model === 'cost_control' && appSettings?.auto_create_cost_control_budget)
        );

        if (shouldAutoCreate) {
          toast.info(t('projects:creatingBudgetPleaseWait'));
          handleGenerateBudget({ ...newProject, budget_model: data.budget_model });
        } else {
          setPendingProject({ ...newProject, budget_model: data.budget_model });
          setNewProjectSheetOpen(false);
          setBudgetPromptOpen(true);
        }
      },
      onError: (error: any) => {
        saveDraft(data, 0);
        toast.error(t('projects:createProjectFailed', { error: error.message || 'Unknown error' }));
      },
    });
  };

  const handleGenerateBudget = async (project?: any) => {
    const projectToUse = project || pendingProject;
    if (!projectToUse) return;

    try {
      if (projectToUse.budget_model === 'simple') {
        await duplicateTemplateToProject.mutateAsync({ projectId: projectToUse.id, totalGrossFloorArea: Number(projectToUse.total_gross_floor_area || 0) });
        await duplicateLaborTemplateToProject.mutateAsync({ projectId: projectToUse.id });
      } else {
        const defaultTemplate = templates?.find(t => t.is_default);
        if (defaultTemplate) {
          await createPhasesFromTemplate.mutateAsync({
            projectId: projectToUse.id,
            templatePhases: defaultTemplate.phases,
            projectStartDate: projectToUse.start_date ? new Date(projectToUse.start_date) : null,
            projectBudget: projectToUse.budget_total || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate budget:', error);
    } finally {
      setBudgetPromptOpen(false);
      navigate(`/projects/${projectToUse.id}`);
      setPendingProject(null);
    }
  };

  const handleSkipBudget = () => {
    if (pendingProject) {
      setBudgetPromptOpen(false);
      navigate(`/projects/${pendingProject.id}`);
      setPendingProject(null);
    }
  };

  return (
    <div className="space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("projects:title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("projects:subtitle")}</p>
          </div>
          {canCreateProject && (
            <Button
              variant="glass-style-white"
              onClick={() => setNewProjectSheetOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("projects:newProject")}
            </Button>
          )}
        </div>
      </SidebarHeaderShell>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder={t('projects:searchProjects')} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <ProjectFilters onFilterChange={handleFilterChange} />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]"><ArrowUpDown className="mr-2 h-4 w-4" /><SelectValue placeholder={t('projects:sortBy')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('projects:newest')}</SelectItem>
            <SelectItem value="oldest">{t('projects:oldest')}</SelectItem>
            <SelectItem value="budgetHighToLow">{t('projects:budgetHighToLow')}</SelectItem>
            <SelectItem value="budgetLowToHigh">{t('projects:budgetLowToHigh')}</SelectItem>
            <SelectItem value="nameAZ">{t('projects:nameAZ')}</SelectItem>
            <SelectItem value="nameZA">{t('projects:nameZA')}</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
          <ToggleGroupItem value="cards"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="list"><List className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="table"><TableIcon className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {(filteredProjects as any[]).length > 0 && (
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{t('projects:showingResults', { count: (filteredProjects as any[]).length, total: (projects as any)?.length ?? 0 })}</span>
          <span className="whitespace-nowrap">{t('common:scheduleStatus.timezoneChip', { timezone: systemPreferences?.system_time_zone || 'America/New_York' })}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><ProjectCardSkeleton count={6} /></div>
      ) : (filteredProjects as any[]).length === 0 ? (
        <EmptyState icon={Folder} title={t('common.noData')} description={t('projects:emptyStateDescription')} primaryAction={canCreateProject ? { label: t('projects:newProject'), onClick: () => setNewProjectSheetOpen(true) } : undefined} />
      ) : viewMode === "table" ? (
        <ProjectTableView 
          projects={filteredProjects as any[]} 
          onEdit={handleEdit} 
          getProjectTypeLabel={getProjectTypeLabel} 
          isDemoProject={(id: string) => seedIds?.has(id) ?? false}
          enableRowSelection={false} 
          enableColumnVisibility={true} 
          enableFiltering={false} 
          pageSize={25} 
          onRowClick={(project: any) => {
            navigate(`/projects/${project.id}`);
          }} 
        />
      ) : viewMode === "cards" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(filteredProjects as any[]).map((project: any) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-40 cursor-pointer overflow-hidden group" onClick={() => navigate(`/projects/${project.id}`)}>
                <img src={projectImageUrls[project.id] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"} alt={project.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: project.image_focus_point ? `${project.image_focus_point.x}% ${project.image_focus_point.y}%` : 'center' }} />
                <div className="absolute top-4 right-4 z-10">{seedIds?.has(project.id) && <Badge className="bg-blue-500 hover:bg-blue-600 text-white"><Sparkles className="h-3 w-3 mr-1" />{t('projects:demoData')}</Badge>}</div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10"><div className="flex gap-2">{project.type && <Badge variant="outline" className="text-white border-white bg-black/50 backdrop-blur-sm">{getProjectTypeLabel(project.type)}</Badge>}{project.budget_model && <Badge variant="outline" className="text-white border-white bg-black/50 backdrop-blur-sm">{getBudgetModelLabel(project.budget_model)}</Badge>}<ProjectScheduleStatusBadge status={getProjectScheduleStatus(project)} statusBadgeVariant="outline" statusBadgeClassName="text-white border-white bg-black/50 backdrop-blur-sm" showTimezoneBadge={false} /></div></div>
              </div>
              <CardContent className="p-3 flex flex-col justify-between min-h-[200px]">
                <div className="space-y-2">
                  <div><h3 className="font-bold text-base mb-1">{project.name}</h3><p className="text-xs text-muted-foreground">{(project as any).clients?.name || '-'}</p></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{t('projects:progress')}</span><span className="font-medium">{project.avg_progress || 0}%</span></div><Progress value={project.avg_progress || 0} className="h-1.5" /></div><div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{t('projects:budgetUsed')}</span><span className="font-medium">{project.budget_used_percentage || 0}%</span></div><Progress value={project.budget_used_percentage || 0} className="h-1.5" /></div></div>
                  <div className="space-y-1">{project.manager && <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /><span>{project.manager}</span></div>}<div className="flex gap-3"><div className="flex-1 max-w-[80%]">{(project.start_date || project.end_date) && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /><span>{project.start_date ? formatDate(project.start_date) : '-'} - {project.end_date ? formatDate(project.end_date) : '-'}</span></div>}</div><div className="flex-1 max-w-[20%]">{(project.budget_total || project.total_area != null) && <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">{project.total_area != null && <div className="flex items-center gap-1"><span className="font-medium">{project.total_area} m²</span></div>}{project.budget_total && <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /><CompactValue compactValue={numberFormat === 'compact' ? formatCompactCurrency(Number(project.budget_total), currency) : formatCurrency(Number(project.budget_total), currency)} fullValue={formatCurrency(Number(project.budget_total), currency)} className="cursor-help" /></div>}</div>}</div></div></div>
                </div>
                <div className="flex gap-1 mt-2">{canEditProject(project) && <Button variant="glass-style-dark" className="flex-1" onClick={() => handleEdit(project)}><Pencil className="mr-1 h-3 w-3" />{t('projects:editProject')}</Button>}<Button variant="glass-style-dark" className="flex-1" onClick={() => navigate(`/projects/${project.id}`)}>{t('projects:viewDetails')}</Button></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(filteredProjects as any[]).map((project: any) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="cursor-pointer overflow-hidden rounded-lg group" onClick={() => navigate(`/projects/${project.id}`)}>
                    <img src={projectImageUrls[project.id] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"} alt={project.name} className="w-32 h-32 object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: project.image_focus_point ? `${project.image_focus_point.x}% ${project.image_focus_point.y}%` : 'center' }} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div><h3 className="font-bold text-lg mb-1">{project.name}</h3><p className="text-sm text-muted-foreground">{(project as any).clients?.name || '-'}</p></div>
                      <div className="flex gap-2">{seedIds?.has(project.id) && <Badge className="bg-blue-500 hover:bg-blue-600 text-white"><Sparkles className="h-3 w-3 mr-1" />{t('projects:demoData')}</Badge>}<ProjectScheduleStatusBadge status={getProjectScheduleStatus(project)} showTimezoneBadge={false} /></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 flex-wrap">{project.type && <Badge variant="outline" className="text-primary border-primary">{getProjectTypeLabel(project.type)}</Badge>}{project.manager && <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /><span>{project.manager}</span></div>}{(project.start_date || project.end_date) && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /><span>{project.start_date ? formatDate(project.start_date) : '-'} - {project.end_date ? formatDate(project.end_date) : '-'}</span></div>}                        {(project as any).budget_total && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <CompactValue
                              compactValue={numberFormat === 'compact' 
                                ? formatCompactCurrency(Number((project as any).budget_total), currency)
                                : formatCurrency(Number((project as any).budget_total), currency)
                              }
                              fullValue={formatCurrency(Number((project as any).budget_total), currency)}
                            />
                          </div>
                        )}</div>
                      <div className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('projects:overallProgress')}</span><span className="font-medium">{project.avg_progress || 0}%</span></div><Progress value={project.avg_progress || 0} className="h-2" /></div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-center">{!(isClient || isViewer) && <Button variant="outline" size="sm" onClick={() => handleEdit(project)}><Pencil className="mr-2 h-4 w-4" />{t('common.edit')}</Button>}<Button size="sm" onClick={() => navigate(`/projects/${project.id}`)}>{t('projects:viewDetails')}</Button></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={newProjectSheetOpen} onOpenChange={setNewProjectSheetOpen}><SheetContent side="right" className="sm:max-w-[83.2rem] overflow-y-auto"><SheetHeader><SheetTitle>{t("projects:newProject")}</SheetTitle></SheetHeader><div className="mt-6"><ProjectForm defaultValues={draftFormData} onSubmit={handleNewProjectSubmit} onCancel={() => { setNewProjectSheetOpen(false); setDraftFormData(null); }} /></div></SheetContent></Sheet>
      <Sheet open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}><SheetContent side="right" className="sm:max-w-[83.2rem] overflow-y-auto"><SheetHeader><SheetTitle>{t('projects:editProject')}</SheetTitle></SheetHeader>{editingProject && <div className="mt-6"><ProjectForm defaultValues={editingProject} isEditing={true} onSubmit={handleEditSubmit} onCancel={() => { setEditDialogOpen(false); setEditingProject(null); }} /></div>}</SheetContent></Sheet>
      <AlertDialog open={budgetPromptOpen} onOpenChange={setBudgetPromptOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('projects:generateBudgetTitle')}</AlertDialogTitle><AlertDialogDescription>{t('projects:generateBudgetDescription')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={handleSkipBudget}>{t('common.skip')}</AlertDialogCancel><AlertDialogAction onClick={() => handleGenerateBudget()}>{t('projects:generateBudget')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('projects:draftFound') || 'Draft Found'}</AlertDialogTitle></AlertDialogHeader><div className="space-y-3 py-4">{savedDraft && <><p className="text-sm text-gray-700">{t('projects:draftFoundDescription') || 'We found a saved draft of your project from'} <span className="font-semibold">{savedDraft.timestamp && formatDate(new Date(savedDraft.timestamp))}</span></p><p className="text-xs text-gray-500">{t('projects:draftExpiresIn') || 'This draft will expire in 7 days.'}</p></>}</div><AlertDialogFooter><AlertDialogCancel onClick={() => { setDraftDialogOpen(false); clearDraft(); }}>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { setDraftDialogOpen(false); setDraftFormData(savedDraft?.data); setNewProjectSheetOpen(true); }}>{t('projects:loadDraft') || 'Load Draft'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

export default Projects;
