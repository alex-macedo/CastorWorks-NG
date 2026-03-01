import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { lazyWithRetry } from "@/utils/lazyImport";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams, useNavigate } from "react-router-dom";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { TenantGuard } from "@/components/TenantGuard";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/Layout/AppSidebar";
import { SidebarWrapper } from "./components/Layout/SidebarWrapper";
import { TopBar } from "./components/Layout/TopBar";
import { ThemeProvider } from "./components/ThemeProvider";
import { SkipLink } from "./components/Accessibility/SkipLink";
import { AuthGuard } from "./components/AuthGuard";
import { useRouteTranslations } from "@/hooks/useRouteTranslations"; // PHASE 2
import { warmCache } from "@/utils/cacheWarming"; // PHASE 5: Cache warming
import { isMaintenanceMode } from "@/utils/maintenanceMode";
import { ScheduledMaintenanceBanner } from "@/components/ScheduledMaintenanceBanner";
import { useMaintenanceNotifications } from "@/hooks/useMaintenanceNotifications";
import { useCompanyIdNotification } from "@/hooks/useCompanyIdNotification";
import { AutoSync } from "@/components/AutoSync";
import { SupervisorProjectProvider } from "@/contexts/SupervisorProjectContext";
import { AppProjectProvider } from "@/contexts/AppProjectContext";
import { TranslationDevTools } from "@/components/Dev/TranslationDevTools";
import { RoleGuard } from "@/components/RoleGuard";

import { ChatProvider } from "@/contexts/ChatContext";
import { CommandPalette, useCommandPalette } from "@/components/ui/command-palette";
import { useClientPortalAuth } from "@/hooks/clientPortal/useClientPortalAuth";
import { getStoredClientPortalToken } from "@/lib/clientPortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { routeEmitter } from '@/lib/routeEmitter';
import i18n, { i18nInitPromise } from '@/lib/i18n/i18n';
import { useLocalization } from "@/contexts/LocalizationContext";
import RouterErrorBoundary from "@/components/RouterErrorBoundary";
import { TimeTracker } from "@/components/Architect/TimeTracking/TimeTracker";
import { TimeTrackerResumeDialog } from "@/components/Architect/TimeTracking/TimeTrackerResumeDialog";
import { FloatingTimeClock } from "@/components/Shared/TimeClock/FloatingTimeClock";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { BugRecorderProvider } from "@/contexts/BugRecorderContext";

console.log("[App.tsx] Module loaded, defining lazy components...");

const hasI18nResources = () => {
  const hasCommonBundle = i18n.hasResourceBundle(i18n.language, 'common');
  const hasNavigationBundle = i18n.hasResourceBundle(i18n.language, 'navigation');
  console.log("[App.tsx] Has common bundle:", hasCommonBundle);
  console.log("[App.tsx] Has navigation bundle:", hasNavigationBundle);
  return hasCommonBundle && hasNavigationBundle;
};

// Lazy load all page components for code splitting
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");
const OverallStatus = lazyWithRetry(() => import("./pages/OverallStatus"), "OverallStatus");
const Projects = lazyWithRetry(() => import("./pages/Projects"), "Projects");
const NewProject = lazyWithRetry(() => import("./pages/NewProject"), "NewProject");
const ProjectDetail = lazyWithRetry(() => import("./pages/ProjectDetail"), "ProjectDetail");
const ProjectDocuments = lazyWithRetry(() => import("./pages/ProjectDocuments"), "ProjectDocuments");
const BudgetCreate = lazyWithRetry(() => import("./pages/BudgetCreate"), "BudgetCreate");
const Financial = lazyWithRetry(() => import("./pages/Financial"), "Financial");
const FinancialInvoice = lazyWithRetry(() => import("./pages/FinancialInvoice"), "FinancialInvoice");
const FinancialLedger = lazyWithRetry(() => import("./pages/FinancialLedger"), "FinancialLedger");
const FinancialCashflow = lazyWithRetry(() => import("./pages/FinancialCashflow"), "FinancialCashflow");
const FinancialCollections = lazyWithRetry(() => import("./pages/Admin/FinancialCollections"), "FinancialCollections");
const FinancialPayments = lazyWithRetry(() => import("./pages/FinancialPayments"), "FinancialPayments");
const Reports = lazyWithRetry(() => import("./pages/Reports"), "Reports");
const ProjectBudgets = lazyWithRetry(() => import("./pages/ProjectBudgets"), "ProjectBudgets");
const BudgetDetail = lazyWithRetry(() => import("./pages/BudgetDetail"), "BudgetDetail");
const FinancialAR = lazyWithRetry(() => import("./pages/FinancialAR"), "FinancialAR");
const FinancialAP = lazyWithRetry(() => import("./pages/FinancialAP"), "FinancialAP");
const FinancialActionQueue = lazyWithRetry(() => import("./pages/FinancialActionQueue"), "FinancialActionQueue");
const BudgetControl = lazyWithRetry(() => import("./pages/BudgetControl"), "BudgetControl");
const BudgetTemplates = lazyWithRetry(() => import("./pages/BudgetTemplates"), "BudgetTemplates");
const BudgetTemplateEdit = lazyWithRetry(() => import("./pages/BudgetTemplateEdit"), "BudgetTemplateEdit");
const BudgetTemplateDetail = lazyWithRetry(() => import("./pages/BudgetTemplateDetail"), "BudgetTemplateDetail");
const Procurement = lazyWithRetry(() => import("./pages/Procurement"), "Procurement");
const PurchaseRequest = lazyWithRetry(() => import("./pages/PurchaseRequest"), "PurchaseRequest");
const Approvals = lazyWithRetry(() => import("./pages/Approvals"), "Approvals");
const Clientes = lazyWithRetry(() => import("./pages/Clientes"), "Clientes");
const Cliente = lazyWithRetry(() => import("./pages/Cliente"), "Cliente");
const ClientAccessManagement = lazyWithRetry(() => import("./pages/ClientAccessManagement"), "ClientAccessManagement");
const ClientAccessAnalytics = lazyWithRetry(() => import("./pages/ClientAccessAnalytics"), "ClientAccessAnalytics");
const ClientAccessAuditLog = lazyWithRetry(() => import("./pages/ClientAccessAuditLog"), "ClientAccessAuditLog");
const NotificationCenter = lazyWithRetry(() => import("./pages/NotificationCenter"), "NotificationCenter");

