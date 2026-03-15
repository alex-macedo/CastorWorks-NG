import {
  LayoutDashboard,
  BarChart3,
  Brain,
  Folder,
  List as ListIcon,
  ShoppingCart,
  ClipboardList,
  Sliders,
  Users,
  DollarSign,
  BookOpen,
  Wallet,
  CreditCard,
  FileText,
  Package,
  Layers,
  Truck,
  BookText,
  Settings as SettingsIcon,
  Briefcase,
  UserCircle,
  Languages,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckSquare,
  Calculator,
  Ruler,
  TrendingUp,
  ListTodo,
  Calendar,
  Image,
  Send,
  KanbanSquare,
  CalendarRange,
  MessageSquare,
  MessageCircle,
  Copy,
  ListTree,
  RefreshCw,
  Newspaper,
  FileQuestion,
  FileStack,
  Edit,
  Receipt,
  Bot,
  Wrench,
  Database,
  Activity,
  Smartphone,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRoles";

export type SidebarTabConfig = {
  id: string;
  titleKey?: string;
  title?: string;
  path: string;
  icon: LucideIcon;
};

export type SidebarOptionConfig = {
  id: string;
  titleKey?: string;
  title?: string;
  type: "link" | "collapsible";
  icon: LucideIcon;
  path?: string;
  tabs: SidebarTabConfig[];
  /** Module ID required for this option to be visible (license gating). */
  required_module?: string;
  /**
   * @deprecated This field is kept for backward compatibility and fallback scenarios.
   * Permissions are now managed in the database via `sidebar_option_permissions` and `sidebar_tab_permissions` tables.
   * The AppSidebar component will use database permissions when available, falling back to this array if needed.
   */
  allowedRoles: AppRole[];
};

export const ALL_ROLES: AppRole[] = ["admin", "project_manager", "site_supervisor", "admin_office", "client", "viewer", "accountant", "editor", "architect", "global_admin"];

/** Platform-team roles. Not tenant-facing; kept separate from ALL_ROLES intentionally. */
export const PLATFORM_ROLES: AppRole[] = ["platform_owner", "platform_support", "platform_sales"];

export const ROLE_LABEL_KEYS: Record<AppRole, string> = {
  admin: "settings:roleAdmin",
  project_manager: "settings:roleProjectManager",
  site_supervisor: "settings:roleSiteSupervisor",
  admin_office: "settings:roleAdminOffice",
  client: "settings:roleClient",
  viewer: "settings:roleViewer",
  accountant: "settings:roleAccountant",
  editor: "settings:roleEditor",
  architect: "settings:roleArchitect",
  global_admin: "settings:roleGlobalAdmin",
  super_admin: "settings:roleSuperAdmin",
  platform_owner: "settings:rolePlatformOwner",
  platform_support: "settings:rolePlatformSupport",
  platform_sales: "settings:rolePlatformSales",
  supervisor: "settings:roleSiteSupervisor", // Fallback
};

export const ROLE_DESCRIPTION_KEYS: Record<AppRole, string> = {
  admin: "settings:roleDescriptions.admin",
  project_manager: "settings:roleDescriptions.project_manager",
  site_supervisor: "settings:roleDescriptions.site_supervisor",
  admin_office: "settings:roleDescriptions.admin_office",
  client: "settings:roleDescriptions.client",
  viewer: "settings:roleDescriptions.viewer",
  accountant: "settings:roleDescriptions.accountant",
  editor: "settings:roleDescriptions.editor",
  architect: "settings:roleDescriptions.architect",
  global_admin: "settings:roleDescriptions.global_admin",
  super_admin: "settings:roleDescriptions.super_admin",
  platform_owner: "settings:roleDescriptions.platform_owner",
  platform_support: "settings:roleDescriptions.platform_support",
  platform_sales: "settings:roleDescriptions.platform_sales",
  supervisor: "settings:roleDescriptions.site_supervisor", // Fallback
};

/**
 * Sidebar options configuration.
 * 
 * NOTE: The `allowedRoles` arrays in this configuration are now DEPRECATED.
 * Permissions are managed in the database via `sidebar_option_permissions` and `sidebar_tab_permissions` tables.
 * This configuration is kept for:
 * - Reference of available sidebar options
 * - Fallback when database permissions are not available
 * - Initial seeding of permissions (see migration)
 * 
 * To modify permissions, use the Role Permissions Management UI in Settings.
 */
export const SIDEBAR_OPTIONS: SidebarOptionConfig[] = [
  {
    id: "dashboard",
    titleKey: "navigation.dashboard",
    type: "link",
    icon: LayoutDashboard,
    path: "/",
    tabs: [
      { id: "dashboard-overview", titleKey: "navigation.dashboard", path: "/", icon: LayoutDashboard },
    ],
     allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant"],
  },
  {
    id: "my-workspace",
    titleKey: "navigation.myWorkspace",
    type: "collapsible",
    icon: UserCircle,
    tabs: [
      { id: "architect-my-dashboard", titleKey: "navigation.myDashboard", path: "/architect/my-dashboard", icon: LayoutDashboard },
      { id: "architect-tasks", titleKey: "navigation.architectTasks", path: "/architect/tasks", icon: ListTodo },
      { id: "architect-timesheet", titleKey: "navigation.myTimesheet", path: "/architect/time-tracking", icon: Clock },
    ],
    allowedRoles: ["admin", "project_manager", "architect"],
  },
  {
    id: "castormind-ai",
    titleKey: "navigation.castormindAI",
    type: "collapsible",
    icon: Brain,
    required_module: "ai_core",
    tabs: [
      { id: "overall-status", titleKey: "navigation.overallStatus", path: "/overall-status", icon: BarChart3 },
      { id: "analytics", titleKey: "navigation.analytics", path: "/analytics", icon: BarChart3 },
      { id: "ai-insights", titleKey: "navigation.aiInsights", path: "/ai-insights", icon: Brain },
      { id: "architect-financial", titleKey: "navigation.financialOverview", path: "/financial-overview", icon: DollarSign },
      { id: "architect-proposals", titleKey: "navigation.proposals", path: "/proposals", icon: FileText },
    ],
     allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "architect"],
  },
  {
    id: "projects",
    titleKey: "navigation.projects",
    type: "collapsible",
    icon: Folder,
    tabs: [
      { id: "clients", titleKey: "navigation.clients", path: "/clientes", icon: Users },
      { id: "projects-all", titleKey: "navigation.allProjects", path: "/projects", icon: ListIcon },
      { id: "project-schedule", titleKey: "navigation.projectSchedule", path: "/project-phases", icon: Calendar },
      { id: "projects-overview", titleKey: "navigation.projectsOverview", path: "/projects-timeline", icon: CalendarRange },
      { id: "projects-estimates", titleKey: "navigation.estimates", path: "/estimates", icon: Calculator },
      { id: "procurement", titleKey: "navigation.procurement", path: "/procurement", icon: ShoppingCart },
      { id: "purchase-orders", titleKey: "navigation.purchaseOrders", path: "/purchase-orders", icon: ClipboardList },
    ],
    allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office"],
  },
    {
      id: "team-workspace",
      titleKey: "navigation.officeAdmin",
      type: "collapsible",
      icon: Briefcase,
      tabs: [
        { id: "team-chat", titleKey: "navigation.teamChat", path: "/chat", icon: MessageCircle },
        { id: "team-communication", titleKey: "navigation.teamCommunication", path: "/communicationlog", icon: MessageSquare },
        { id: "client-access", titleKey: "navigation.clientAccess", path: "/client-access", icon: UserCircle },
        { id: "contacts", titleKey: "navigation.contacts", path: "/contacts", icon: Users },
        { id: "campaigns", titleKey: "navigation.campaigns", path: "/campaigns", icon: Send },
        { id: "forms", titleKey: "navigation.forms", path: "/forms", icon: FileQuestion },
        { id: "reports", titleKey: "navigation.reports", path: "/reports", icon: FileText },
        { id: "team-task-management", titleKey: "navigation.teamTaskManagement", path: "/task-management", icon: KanbanSquare },
      ],
      allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "architect", "accountant", "editor"],
    },
   {
     id: "financials",
     titleKey: "navigation.financials",
     type: "collapsible",
     icon: DollarSign,
     required_module: "financial_full",
     tabs: [
       { id: "financial", titleKey: "navigation.management", path: "/financial", icon: DollarSign },
        { id: "financial-cashflow", titleKey: "navigation.financialCashflow", path: "/finance/cashflow", icon: TrendingUp },
        { id: "financial-collections", titleKey: "navigation.financialCollections", path: "/financial/collections", icon: ShieldAlert },
        { id: "financial-ar", titleKey: "navigation.financialAR", path: "/finance/ar", icon: Receipt },

       { id: "financial-ap", titleKey: "navigation.financialAP", path: "/finance/ap", icon: CreditCard },
       { id: "financial-actions", titleKey: "navigation.financialActions", path: "/finance/actions", icon: Bot },
       { id: "ledger", titleKey: "navigation.ledger", path: "/financial-ledger", icon: BookOpen },
       { id: "financial-payments", titleKey: "navigation.financialPayments", path: "/financial/payments", icon: Wallet },
       { id: "budget-control", titleKey: "navigation.budgetControl", path: "/budget-control", icon: Wallet },
       { id: "payments", titleKey: "navigation.payments", path: "/payments", icon: CreditCard },
     ],
     allowedRoles: ["admin", "project_manager", "admin_office"],
   },
  {
    id: "templates",
    titleKey: "navigation.templates",
    type: "collapsible",
    icon: Copy,
    required_module: "templates",
    tabs: [
      { id: "budget-templates", titleKey: "navigation.budgetTemplates", path: "/budget-templates", icon: Copy },
      { id: "materials-templates", titleKey: "navigation.materials", path: "/materials-templates", icon: Package },
      { id: "labor-templates", titleKey: "navigation.labor", path: "/labor-templates", icon: Users },
      { id: "phase-templates", titleKey: "navigation.phaseTemplates", path: "/phase-templates", icon: Layers },
      { id: "construction-activities", titleKey: "navigation.constructionActivities", path: "/construction-activities", icon: ListIcon },
      { id: "project-wbs", titleKey: "navigation.projectWbs", path: "/project-wbs-templates", icon: ListTree },
      { id: "whatsapp-templates", titleKey: "navigation.whatsAppTemplates", path: "/whatsapp-templates", icon: MessageSquare },
    ],
    allowedRoles: ["admin", "project_manager", "admin_office", "site_supervisor"],
  },
  {
    id: "architect",
    titleKey: "navigation.architect",
    type: "collapsible",
    icon: Ruler,
    required_module: "architect_portal",
    tabs: [
      { id: "architect-dashboard", titleKey: "navigation.architectDashboard", path: "/architect", icon: LayoutDashboard },
      { id: "architect-projects", titleKey: "navigation.architectProjects", path: "/architect/projects", icon: Folder },
      { id: "architect-schedule", titleKey: "navigation.projectSchedule", path: "/project-phases", icon: Calendar },
      { id: "architect-projects-overview", titleKey: "navigation.projectsOverview", path: "/projects-timeline", icon: CalendarRange },
      { id: "sales-pipeline", titleKey: "navigation.salesPipeline", path: "/architect/sales-pipeline", icon: TrendingUp },
      { id: "calendar", titleKey: "navigation.calendar", path: "/calendar", icon: Calendar },
      { id: "architect-meetings", titleKey: "navigation.architectMeetings", path: "/architect/meetings", icon: Calendar },
      { id: "architect-clients", titleKey: "navigation.clients", path: "/architect/clients", icon: Users },
      { id: "architect-contacts", titleKey: "navigation.contacts", path: "/contacts", icon: Users },
      { id: "architect-reports", titleKey: "navigation.reports", path: "/architect/reports", icon: FileText },
      { id: "architect-portfolio", titleKey: "navigation.architectPortfolio", path: "/architect/portfolio", icon: Image },
    ],
    allowedRoles: ["admin", "project_manager", "architect"],
  },
  {
    id: "mobile-app",
    titleKey: "navigation.mobileApp",
    type: "link",
    icon: Smartphone,
    required_module: "mobile_app",
    path: "/app",
    tabs: [
      { id: "mobile-app-main", titleKey: "navigation.mobileApp", path: "/app", icon: Smartphone },
    ],
    allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "architect", "editor"],
  },
  {
    id: "supervisor",
    titleKey: "navigation.supervisorPortal",
    type: "link",
    icon: Truck,
    required_module: "supervisor_portal",
    path: "/supervisor/hub",
    tabs: [
      { id: "supervisor-hub", titleKey: "navigation.supervisorHub", path: "/supervisor/hub", icon: LayoutDashboard },
    ],
    allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "architect", "editor"],
  },
  {
    id: "client-portal",
    titleKey: "navigation.clientPortal",
    type: "collapsible",
    icon: UserCircle,
    required_module: "client_portal",
    tabs: [
      { id: "client-portal-dashboard", titleKey: "navigation.clientPortalDashboard", path: "/client-portal/section/dashboard", icon: LayoutDashboard },
      { id: "client-portal-inss-planning", titleKey: "clientPortal.navigation.inssPlanning", path: "/client-portal/section/inss-planning", icon: Calculator },
      { id: "client-portal-inss-strategy", titleKey: "clientPortal.navigation.inssStrategy", path: "/client-portal/section/inss-strategy", icon: CheckSquare },
      { id: "client-portal-schedule", titleKey: "navigation.clientPortalSchedule", path: "/client-portal/section/schedule", icon: Calendar },
      { id: "client-portal-tasks", titleKey: "navigation.clientPortalTasks", path: "/client-portal/section/tasks", icon: ListTodo },
      { id: "client-portal-meetings", titleKey: "navigation.clientPortalMeetings", path: "/client-portal/section/meetings", icon: Calendar },
      { id: "client-portal-communication", titleKey: "navigation.clientPortalCommunication", path: "/client-portal/section/communication", icon: MessageSquare },
      { id: "client-portal-chat", titleKey: "navigation.clientPortalChat", path: "/client-portal/section/chat", icon: MessageCircle },
      { id: "client-portal-payments", titleKey: "navigation.clientPortalPayments", path: "/client-portal/section/payments", icon: CreditCard },
      { id: "client-portal-financial", titleKey: "navigation.clientPortalFinancial", path: "/client-portal/section/financial", icon: TrendingUp },
      { id: "client-portal-photos", titleKey: "navigation.clientPortalPhotos", path: "/client-portal/section/photos", icon: Image },
      { id: "client-portal-documents", titleKey: "navigation.clientPortalDocuments", path: "/client-portal/documents", icon: FileText },
      { id: "client-portal-switch", titleKey: "navigation.switchProject", path: "/portal", icon: RefreshCw },
    ],
    allowedRoles: ["client", "admin", "project_manager"],
  },
  {
    id: "content-hub",
    titleKey: "navigation.contentHub",
    type: "collapsible",
    icon: FileStack,
    required_module: "content_hub",
    tabs: [
      { id: "news", titleKey: "navigation.news", path: "/news", icon: Newspaper },
      { id: "articles", titleKey: "navigation.articles", path: "/articles", icon: FileText },
      { id: "documents", titleKey: "navigation.documents", path: "/documents", icon: FileStack },
      { id: "faq", titleKey: "navigation.faq", path: "/faq", icon: FileQuestion },
    ],
    allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant", "editor"],
  },
  {
    id: "content-hub-admin",
    titleKey: "navigation.contentHubAdmin",
    type: "collapsible",
    icon: Edit,
    required_module: "content_hub",
    tabs: [
      { id: "content-hub-dashboard", titleKey: "navigation.contentHubDashboard", path: "/admin/content-hub", icon: LayoutDashboard },
      { id: "content-hub-list", titleKey: "navigation.contentHubList", path: "/admin/content-hub/list", icon: ListIcon },
      { id: "content-hub-create", titleKey: "navigation.contentHubCreate", path: "/admin/content-hub/create", icon: Edit },
      { id: "content-hub-approvals", titleKey: "navigation.contentHubApprovals", path: "/admin/content-hub/approvals", icon: CheckSquare },
    ],
    allowedRoles: ["admin", "editor"],
  },

  {
    id: "documentation",
    titleKey: "navigation.documentation",
    type: "link",
    icon: BookText,
    path: "/documentation",
    tabs: [
      { id: "documentation", titleKey: "navigation.documentation", path: "/documentation", icon: BookText },
    ],
     allowedRoles: ["admin", "project_manager", "site_supervisor", "admin_office", "viewer", "accountant"],
  },
  {
    id: "settings",
    titleKey: "navigation.settings",
    type: "link",
    icon: SettingsIcon,
    path: "/settings",
    tabs: [
      { id: "settings", titleKey: "navigation.settings", path: "/settings", icon: SettingsIcon },
    ],
    allowedRoles: ["admin"],
  },
  {
    id: "platform-workspace",
    titleKey: "navigation.platformWorkspace",
    type: "collapsible",
    icon: Building2,
    tabs: [
      { id: "platform-dashboard", titleKey: "navigation.platformDashboard", path: "/platform", icon: LayoutDashboard },
      { id: "platform-support-chat", titleKey: "navigation.platformSupportChat", path: "/platform/support-chat", icon: MessageCircle },
      { id: "platform-campaigns", titleKey: "navigation.platformCampaigns", path: "/platform/campaigns", icon: Send },
      { id: "platform-contacts", titleKey: "navigation.platformContacts", path: "/platform/contacts", icon: Users },
      { id: "platform-forms", titleKey: "navigation.platformForms", path: "/platform/forms", icon: FileQuestion },
      { id: "platform-tasks", titleKey: "navigation.platformTasks", path: "/platform/tasks", icon: KanbanSquare },
      { id: "platform-communication-log", titleKey: "navigation.platformCommunicationLog", path: "/platform/communication-log", icon: MessageSquare },
      { id: "platform-customers", titleKey: "navigation.platformCustomers", path: "/platform/customers", icon: Briefcase },
      { id: "platform-global-templates", titleKey: "navigation.platformGlobalTemplates", path: "/platform/global-templates", icon: Copy },
    ],
    allowedRoles: ["platform_owner", "platform_support", "platform_sales", "super_admin"],
  },
];
