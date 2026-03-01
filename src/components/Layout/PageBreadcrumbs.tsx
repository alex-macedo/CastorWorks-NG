import * as React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

const breadcrumbNames: Record<string, string> = {
  '': 'navigation.dashboard',
  'projects': 'navigation.projects',
  'new': 'common.new',
  'financial': 'navigation.financials',
  'materials': 'navigation.materials',
  'schedule': 'navigation.schedule',
  'clientes': 'navigation.clients',
  'procurement': 'navigation.procurement',
  'reports': 'navigation.reports',
  'settings': 'navigation.settings',
  'client-portal': 'navigation.clientPortal',
  'portal': 'navigation.clientPortal',
  'budget-control': 'navigation.budgetControl',
  'overall-status': 'navigation.overallStatus',
  'manage': 'navigation.manage',
};

export function PageBreadcrumbs() {
  const location = useLocation();
  const { t } = useLocalization();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null; // Don't show breadcrumbs on homepage
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Check if segment is a UUID (project/client ID)
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    
    const labelKey = breadcrumbNames[segment];
    
    // Determine the redirect for portal links
    const finalPath = path;
    if (segment === 'portal' && !isLast) {
      // If portal is followed by an ID, the link for 'portal' itself should stay as is 
      // OR we can make it unclickable if needed.
    }

    return {
      path: finalPath,
      label: isId ? t('navigation.details') : labelKey ? t(labelKey) : segment,
      isLast,
      isPortalRoot: segment === 'portal'
    };
  });

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast || crumb.isPortalRoot ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}