// Mobile Logistics Pages
const MobileLogisticsHome = lazyWithRetry(() => import("./pages/Mobile/Logistics/MobileLogisticsHome"), "MobileLogisticsHome");
const MobileDeliveries = lazyWithRetry(() => import("./pages/Mobile/Logistics/MobileDeliveries"), "MobileDeliveries");
const MobileScanner = lazyWithRetry(() => import("./pages/Mobile/Logistics/MobileScanner"), "MobileScanner");
const MobileInventory = lazyWithRetry(() => import("./pages/Mobile/Logistics/MobileInventory"), "MobileInventory");

// Supervisor Logistics Pages
const SupervisorLogistics = lazyWithRetry(() => import("./pages/SupervisorLogistics"), "SupervisorLogistics");
const SupervisorDeliveries = lazyWithRetry(() => import("./pages/SupervisorDeliveries"), "SupervisorDeliveries");
const SupervisorScanner = lazyWithRetry(() => import("./pages/SupervisorScanner"), "SupervisorScanner");
const SupervisorInventory = lazyWithRetry(() => import("./pages/SupervisorInventory"), "SupervisorInventory");


const Settings = lazyWithRetry(() => import("./pages/Settings"), "Settings");
const DBExportImport = lazyWithRetry(() => import("./pages/DBExportImport"), "DBExportImport");
const MaterialsLabor = lazyWithRetry(() => import("./pages/MaterialsLabor"), "MaterialsLabor");
const MaterialsTemplates = lazyWithRetry(() => import("./pages/MaterialsTemplates"), "MaterialsTemplates");
const LaborTemplates = lazyWithRetry(() => import("./pages/LaborTemplates"), "LaborTemplates");
const ProjectMaterialsEdit = lazyWithRetry(() => import("./pages/ProjectMaterialsEdit"), "ProjectMaterialsEdit");
const ProjectLaborEdit = lazyWithRetry(() => import("./pages/ProjectLaborEdit"), "ProjectLaborEdit");
const ProjectCalendar = lazyWithRetry(() => import("./pages/ProjectCalendar"), "ProjectCalendar");
const ContactsList = lazyWithRetry(() => import("./pages/ContactsList"), "ContactsList");
const ProjectPhases = lazyWithRetry(() => import("./pages/ProjectPhases"), "ProjectPhases");
const AIInsights = lazyWithRetry(() => import("./pages/AIInsights"), "AIInsights");
const ReleasesReport = lazyWithRetry(() => import("./pages/ReleasesReport"), "ReleasesReport");
const Roadmap = lazyWithRetry(() => import("./pages/Roadmap"), "Roadmap");
const RoadmapAnalytics = lazyWithRetry(() => import("./pages/RoadmapAnalytics"), "RoadmapAnalytics");
const AiToWorkPage = lazyWithRetry(() => import("./pages/AiToWorkPage"), "AiToWorkPage");
const ProjectsTimelinePage = lazyWithRetry(() => import("./pages/ProjectsTimelinePage"), "ProjectsTimelinePage");
const TaskManagementPage = lazyWithRetry(() => import("./pages/TaskManagementPage"), "TaskManagementPage");
const CalendarPage = lazyWithRetry(() => import("./pages/CalendarPage"), "CalendarPage");
const ProjectActivityCalendar = lazyWithRetry(() => import("./pages/ProjectActivityCalendar"), "ProjectActivityCalendar");

// Forms Module Pages
const FormsListPage = lazyWithRetry(() => import("./pages/Forms/FormsListPage"), "FormsListPage");
const FormBuilderPage = lazyWithRetry(() => import("./pages/Forms/FormBuilderPage"), "FormBuilderPage");
const FormResponsesPage = lazyWithRetry(() => import("./pages/Forms/FormResponsesPage"), "FormResponsesPage");
const PublicFormPage = lazyWithRetry(() => import("./pages/Forms/PublicFormPage"), "PublicFormPage");

