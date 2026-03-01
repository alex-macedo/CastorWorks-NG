import { useCallback } from 'react';

// Map of route paths to their lazy loaded components
const routeComponentMap: Record<string, () => Promise<any>> = {
  '/': () => import('@/pages/Dashboard'),
  '/overall-status': () => import('@/pages/OverallStatus'),
  '/projects': () => import('@/pages/Projects'),
  '/projects/new': () => import('@/pages/NewProject'),
  '/projects/:id': () => import('@/pages/ProjectDetail'),
  '/projects/:id/documents': () => import('@/pages/ProjectDocuments'),
  '/financial': () => import('@/pages/Financial'),
  '/financial-ledger': () => import('@/pages/FinancialLedger'),
  '/budget-control': () => import('@/pages/BudgetControl'),
  '/financial/new': () => import('@/pages/FinancialInvoice'),
  '/procurement': () => import('@/pages/Procurement'),
  '/procurement/new': () => import('@/pages/PurchaseRequest'),
  '/purchase-orders': () => import('@/pages/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })),
  '/purchase-orders/:id': () => import('@/pages/PurchaseOrderDetailPage'),
  '/supervisor/deliveries': () => import('@/pages/SupervisorDeliveryPortal'),
  '/approvals': () => import('@/pages/Approvals'),
  '/clientes': () => import('@/pages/Clientes'),
  '/clientes/new': () => import('@/pages/Cliente'),
  '/clientes/:id': () => import('@/pages/Cliente'),
  '/client-access': () => import('@/pages/ClientAccessManagement'),
  '/portal': () => import('@/pages/ClientPortal'),
  '/reports': () => import('@/pages/Reports'),
  '/materials-labor': () => import('@/pages/MaterialsLabor'),
  '/projects/:id/materials': () => import('@/pages/MaterialsLabor'),
  '/budget-templates/:id': () => import('@/pages/BudgetTemplateDetail'),
  '/budget-templates/:id/edit': () => import('@/pages/BudgetTemplateEdit'),
  // '/contractors' - deprecated, merged into /contacts
  // '/schedule/:id' - deprecated, merged into /project-phases
  '/ai-insights': () => import('@/pages/AIInsights'),
  '/documentation': () => import('@/pages/Documentation'),
  '/roadmap': () => import('@/pages/Roadmap'),
  '/roadmap/analytics': () => import('@/pages/RoadmapAnalytics'),
  '/analytics': () => import('@/pages/Analytics'),
  '/weather': () => import('@/pages/Weather'),
  '/construction-activities': () => import('@/pages/ConstructionActivities'),
  '/project-phases': () => import('@/pages/ProjectPhases'),
  '/phase-templates': () => import('@/pages/PhaseTemplates'),
  '/settings': () => import('@/pages/Settings'),
  '/notifications': () => import('@/pages/Notifications'),
  '/admin/audit-logs': () => import('@/pages/AuditLogs'),
  '/admin/roles': () => import('@/pages/RoleManagement'),
  '/admin/telemetry': () => import('@/pages/Admin/TelemetryIssues'),
  '/payments': () => import('@/pages/PaymentDashboard'),
  '/payments/:paymentId': () => import('@/pages/PaymentProcessing'),
};

// Cache to store prefetched components
const prefetchCache = new Set<string>();

export function usePrefetch() {
  const prefetch = useCallback((path: string) => {
    // Normalize path by removing parameters and query strings
    const normalizedPath = path.split('?')[0];
    
    // Check if already prefetched
    if (prefetchCache.has(normalizedPath)) {
      return;
    }

    // Find matching route in map (exact match first, then pattern match)
    let loader = routeComponentMap[normalizedPath];
    
    // If no exact match, try to find a pattern match
    if (!loader) {
      for (const [pattern, loaderFn] of Object.entries(routeComponentMap)) {
        if (pattern.includes(':') && normalizedPath.startsWith(pattern.split(':')[0])) {
          loader = loaderFn;
          break;
        }
      }
    }
    
    if (loader) {
      // Prefetch the component
      loader().then(() => {
        prefetchCache.add(normalizedPath);
      }).catch((error) => {
        console.warn(`Failed to prefetch route ${normalizedPath}:`, error);
      });
    }
  }, []);

  return { prefetch };
}
