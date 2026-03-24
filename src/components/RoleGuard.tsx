import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { AppRole } from "@/hooks/useUserRoles";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles();
  const [isChecking, setIsChecking] = useState(true);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);

  const userRoleList = roles.map(r => r.role);
  const hasAccess = userRoleList.some(role => allowedRoles.includes(role as AppRole));
  
  // Determine redirect destination based on user roles
  const getRedirectDestination = (): string => {
    if (redirectTo) return redirectTo;
    
    // If user is architect-only, redirect to architect portal
    const isArchitectOnly = userRoleList.includes('architect') && 
      !userRoleList.some(role => ['admin', 'project_manager', 'site_supervisor', 'admin_office', 'accountant', 'viewer'].includes(role));
    if (isArchitectOnly) return '/architect';
    
    // Default redirect
    return '/';
  };

  useEffect(() => {
    if (!rolesLoading) {
      setIsChecking(false);
      if (!hasAccess && userRoleList.length > 0) {
        // User is authenticated but doesn't have the required role
        setShowAccessDeniedModal(true);
      } else if (!hasAccess && userRoleList.length === 0) {
        // User has no roles - let AuthGuard handle this
      }
    }
  }, [rolesLoading, hasAccess, userRoleList]);

  const handleAccessDeniedClose = () => {
    setShowAccessDeniedModal(false);
    navigate(getRedirectDestination());
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AlertDialog open={showAccessDeniedModal} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.accessDenied')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contentHub.errors.accessDenied')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleAccessDeniedClose}>
              {t('common.backToDashboard')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return <>{children}</>;
}

// Convenience components for specific roles
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin"]}>{children}</RoleGuard>;
}

export function RequireAdministrativeRoles({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin"]}>{children}</RoleGuard>;
}

export function RequireEditor({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin", "editor"]}>{children}</RoleGuard>;
}

export function RequireEditorOrAdmin({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin", "editor"]}>{children}</RoleGuard>;
}

export function RequireFinancialRoles({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["admin", "financial"]}>{children}</RoleGuard>;
}

/** Guards platform-workspace routes. Allows all three platform roles plus super_admin. */
export function RequirePlatformRoles({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["platform_owner", "platform_support", "platform_sales", "super_admin"]}>{children}</RoleGuard>;
}

/** Guards customer-admin and global-template management routes (higher-trust). */
export function RequirePlatformOwner({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["platform_owner", "super_admin"]}>{children}</RoleGuard>;
}