const Analytics = lazyWithRetry(() => import("./pages/Analytics"), "Analytics");
const Weather = lazyWithRetry(() => import("./pages/Weather"), "Weather");
const Contractors = lazyWithRetry(() => import("./pages/Contractors"), "Contractors");
const CustomerApprovalPortal = lazyWithRetry(() => import("./pages/CustomerApprovalPortal"), "CustomerApprovalPortal");
const PurchaseOrdersPage = lazyWithRetry(() => import("./pages/PurchaseOrdersPage").then(m => ({ default: m.PurchaseOrdersPage })), "PurchaseOrdersPage");
const PurchaseOrderDetailPage = lazyWithRetry(() => import("./pages/PurchaseOrderDetailPage"), "PurchaseOrderDetailPage");
const SupervisorHub = lazyWithRetry(() => import("./pages/SupervisorHub"), "SupervisorHub");
const SupervisorDeliveryPortal = lazyWithRetry(() => import("./pages/SupervisorDeliveryPortal"), "SupervisorDeliveryPortal");
const SupervisorActivityLog = lazyWithRetry(() => import("./pages/SupervisorActivityLog"), "SupervisorActivityLog");
const SupervisorIssues = lazyWithRetry(() => import("./pages/SupervisorIssues"), "SupervisorIssues");
const SupervisorTimeLogs = lazyWithRetry(() => import("./pages/SupervisorTimeLogs"), "SupervisorTimeLogs");
const SupervisorInspections = lazyWithRetry(() => import("./pages/SupervisorInspections"), "SupervisorInspections");
const SupervisorPhotoGallery = lazyWithRetry(() => import("./pages/SupervisorPhotoGallery"), "SupervisorPhotoGallery");
const DeliveryVerificationScreen = lazyWithRetry(() => import("./pages/DeliveryVerificationScreen"), "DeliveryVerificationScreen");
const DeliveryPhotoCaptureScreen = lazyWithRetry(() => import("./pages/DeliveryPhotoCaptureScreen"), "DeliveryPhotoCaptureScreen");
const DeliveryConfirmationSuccess = lazyWithRetry(() => import("./pages/DeliveryConfirmationSuccess"), "DeliveryConfirmationSuccess");
const SupplierPOAcknowledgment = lazyWithRetry(() => import("./pages/SupplierPOAcknowledgment"), "SupplierPOAcknowledgment");
const Documentation = lazyWithRetry(() => import("./pages/Documentation"), "Documentation");
const DocumentViewer = lazyWithRetry(() => import("./pages/DocumentViewer"), "DocumentViewer");
const RLSTest = lazyWithRetry(() => import("./pages/RLSTest"), "RLSTest");
const RoleManagement = lazyWithRetry(() => import("./pages/RoleManagement"), "RoleManagement");
const AuditLogs = lazyWithRetry(() => import("./pages/AuditLogs"), "AuditLogs");
const Notifications = lazyWithRetry(() => import("./pages/Notifications"), "Notifications");
const ConstructionActivities = lazyWithRetry(() => import("./pages/ConstructionActivities"), "ConstructionActivities");
const ActivityTemplateDetail = lazyWithRetry(() => import("./pages/ActivityTemplateDetail"), "ActivityTemplateDetail");
const ActivityTemplateEdit = lazyWithRetry(() => import("./pages/ActivityTemplateEdit"), "ActivityTemplateEdit");
const PhaseTemplates = lazyWithRetry(() => import("./pages/PhaseTemplates"), "PhaseTemplates");
const PhaseTemplateDetail = lazyWithRetry(() => import("./pages/PhaseTemplateDetail"), "PhaseTemplateDetail");
const PhaseTemplateEdit = lazyWithRetry(() => import("./pages/PhaseTemplateEdit"), "PhaseTemplateEdit");
const WhatsAppTemplates = lazyWithRetry(() => import("./pages/WhatsAppTemplates"), "WhatsAppTemplates");
const ProjectWbsTemplates = lazyWithRetry(() => import("./pages/ProjectWbsTemplates"), "ProjectWbsTemplates");
const ProjectWbsTemplateEditor = lazyWithRetry(() => import("./pages/ProjectWbsTemplateEditor"), "ProjectWbsTemplateEditor");
const Estimates = lazyWithRetry(() => import("./pages/Estimates"), "Estimates");
const EstimateWizard = lazyWithRetry(() => import("./pages/EstimateWizard"), "EstimateWizard");
const EstimateDetail = lazyWithRetry(() => import("./pages/EstimateDetail"), "EstimateDetail");
// Mobile App Pages (PWA)
const AppFinance = lazyWithRetry(() => import("./pages/app/AppFinance"), "AppFinance");
const AppProjectChat = lazyWithRetry(() => import("./pages/app/AppProjectChat"), "AppProjectChat");
const AppAnnotations = lazyWithRetry(() => import("./pages/app/AppAnnotations"), "AppAnnotations");
const AppMoodboard = lazyWithRetry(() => import("./pages/app/AppMoodboard"), "AppMoodboard");
const AppDashboard = lazyWithRetry(() => import("./pages/app/AppDashboard"), "AppDashboard");
const AppDailyLog = lazyWithRetry(() => import("./pages/app/AppDailyLog"), "AppDailyLog");
const AppWeather = lazyWithRetry(() => import("./pages/app/AppWeather"), "AppWeather");
const AppLiveMeeting = lazyWithRetry(() => import("./pages/app/AppLiveMeeting"), "AppLiveMeeting");
const AppNotifications = lazyWithRetry(() => import("./pages/app/AppNotifications"), "AppNotifications");
const AppTasks = lazyWithRetry(() => import("./pages/app/AppTasks"), "AppTasks");
const AppEmailReview = lazyWithRetry(() => import("./pages/app/AppEmailReview"), "AppEmailReview");
const AppContacts = lazyWithRetry(() => import("./pages/app/AppContacts"), "AppContacts");
const AppSettings = lazyWithRetry(() => import("./pages/app/AppSettings"), "AppSettings");
const AppReportPreview = lazyWithRetry(() => import("./pages/app/AppReportPreview"), "AppReportPreview");
const AppFloorPlan = lazyWithRetry(() => import("./pages/app/AppFloorPlan"), "AppFloorPlan");
const AppShoppingList = lazyWithRetry(() => import("./pages/app/AppShoppingList"), "AppShoppingList");
const AppBuilder = lazyWithRetry(() => import("./pages/app/AppBuilder"), "AppBuilder");
const AppAgendaBuilder = lazyWithRetry(() => import("./pages/app/AppAgendaBuilder"), "AppAgendaBuilder");
const AppMeetingReview = lazyWithRetry(() => import("./pages/app/AppMeetingReview"), "AppMeetingReview");
const AppBranding = lazyWithRetry(() => import("./pages/app/AppBranding"), "AppBranding");
const CastorMindAI = lazyWithRetry(() => import("./pages/CastorMindAI"), "CastorMindAI");
const CastorMindAIAnalytics = lazyWithRetry(() => import("./pages/CastorMindAIAnalytics"), "CastorMindAIAnalytics");

const ArchitectDashboardPage = lazyWithRetry(() => import("./pages/architect/ArchitectDashboardPage"), "ArchitectDashboardPage");
const SalesPipelinePage = lazyWithRetry(() => import("./pages/architect/SalesPipelinePage"), "SalesPipelinePage");
const ArchitectTasksPage = lazyWithRetry(() => import("./pages/architect/ArchitectTasksPage"), "ArchitectTasksPage");
const ArchitectProjectsListPage = lazyWithRetry(() => import("./pages/architect/ArchitectProjectsListPage"), "ArchitectProjectsListPage");
const ArchitectProjectDetailPage = lazyWithRetry(() => import("./pages/architect/ArchitectProjectDetailPage"), "ArchitectProjectDetailPage");
const ArchitectReportsPage = lazyWithRetry(() => import("./pages/architect/ArchitectReportsPage"), "ArchitectReportsPage");
const ArchitectClientManagementPage = lazyWithRetry(() => import("./pages/architect/ArchitectClientManagementPage"), "ArchitectClientManagementPage");
const ArchitectMeetingsPage = lazyWithRetry(() => import("./pages/architect/ArchitectMeetingsPage"), "ArchitectMeetingsPage");
const ClientPortalViewPage = lazyWithRetry(() => import("./pages/architect/ClientPortalViewPage"), "ClientPortalViewPage");
const ArchitectProjectMoodboardPage = lazyWithRetry(() => import("./pages/architect/ArchitectProjectMoodboardPage"), "ArchitectProjectMoodboardPage");
const ArchitectPortfolioPage = lazyWithRetry(() => import("./pages/architect/ArchitectPortfolioPage"), "ArchitectPortfolioPage");
const ArchitectTimeTrackingPage = lazyWithRetry(() => import("./pages/architect/ArchitectTimeTrackingPage"), "ArchitectTimeTrackingPage");
const ArchitectFinancialPage = lazyWithRetry(() => import("./pages/architect/ArchitectFinancialPage"), "ArchitectFinancialPage");
const ArchitectProposalBuilderPage = lazyWithRetry(() => import("./pages/architect/ArchitectProposalBuilderPage"), "ArchitectProposalBuilderPage");
const MyDashboard = lazyWithRetry(() => import("./pages/architect/MyDashboard"), "MyDashboard");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");
const Login = lazyWithRetry(() => import("./pages/Login"), "Login");
  const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"), "ForgotPassword");
  const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"), "Onboarding");
