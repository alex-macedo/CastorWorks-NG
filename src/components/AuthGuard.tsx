import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocalization();
  const [isChecking, setIsChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showNoRoleModal, setShowNoRoleModal] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  
  const { data: roles, isLoading: rolesLoading } = useUserRoles(userId || undefined);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 [AuthGuard] Starting authentication check...', {
        currentPath: location.pathname,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent.substring(0, 50) + '...'
      });

      let session = null;

      try {
        console.log('🔐 [AuthGuard] Retrieving session from Supabase...');
        const { data: { session: retrievedSession }, error } = await supabase.auth.getSession();
        session = retrievedSession;

        if (error) {
          console.error('❌ [AuthGuard] CRITICAL: Session retrieval failed:', error);
          console.error('❌ [AuthGuard] Error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
        }

        console.log('🔐 [AuthGuard] Session check result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          currentPath: location.pathname,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          lastSignIn: session?.user?.last_sign_in_at,
          isExpired: session?.expires_at ? Date.now() > session.expires_at * 1000 : null
        });

        // Check both localStorage and sessionStorage for session data
        let localStorageKeys = [];
        let sessionStorageKeys = [];
        const supabaseKeys = [];

        try {
          localStorageKeys = Object.keys(localStorage);
          const localSupabaseKeys = localStorageKeys.filter(key => key.startsWith('sb-'));
          supabaseKeys.push(...localSupabaseKeys);
        } catch (e) {
          console.warn('🔐 [AuthGuard] localStorage access blocked');
        }

        try {
          sessionStorageKeys = Object.keys(sessionStorage);
          const sessionSupabaseKeys = sessionStorageKeys.filter(key => key.startsWith('sb-'));
          supabaseKeys.push(...sessionSupabaseKeys);
        } catch (e) {
          console.warn('🔐 [AuthGuard] sessionStorage access blocked');
        }

        console.log('🔐 [AuthGuard] Storage session data:', {
          localStorageKeys: localStorageKeys.length,
          sessionStorageKeys: sessionStorageKeys.length,
          supabaseKeysCount: supabaseKeys.length,
          supabaseKeys: supabaseKeys,
          storageBlocked: localStorageKeys.length === 0 && sessionStorageKeys.length === 0
        });
      } catch (authError) {
        console.error('💥 [AuthGuard] Authentication check failed:', authError);
        console.error('💥 [AuthGuard] Auth error details:', {
          message: authError.message,
          stack: authError.stack
        });
      }

      if (!session && location.pathname !== "/login") {
        console.log('🔄 [AuthGuard] No session, redirecting to login');
        navigate("/login");
        // Don't set isChecking to false - keep showing loading spinner while redirect happens
        return;
      } else if (session && location.pathname === "/login") {
        console.log('🔄 [AuthGuard] Has session but on login page, redirecting to dashboard');
        navigate("/");
        // Don't set isChecking to false - keep showing loading spinner while redirect happens
        return;
      } else if (session) {
        console.log('✅ [AuthGuard] Session valid, checking user roles');
        setUserId(session.user.id);
      } else {
        console.log('ℹ️ [AuthGuard] On login page without session, allowing access');
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AuthGuard] Auth state change:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        path: location.pathname
      });

      // Handle sign-out event to ensure complete cleanup
      if (event === 'SIGNED_OUT') {
        console.log('🚪 [AuthGuard] User signed out, clearing state');
        setUserId(null);
        if (location.pathname !== "/login") {
          console.log('🔄 [AuthGuard] Redirecting to login after signout');
          navigate("/login");
        }
      } else if (!session && location.pathname !== "/login") {
        console.log('🔄 [AuthGuard] Session lost, redirecting to login');
        navigate("/login");
      } else if (session && location.pathname === "/login") {
        console.log('🔄 [AuthGuard] User signed in, redirecting from login page');
        navigate("/");
      } else if (session) {
        console.log('✅ [AuthGuard] Session established, setting user ID');
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  // Check for roles once user is loaded
  useEffect(() => {
    if (userId && !rolesLoading && location.pathname !== "/login") {
      console.log('🔍 [AuthGuard] Role validation initiated:', {
        userId,
        rolesCount: roles?.length || 0,
        roles: roles?.map(r => r.role) || [],
        path: location.pathname,
        timestamp: new Date().toISOString()
      });

      // Test the user_roles query directly to diagnose issues - critical for debugging role access problems
      console.log('🔍 [AuthGuard] Testing user_roles query...');
      (async () => {
        try {
          const { data: testRoles, error: testError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);

          console.log('🔍 [AuthGuard] Direct query result:', {
            success: !testError,
            rolesFound: testRoles?.length || 0,
            roles: testRoles?.map((r: any) => r.role) || [],
            error: testError ? {
              message: testError.message,
              code: testError.code,
              details: testError.details
            } : null
          });
        } catch (queryError) {
          console.error('🔍 [AuthGuard] Direct query failed:', queryError);
        }
      })();

      if (!roles || roles.length === 0) {
        console.error('🚫 [AuthGuard] CRITICAL: User has no roles assigned - access blocked');
        console.error('🚫 [AuthGuard] Blocking details:', {
          userId,
          path: location.pathname,
          rolesFromHook: roles,
          hookLoadingState: rolesLoading,
          timestamp: new Date().toISOString()
        });
        console.error('🚫 [AuthGuard] SOLUTION: Admin must execute:');
        console.error('🚫 [AuthGuard] INSERT INTO user_roles (user_id, role) VALUES (\'' + userId + '\', \'client\');');
        console.error('🚫 [AuthGuard] Available roles: admin, project_manager, supervisor, accountant, client, site_supervisor, admin_office, viewer');

        setShowNoRoleModal(true);
        setIsChecking(false);
      } else {
        console.log('✅ [AuthGuard] Role validation successful:', {
          userId,
          roles: roles.map(r => r.role),
          accessGranted: true,
          path: location.pathname
        });
        setIsChecking(false);
      }
    }
  }, [userId, roles, rolesLoading, location.pathname]);

  // Role-based redirect for site supervisors - always redirect from home page
  useEffect(() => {
    if (!userId || rolesLoading || hasRedirected || location.pathname === "/login") {
      return;
    }

    if (!roles || roles.length === 0) {
      return;
    }

    const isSiteSupervisor = roles.some(r => r.role === "site_supervisor");
    const userRoles = roles.map(r => r.role);

    console.log('🚦 [AuthGuard] Role-based redirect check:', {
      userId,
      roles: userRoles,
      isSiteSupervisor,
      currentPath: location.pathname,
      hasRedirected
    });

    if (isSiteSupervisor) {
      // Site supervisors cannot access the home page - always redirect to supervisor hub
      if (location.pathname === "/") {
        console.log('🏗️ [AuthGuard] Site supervisor on home page, redirecting to supervisor hub');
        setHasRedirected(true);
        navigate("/supervisor/hub", { replace: true });
      }
    }
  }, [userId, roles, rolesLoading, location.pathname, navigate, hasRedirected]);

  const handleNoRoleModalClose = async () => {
    console.log('🚪 [AuthGuard] User acknowledged no-role modal, signing out');
    setShowNoRoleModal(false);
    await supabase.auth.signOut();
    console.log('✅ [AuthGuard] User signed out successfully');
    navigate("/login");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showNoRoleModal} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.accessNotEnabled')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.contactAdministrator')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleNoRoleModalClose}>
              {t('common.backToLogin')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {children}
    </>
  );
}