const TenantPicker = lazyWithRetry(() => import("./pages/TenantPicker"), "TenantPicker");
const Maintenance = lazyWithRetry(() => import("./pages/Maintenance"), "Maintenance");
const MaintenanceManagement = lazyWithRetry(() => import("./pages/Admin/MaintenanceManagement"), "MaintenanceManagement");
const TenantList = lazyWithRetry(() => import("./pages/Admin/TenantList"), "TenantList");
const TenantModules = lazyWithRetry(() => import("./pages/Admin/TenantModules"), "TenantModules");
const TelemetryIssues = lazyWithRetry(() => import("./pages/Admin/TelemetryIssues"), "TelemetryIssues");
const DeliverySignatureScreen = lazyWithRetry(() => import("./pages/DeliverySignatureScreen"), "DeliverySignatureScreen");
const PaymentDashboard = lazyWithRetry(() => import("./pages/PaymentDashboard"), "PaymentDashboard");
const PaymentProcessing = lazyWithRetry(() => import("./pages/PaymentProcessing"), "PaymentProcessing");
const Status = lazyWithRetry(() => import("./pages/Status"), "Status");
const Campaigns = lazyWithRetry(() => import("./pages/Campaigns"), "Campaigns");
const CampaignDetail = lazyWithRetry(() => import("./pages/CampaignDetail"), "CampaignDetail");
const ProposalBuilder = lazyWithRetry(() => import("./pages/ProposalBuilder"), "ProposalBuilder");
const PublicProposal = lazyWithRetry(() => import("./pages/PublicProposal"), "PublicProposal");

// Client Portal Pages (Token-based access)
const ClientPortalDashboard = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalDashboard"), "ClientPortalDashboard");
const ClientPortalSchedule = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalSchedule"), "ClientPortalSchedule");
const ClientPortalTeam = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalTeam"), "ClientPortalTeam");
const ClientPortalTasks = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalTasks"), "ClientPortalTasks");
const ClientPortalDefinitions = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalDefinitions"), "ClientPortalDefinitions");
const ClientPortalMeetings = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalMeetings"), "ClientPortalMeetings");
const ClientPortalCommunication = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalCommunication"), "ClientPortalCommunication");
const ClientPortalChat = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalChat"), "ClientPortalChat");
const ClientPortalPayments = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalPayments"), "ClientPortalPayments");
const ClientPortalFinancial = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalFinancial"), "ClientPortalFinancial");
const ClientPortalPhotos = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalPhotos"), "ClientPortalPhotos");
const ClientPortalINSSPlanning = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalINSSPlanning"), "ClientPortalINSSPlanning");
const ClientPortalINSSStrategy = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalINSSStrategy"), "ClientPortalINSSStrategy");
const PortalDocumentsPage = lazyWithRetry(() => import("./pages/ClientPortal/PortalDocumentsPage"), "PortalDocumentsPage");
const ClientPortalDocumentsPage = lazyWithRetry(() => import("./pages/ClientPortal/ClientPortalDocumentsPage"), "ClientPortalDocumentsPage");
const ClientPortalTokenManagement = lazyWithRetry(() => import("./pages/ClientPortalTokenManagement"), "ClientPortalTokenManagement");
const InvalidToken = lazyWithRetry(() => import("./pages/ClientPortal/InvalidToken"), "InvalidToken");
const ClientPortal = lazyWithRetry(() => import("./pages/ClientPortal"), "ClientPortal");
const ClientReport = lazyWithRetry(() => import("./pages/ClientReport"), "ClientReport");

// Content Hub Pages
const NewsHub = lazyWithRetry(() => import("./pages/NewsHub"), "NewsHub");
const ArticlesHub = lazyWithRetry(() => import("./pages/ArticlesHub"), "ArticlesHub");
const FaqHub = lazyWithRetry(() => import("./pages/FaqHub"), "FaqHub");
const DocumentsHub = lazyWithRetry(() => import("./pages/DocumentsHub"), "DocumentsHub");
const ContentDetail = lazyWithRetry(() => import("./pages/ContentDetail"), "ContentDetail");
const ContentHubDashboard = lazyWithRetry(() => import("./pages/Admin/ContentHubDashboard"), "ContentHubDashboard");
const ContentHubList = lazyWithRetry(() => import("./pages/Admin/ContentHubList"), "ContentHubList");
const ContentHubCreate = lazyWithRetry(() => import("./pages/Admin/ContentHubCreate"), "ContentHubCreate");
const ContentHubEdit = lazyWithRetry(() => import("./pages/Admin/ContentHubEdit"), "ContentHubEdit");
const ContentHubApprovals = lazyWithRetry(() => import("./pages/Admin/ContentHubApprovals"), "ContentHubApprovals");
const TeamChat = lazyWithRetry(() => import("./pages/Admin/TeamChat"), "TeamChat");
const TeamCommunication = lazyWithRetry(() => import("./pages/Admin/TeamCommunication"), "TeamCommunication");



// Helper component for redirects
const RedirectToPortal = () => {
  const { id } = useParams();
  return <Navigate to={`/portal/${id}`} replace />;
};

// Loading fallback component
const PageLoader = () => {
  const { t } = useLocalization();
  const loadingLabel = t('common.loading');
  const label = loadingLabel === 'common.loading' ? 'Loading...' : loadingLabel;

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

// Redirect legacy project edit paths to the projects page with edit intent
const ProjectEditRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    navigate('/projects', { replace: true, state: { editProjectId: id } });
  }, [id, navigate]);

  return <PageLoader />;
};

console.log("[App.tsx] Creating QueryClient...");
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // PHASE 4: Cache optimization for faster loads
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
      retry: 1, // Only retry failed queries once
    },
  },
});
console.log("[App.tsx] QueryClient created with optimized cache settings");

// Redirect component for legacy /schedule/:id route
const ScheduleRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/project-phases?projectId=${id}`} replace />;
};



import { useUserRoles } from "@/hooks/useUserRoles";

const DesktopRouteLayout = ({
  children,
  withSidebarProvider = true,
}: {
  children: ReactNode;
  withSidebarProvider?: boolean;
}) => {
  const location = useLocation();
  const { data: rolesData, isLoading } = useUserRoles();
  const roles = rolesData?.map(r => r.role) || [];
  const isClient = roles.includes('client');
  const isInternalUser = roles.some(role => ['admin', 'project_manager', 'site_supervisor', 'admin_office', 'accountant', 'viewer', 'architect', 'global_admin'].includes(role));
  const isClientRoute = location.pathname.startsWith('/portal') || location.pathname.startsWith('/client-portal');
  const isArchitectOnly = roles.includes('architect') && !roles.some(role => ['admin', 'project_manager', 'site_supervisor', 'admin_office', 'accountant', 'viewer', 'global_admin'].includes(role));
  const path = location.pathname;
  const isArchitectAllowedRoute = path.startsWith('/architect') || path.startsWith('/projects') || path.startsWith('/clientes') || path.startsWith('/contacts') || path.startsWith('/project-phases') || path.startsWith('/projects-timeline') || path.startsWith('/phase-templates') || path.startsWith('/construction-activities') || path.startsWith('/budget-templates') || path.startsWith('/materials-templates') || path.startsWith('/labor-templates') || path.startsWith('/project-wbs-templates') || path.startsWith('/weather');

  // Redirect architect-only users to architect portal only when they try to access routes they are not allowed (e.g. /financial, /settings)
  if (!isLoading && isArchitectOnly && !isArchitectAllowedRoute) {
    return <Navigate to="/architect" replace />;
  }

  // Only force redirect if they are strictly a client and NOT an internal user
  if (!isLoading && isClient && !isInternalUser && !isClientRoute) {
    return <Navigate to="/portal" replace />;
  }

  const layout = (
    <BugRecorderProvider>
      <div className="flex min-h-screen w-full">
        <SkipLink />
        <AppSidebar />
        <SidebarInset>
        <header
          className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4"
          role="banner"
          aria-label="Site header"
        >
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <TopBar />
          </div>
        </header>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-6"
          role="main"
          aria-label="Main content"
        >
          <ScheduledMaintenanceBanner />
          {children}
        </main>
      </SidebarInset>
        {isInternalUser && <FloatingTimeClock />}
      </div>
    </BugRecorderProvider>
  );

  return withSidebarProvider ? layout : layout;
};

const ClientPortalSectionGuard = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAuthenticated, projectId, error } = useClientPortalAuth();

  useEffect(() => {
    logger.debug('[ClientPortalSectionGuard] Guard state update', {
      projectId,
      isLoading,
      isAuthenticated,
      hasError: !!error,
    });
  }, [projectId, isLoading, isAuthenticated, error]);

  if (isLoading) {
    return <PageLoader />;
  }

  return <>{children}</>;
};

const ClientPortalSectionRedirect = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  // Check if user has any projects they can access
  const { data: projects, isLoading, isError, error: queryError } = useQuery({
    queryKey: ["client-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_project_summary" as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const storedProjectId = getStoredClientPortalToken() || (projects as any[])?.[0]?.id;
  const targetPath = storedProjectId
    ? (!section || section === "dashboard"
        ? `/portal/${storedProjectId}`
        : `/portal/${storedProjectId}/${section}`)
    : null;

  useEffect(() => {
    if (isLoading) {
      logger.debug('[ClientPortalSectionRedirect] Loading client projects', { section });
      return;
    }

    if (isError && queryError) {
      logger.error('[ClientPortalSectionRedirect] Failed to load client projects', {
        error: queryError,
      });
    }

    if (!projects || (projects as any[]).length === 0) {
      logger.warn('[ClientPortalSectionRedirect] No client projects found for section redirect, redirecting to main portal', {
        section,
      });
      // Redirect to portal entry when no projects are accessible
      navigate('/portal', { replace: true });
      return;
    }

    if (!storedProjectId) {
      logger.warn('[ClientPortalSectionRedirect] Missing stored project ID for section redirect', {
        section,
        projectCount: (projects as any[]).length,
      });
      return;
    }

    logger.info('[ClientPortalSectionRedirect] Redirecting client portal section', {
      section,
      projectCount: (projects as any[]).length,
      storedProjectId,
      targetPath,
    });
  }, [isLoading, isError, queryError, projects, section, storedProjectId, targetPath, navigate]);

  if (isLoading) {
    return <PageLoader />;
  }

  // If no projects, the useEffect will redirect to /portal
  // If we get here, there are projects but no stored project ID
  if (!storedProjectId) {
    return <ClientPortal />;
  }

  if (!targetPath) {
    return <ClientPortal />;
  }

  return <Navigate to={targetPath} replace />;
};

// Inner App component that uses QueryClient
// This component is wrapped by QueryClientProvider, so it can safely use hooks that depend on it
const AppContent = () => {
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Enable real-time maintenance notifications
  // This hook requires QueryClientProvider to be set up in the parent component
  useMaintenanceNotifications();

  // Subscriber for company_id notification; must run inside TenantProvider
  const CompanyIdNotificationSubscriber = () => {
    useCompanyIdNotification();
    return null;
  };

  // PHASE 2: Component to handle route-based translation loading
  const RouteTranslationLoader = () => {
    const location = useLocation();
    useRouteTranslations();
    // Import chat context lazily to avoid circular deps at module load
    // and update the ChatProvider's currentPage when route changes.
    useEffect(() => {
      const isSupervisor = location.pathname.startsWith('/supervisor');
      document.body.classList.toggle('supervisor-mobile', isSupervisor);

      routeEmitter.emit({ path: location.pathname });
    }, [location.pathname]);
    return null;
  };
  
  return (
    <SidebarProvider>
      <ThemeProvider>
        <TooltipProvider>
          <LocalizationProvider>
            <BrowserRouter>
              <AuthProvider>
              <TenantProvider>
              <CompanyIdNotificationSubscriber />
              <TimeTrackingProvider>
                <TimeTrackerResumeDialog />
                <ChatProvider>
                <AutoSync />
                <RouteTranslationLoader /> {/* PHASE 2: Auto-load translations */}
                <RouterErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Public Routes - No Authentication Required */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/approve/:token" element={<CustomerApprovalPortal />} />
                  <Route path="/po/acknowledge/:token" element={<SupplierPOAcknowledgment />} />
                  <Route path="/architect/portal/:token" element={<ClientPortalViewPage />} />
                  <Route path="/proposal/:token" element={<PublicProposal />} />
                  <Route path="/form/:shareToken" element={<PublicFormPage />} />

                  {/* Tenant onboarding and picker (auth required, no tenant required) */}
                  <Route path="/onboarding" element={<AuthGuard><Suspense fallback={<PageLoader />}><Onboarding /></Suspense></AuthGuard>} />
                  <Route path="/tenant-picker" element={<AuthGuard><Suspense fallback={<PageLoader />}><TenantPicker /></Suspense></AuthGuard>} />

                  {/* CLIENT PORTAL ROUTES - /portal is the only entry; /client-portal redirects to /portal */}
                  <Route path="/portal-error" element={<InvalidToken />} />
                  <Route path="/portal" element={<ClientPortal />} />
                  <Route path="/client-portal" element={<Navigate to="/portal" replace />} />
                  <Route path="/client-portal/documents" element={<ClientPortalDocumentsPage />} />
                  <Route path="/client-portal/section/:section" element={<ClientPortalSectionRedirect />} />
                  <Route path="/client-portal/:id" element={<Navigate to="/portal/:id" replace />} />
                  <Route path="/client-portal/:id/report" element={<Navigate to="/portal/:id/report" replace />} />

                  {/* MOBILE SUPERVISOR ROUTES - NO DESKTOP LAYOUT */}
                  <Route
                    path="/supervisor/*"
                    element={
                      <AuthGuard>
                        <SupervisorProjectProvider>
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route index element={<Navigate to="/supervisor/hub" replace />} />
                              <Route path="hub" element={<SupervisorHub />} />
                              <Route path="deliveries" element={<SupervisorDeliveryPortal />} />
                              <Route path="activity-log" element={<SupervisorActivityLog />} />
                              <Route path="issues" element={<SupervisorIssues />} />
                              <Route path="time-logs" element={<SupervisorTimeLogs />} />
                              <Route path="inspections" element={<SupervisorInspections />} />
                              <Route path="photos" element={<SupervisorPhotoGallery />} />
                              <Route path="deliveries/:poId/verify" element={<DeliveryVerificationScreen />} />
                              <Route path="deliveries/:poId/photos" element={<DeliveryPhotoCaptureScreen />} />
                              <Route path="deliveries/:poId/signature" element={<DeliverySignatureScreen />} />
                              <Route path="deliveries/:poId/success" element={<DeliveryConfirmationSuccess />} />
                              
                              {/* Supervisor Logistics Routes */}
                              <Route path="logistics" element={<SupervisorLogistics />} />
                              <Route path="logistics/deliveries" element={<SupervisorDeliveries />} />
                              <Route path="logistics/inventory" element={<SupervisorInventory />} />
                              <Route path="logistics/scanner" element={<SupervisorScanner />} />
                            </Routes>
                          </Suspense>
                        </SupervisorProjectProvider>
                      </AuthGuard>
                    }
                  />

                  {/* MOBILE APP ROUTES - PWA WITH BOTTOM NAV */}
                  <Route
                    path="/app/*"
                    element={
                      <AuthGuard>
                        <AppProjectProvider>
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route index element={<AppDashboard />} />
                              <Route path="tasks" element={<AppTasks />} />
                              <Route path="chat" element={<AppProjectChat />} />
                              <Route path="finance" element={<AppFinance />} />
                              <Route path="annotations" element={<AppAnnotations />} />
                              <Route path="moodboard" element={<AppMoodboard />} />
                              <Route path="daily-log" element={<AppDailyLog />} />
                              <Route path="weather" element={<AppWeather />} />
                              <Route path="meeting" element={<AppLiveMeeting />} />
                              <Route path="notifications" element={<AppNotifications />} />
                              <Route path="email-review" element={<AppEmailReview />} />
                              <Route path="contacts" element={<AppContacts />} />
                              <Route path="reports" element={<AppReportPreview />} />
                              <Route path="floor-plans" element={<AppFloorPlan />} />
                              <Route path="builder" element={<AppBuilder />} />
                              <Route path="procurement" element={<AppShoppingList />} />
                              <Route path="agenda" element={<AppAgendaBuilder />} />
                              <Route path="meeting-review" element={<AppMeetingReview />} />
                              <Route path="branding" element={<AppBranding />} />
                              <Route path="settings" element={<AppSettings />} />
                              <Route path="more" element={<Navigate to="/app" replace />} />
                            </Routes>
                          </Suspense>
                        </AppProjectProvider>
                      </AuthGuard>
                    }
                  />

                  {/* AI To Work - full-page session in its own tab (no sidebar) */}
                  <Route
                    path="/roadmap/ai-to-work"
                    element={
                      <AuthGuard>
                        <Suspense fallback={<PageLoader />}>
                          <AiToWorkPage />
                        </Suspense>
                      </AuthGuard>
                    }
                  />

                  {/* DESKTOP ROUTES - WITH SIDEBAR/TOPBAR */}
                  <Route
                    path="*"
                    element={
                      <AuthGuard>
                        <TenantGuard>
                        <AppProjectProvider>
                        <ConfigProvider>
                          <DesktopRouteLayout>
                              <Suspense fallback={<PageLoader />}>
                                <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/overall-status" element={<OverallStatus />} />
                                  <Route path="/projects" element={<Projects />} />
                                  <Route path="/projects/new" element={<NewProject />} />
                                  <Route path="/projects/:id/edit" element={<ProjectEditRoute />} />
                                  <Route path="/projects/:id" element={<ProjectDetail />} />
                                  <Route path="/projects/:id/calendar" element={<ProjectCalendar />} />
                                  <Route path="/projects/:id/documents" element={<ProjectDocuments />} />
                                  <Route path="/projects/:projectId/budget" element={<BudgetCreate />} />
                                  <Route path="/projects/:id/budgets" element={<ProjectBudgets />} />
                                  <Route path="/projects/:projectId/budgets/:budgetId" element={<BudgetDetail />} />

                                  {/* Forms Module Routes */}
                                  <Route path="/forms" element={<FormsListPage />} />
                                  <Route path="/forms/new" element={<FormBuilderPage />} />
                                  <Route path="/forms/:id/edit" element={<FormBuilderPage />} />
                                  <Route path="/forms/:id/responses" element={<FormResponsesPage />} />

                                  <Route path="/financial" element={<Financial />} />
                                  <Route path="/financial-ledger" element={<FinancialLedger />} />
                                  <Route path="/finance/cashflow" element={<FinancialCashflow />} />
                                  <Route path="/finance/ar" element={<FinancialAR />} />
                                  <Route path="/finance/ap" element={<FinancialAP />} />
                                  <Route path="/finance/actions" element={<FinancialActionQueue />} />
                                  <Route path="/budget-control" element={<BudgetControl />} />
                  <Route path="/budget-templates" element={<BudgetTemplates />} />
                  <Route path="/budget-templates/:id/edit" element={<BudgetTemplateEdit />} />
                  <Route path="/budget-templates/:id" element={<BudgetTemplateDetail />} />
                                  <Route path="/financial/new" element={<FinancialInvoice />} />
                                  <Route path="/procurement" element={<Procurement />} />
                                  <Route path="/procurement/new" element={<PurchaseRequest />} />
                                  <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                                  <Route path="/approvals" element={<Approvals />} />
                                  <Route path="/estimates" element={<Estimates />} />
                                  <Route path="/estimates/new" element={<EstimateWizard />} />
                                  <Route path="/estimates/:id" element={<EstimateDetail />} />
                                  <Route path="/estimates/:estimateId/proposal" element={<ProposalBuilder />} />
                                  <Route path="/architect" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectDashboardPage /></RoleGuard>} />
                                  <Route path="/architect/sales-pipeline" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><SalesPipelinePage /></RoleGuard>} />
                                  <Route path="/architect/tasks" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectTasksPage /></RoleGuard>} />
                                  <Route path="/architect/projects" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectProjectsListPage /></RoleGuard>} />
                                  <Route path="/architect/projects/:id" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectProjectDetailPage /></RoleGuard>} />
                                  <Route path="/architect/meetings" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectMeetingsPage /></RoleGuard>} />
                                  <Route path="/architect/projects/:id/moodboard" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectProjectMoodboardPage /></RoleGuard>} />
                                  <Route path="/architect/reports" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectReportsPage /></RoleGuard>} />
                                  <Route path="/architect/clients" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectClientManagementPage /></RoleGuard>} />
                                  <Route path="/architect/portfolio" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectPortfolioPage /></RoleGuard>} />
                                  <Route path="/architect/time-tracking" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectTimeTrackingPage /></RoleGuard>} />
                                  <Route path="/financial-overview" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectFinancialPage /></RoleGuard>} />
                                  <Route path="/proposals" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><ArchitectProposalBuilderPage /></RoleGuard>} />
                                  <Route path="/architect/my-dashboard" element={<RoleGuard allowedRoles={["architect", "admin", "project_manager", "global_admin"]}><MyDashboard /></RoleGuard>} />
                                  <Route path="/clientes" element={<Clientes />} />
                                  <Route path="/clientes/new" element={<Cliente />} />
                                  <Route path="/clientes/:id" element={<Cliente />} />
                                  <Route path="/client-access" element={<ClientAccessManagement />} />
                                  <Route path="/client-access/analytics" element={<ClientAccessAnalytics />} />
                                   <Route path="/client-access/audit-log" element={<ClientAccessAuditLog />} />
                                   <Route path="/client-portal-tokens" element={<ClientPortalTokenManagement />} />

                                   <Route path="/portal/:id">
                                     <Route index element={<ProjectDetail />} />
                                     <Route path="schedule" element={<ClientPortalSchedule />} />
                                     <Route path="team" element={<ClientPortalTeam />} />
                                    <Route path="tasks" element={<ClientPortalTasks />} />
                                    <Route path="definitions" element={<ClientPortalDefinitions />} />
                                    <Route path="meetings" element={<ClientPortalMeetings />} />
                                     <Route path="communication" element={<ClientPortalCommunication />} />
                                     <Route path="chat" element={<ClientPortalChat />} />
                                     <Route path="payments" element={<ClientPortalPayments />} />
                                     <Route path="financial" element={<ClientPortalFinancial />} />
                                     <Route path="inss-planning" element={<ClientPortalINSSPlanning />} />
                                     <Route path="inss-strategy" element={<ClientPortalINSSStrategy />} />
                                     <Route path="photos" element={<ClientPortalPhotos />} />
                                     <Route path="documents" element={<PortalDocumentsPage />} />
                                     <Route path="report" element={<ClientReport />} />
                                   </Route>

                                     <Route path="/reports" element={<Reports />} />
                                   <Route path="/financial/cashflow" element={<FinancialCashflow />} />
                                   <Route path="/financial/collections" element={<FinancialCollections />} />
                                   <Route path="/financial/payments" element={<FinancialPayments />} />
                                   <Route path="/chat" element={<TeamChat />} />
                                   <Route path="/castormind-ai" element={<CastorMindAI />} />
                                   <Route path="/castormind-ai/analytics" element={<CastorMindAIAnalytics />} />

                                   <Route path="/communicationlog" element={<TeamCommunication />} />
                                   <Route path="/settings" element={<Settings />} />

                                   {/* Field Logistics Mobile Routes */}
                                   <Route path="/mobile/logistics" element={<MobileLogisticsHome />} />
                                   <Route path="/mobile/logistics/deliveries" element={<MobileDeliveries />} />
                                   <Route path="/mobile/logistics/scanner" element={<MobileScanner />} />
                                   <Route path="/mobile/logistics/inventory" element={<MobileInventory />} />

                                  <Route path="/notifications" element={<NotificationCenter />} />
                                  <Route path="/materials-templates" element={<MaterialsTemplates />} />
                                  <Route path="/labor-templates" element={<LaborTemplates />} />
                                  <Route path="/materials-labor" element={<Navigate to="/materials-templates" replace />} />
                                  <Route path="/materials-labor/view" element={<MaterialsLabor />} />
                                  <Route path="/materials-labor/edit" element={<MaterialsLabor />} />
                                  <Route path="/materials" element={<Navigate to="/materials-labor" replace />} />
                                  <Route path="/contractors" element={<Navigate to="/contacts" replace />} />
                                  <Route path="/contacts" element={<ContactsList />} />
                                  <Route path="/campaigns" element={<Campaigns />} />
                                  <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
                                  <Route path="/admin/maintenance" element={<MaintenanceManagement />} />
                                  <Route path="/admin/tenants" element={<RoleGuard allowedRoles={["super_admin"]}><TenantList /></RoleGuard>} />
                                  <Route path="/admin/tenants/:id/modules" element={<RoleGuard allowedRoles={["super_admin"]}><TenantModules /></RoleGuard>} />
                                   <Route path="/admin/telemetry" element={<TelemetryIssues />} />
                                   <Route path="/payments" element={<PaymentDashboard />} />

                                  <Route path="/payments/:paymentId" element={<PaymentProcessing />} />
                                  <Route path="/payments/:paymentId/process" element={<PaymentProcessing />} />
                                  <Route path="/status" element={<Status />} />
                                  <Route path="/projects/:id/materials" element={<MaterialsLabor />} />
                                  <Route path="/projects/:id/materials/edit" element={<ProjectMaterialsEdit />} />
                                  <Route path="/projects/:id/labor/edit" element={<ProjectLaborEdit />} />
                                  {/* Deprecated: /schedule/:id redirects handled in app */}
                                  <Route path="/ai-insights" element={<AIInsights />} />
                                   <Route path="/documentation" element={<Documentation />} />
                                  <Route path="/documentation/viewer" element={<DocumentViewer />} />
                                   <Route path="/releases-report" element={<ReleasesReport />} />
                                  <Route path="/roadmap" element={<Roadmap />} />
                                  <Route path="/roadmap/analytics" element={<RoadmapAnalytics />} />
                                  <Route path="/projects-timeline" element={<ProjectsTimelinePage />} />
                                  <Route path="/task-management" element={<TaskManagementPage />} />
                                  <Route path="/calendar" element={<CalendarPage />} />
                                  <Route path="/activity-calendar" element={<ProjectActivityCalendar />} />
                                  <Route path="/analytics" element={<Analytics />} />
                                  <Route path="/weather" element={<Weather />} />
                                  <Route path="/contractors" element={<Contractors />} />
                                  <Route path="/admin/db" element={<DBExportImport />} />
                                  <Route path="/construction-activities" element={<ConstructionActivities />} />
                                  <Route path="/construction-activities/:id/edit" element={<ActivityTemplateEdit />} />
                                  <Route path="/construction-activities/:id" element={<ActivityTemplateDetail />} />
                                  <Route path="/schedule/:id" element={<ScheduleRedirect />} />
                                  <Route path="/project-phases" element={<ProjectPhases />} />
                                  <Route path="/phase-templates" element={<PhaseTemplates />} />
                                  <Route path="/phase-templates/:id/edit" element={<PhaseTemplateEdit />} />
                                  <Route path="/phase-templates/:id" element={<PhaseTemplateDetail />} />
                                  <Route path="/project-wbs-templates" element={<ProjectWbsTemplates />} />
                                  <Route path="/project-wbs-templates/new" element={<ProjectWbsTemplateEditor />} />
                                  <Route path="/project-wbs-templates/:id" element={<ProjectWbsTemplateEditor key={`wbs-${i18n.language}`} />} />
                                  <Route path="/whatsapp-templates" element={<WhatsAppTemplates />} />
                                  <Route path="/notifications" element={<Notifications />} />
                                  <Route path="/rls-test" element={<RLSTest />} />
                                  <Route path="/admin/roles" element={<RoleManagement />} />
                                  <Route path="/admin/audit-logs" element={<AuditLogs />} />
                                  {/* Content Hub Routes */}
                                  <Route path="/news" element={<NewsHub />} />
                                  <Route path="/articles" element={<ArticlesHub />} />
                                  <Route path="/faq" element={<FaqHub />} />
                                  <Route path="/documents" element={<DocumentsHub />} />
                                  <Route path="/content/:slug" element={<ContentDetail />} />
<Route path="/admin/content-hub" element={<RoleGuard allowedRoles={["admin", "editor", "global_admin"]}><ContentHubDashboard /></RoleGuard>} />
                                   <Route path="/admin/content-hub/list" element={<RoleGuard allowedRoles={["admin", "editor", "global_admin"]}><ContentHubList /></RoleGuard>} />
                                   <Route path="/admin/content-hub/create" element={<RoleGuard allowedRoles={["admin", "editor", "global_admin"]}><ContentHubCreate /></RoleGuard>} />
                                   <Route path="/admin/content-hub/:id/edit" element={<RoleGuard allowedRoles={["admin", "editor", "global_admin"]}><ContentHubEdit /></RoleGuard>} />
                                   <Route path="/admin/content-hub/approvals" element={<RoleGuard allowedRoles={["admin", "editor", "global_admin"]}><ContentHubApprovals /></RoleGuard>} />
                                   <Route path="*" element={<NotFound />} />
                                </Routes>
                              </Suspense>
                          </DesktopRouteLayout>
                        </ConfigProvider>
                        </AppProjectProvider>
                        </TenantGuard>
                      </AuthGuard>
                    }
                  />
              </Routes>
                  </Suspense>
                </RouterErrorBoundary>
                <Toaster />
                <Sonner />
                <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
                {/* <TranslationDevTools /> */}
                </ChatProvider>
              </TimeTrackingProvider>
              </TenantProvider>
              </AuthProvider>
            </BrowserRouter>
          </LocalizationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SidebarProvider>
  );
};

const App = () => {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  // Check if i18next is already initialized (it initializes on module import)
  const [i18nReady, setI18nReady] = useState(() => i18n.isInitialized && hasI18nResources());

  useEffect(() => {
    console.log("[App.tsx] App component mounted");
    console.log("[App.tsx] i18next.isInitialized:", i18n.isInitialized);
    console.log("[App.tsx] i18next.language:", i18n.language);

    // If i18next is not initialized or missing resources, wait for initialization to complete
    if (!i18n.isInitialized || !hasI18nResources()) {
      console.log("[App.tsx] Waiting for i18next to initialize...");
      i18nInitPromise.then(() => {
        console.log("[App.tsx] i18next initialization complete");
        // Double-check resources are loaded
        if (hasI18nResources()) {
          console.log("[App.tsx] i18next resources verified");
          setI18nReady(true);
        } else {
          console.error("[App.tsx] i18next initialized but resources missing!");
          logger.error("[App.tsx] i18next initialized but resources missing!");
          // Try to force set ready anyway to prevent infinite loading
          setI18nReady(true);
        }
      }).catch(err => {
        console.error('[App.tsx] i18next initialization failed:', err);
        logger.error('[App.tsx] i18next initialization failed:', err);
        // Still set ready to true to prevent infinite loading
        setI18nReady(true);
      });
    }

    // Check maintenance mode
    isMaintenanceMode().then(setMaintenanceMode);

    // PHASE 5: Warm cache on startup (non-blocking)
    warmCache().catch(err => {
      console.error('[App.tsx] Cache warming failed:', err);
      logger.error('[App.tsx] Cache warming failed:', err);
    });

    return () => console.log("[App.tsx] App component unmounting");
  }, []);

  console.log("[App.tsx] Rendering App component, i18nReady:", i18nReady, "maintenanceMode:", maintenanceMode);

  // Show loader while i18n is initializing or checking maintenance mode
  if (!i18nReady || maintenanceMode === null) {
    return <PageLoader />;
  }

  // Check if maintenance mode is enabled
  if (maintenanceMode) {
    return (
      <ThemeProvider>
        <Suspense fallback={<PageLoader />}>
          <Maintenance />
        </Suspense>
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
