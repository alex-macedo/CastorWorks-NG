/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const shouldLogStorageWarnings = import.meta.env.MODE !== 'test';

  // Create schema with translated messages
  const passwordSchema = z
    .string()
    .min(8, t('auth:login.validation.passwordMinLength'))
    .regex(/[A-Z]/, t('auth:login.validation.passwordUppercase'))
    .regex(/[a-z]/, t('auth:login.validation.passwordLowercase'))
    .regex(/[0-9]/, t('auth:login.validation.passwordNumber'))
    .regex(/[^A-Za-z0-9]/, t('auth:login.validation.passwordSpecial'));

  const authSchema = z.object({
    email: z.string().email(t('auth:login.validation.emailInvalid')),
    password: passwordSchema,
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check storage availability and warn user
    const checkStorageAvailability = () => {
      let localStorageBlocked = false;
      let sessionStorageBlocked = false;

      // Check localStorage
      try {
        const testKey = '__local_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      } catch (e) {
        localStorageBlocked = true;
        if (shouldLogStorageWarnings) {
          console.warn('🔒 [Auth] localStorage blocked');
        }
      }

      // Check sessionStorage
      try {
        const testKey = '__session_test__';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
      } catch (e) {
        sessionStorageBlocked = true;
        if (shouldLogStorageWarnings) {
          console.warn('🔒 [Auth] sessionStorage blocked');
        }
      }

      return { localStorageBlocked, sessionStorageBlocked };
    };

    const { localStorageBlocked, sessionStorageBlocked } = checkStorageAvailability();

    if (localStorageBlocked && sessionStorageBlocked) {
      console.error('🚫 [Auth] CRITICAL: Both localStorage and sessionStorage blocked');
      toast.error('Browser storage is disabled. Please enable cookies and site data storage to sign in.', {
        duration: 10000,
      });
      return;
    }

    if (localStorageBlocked) {
      console.warn('🔒 [Auth] Private mode detected - using sessionStorage');
      toast.warning('Private mode detected. Your session will not persist after closing this tab. For full functionality, please use regular browsing mode.', {
        duration: 8000,
      });
    }

    console.log(`🔐 [Auth] Starting ${isSignUp ? 'signup' : 'signin'} attempt for email:`, email);

    try {
      authSchema.parse({ email, password });
      console.log('✅ [Auth] Form validation passed');
    } catch (validationError) {
      console.error('❌ [Auth] Form validation failed:', validationError);
      if (validationError instanceof z.ZodError) {
        const firstIssue = validationError.issues?.[0];
        console.error('❌ [Auth] Validation issues:', validationError.issues);
        toast.error(firstIssue?.message ?? t('auth:login.validation.checkCredentials'));
      } else {
        console.error('❌ [Auth] Unknown validation error:', validationError);
        toast.error(t('auth:login.validation.checkCredentials'));
      }
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        console.log('📝 [Auth] Attempting signup via create-user Edge Function...');
        const { data: createUserData, error: createUserError } = await supabase.functions.invoke(
          'create-user',
          { body: { email, password } }
        );

        if (createUserError) {
          console.error('❌ [Auth] create-user failed:', createUserError);
          const msg = createUserError.message || '';
          const body = (createUserError as { context?: { body?: { error?: string; details?: string } } })?.context?.body;
          const details = body?.details ?? body?.error ?? msg;
          if (/already registered|already exists|duplicate/i.test(details)) {
            setIsSignUp(false);
            toast.error(t('auth:login.validation.userAlreadyRegistered'));
            setLoading(false);
            return;
          }
          throw new Error(details || 'Failed to create user');
        }

        const data = createUserData as { success?: boolean; error?: string } | null;
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to create user');
        }

        console.log('✅ [Auth] Signup successful via create-user');

        // Send registration email (best-effort)
        try {
          await supabase.functions.invoke('send-registration-email', {
            body: { userEmail: email, userName: email.split('@')[0] },
          });
        } catch (_) {
          // Don't block; email is optional
        }

        toast.success(t('auth:login.messages.accountCreated'));
        setIsSignUp(false);
      } else {
        console.log('🔑 [Auth] Attempting signin...');
        console.log('🔑 [Auth] Sign-in request details:', {
          email: email,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent.substring(0, 50) + '...'
        });

        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ [Auth] Signin failed:', error);
          console.error('❌ [Auth] Error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
          throw error;
        }

        console.log('✅ [Auth] Signin successful:', {
          userId: data.user?.id,
          email: data.user?.email,
          emailConfirmed: data.user?.email_confirmed_at ? true : false,
          lastSignIn: data.user?.last_sign_in_at,
          userMetadata: data.user?.user_metadata
        });

        // CRITICAL: Clear all cached data to prevent previous user's data from leaking to new user
        // Remove all queries from React Query cache to ensure fresh data for new user
        console.log('🧹 [Auth] Clearing React Query cache...');
        const queriesBeforeClear = queryClient.getQueryCache().getAll().length;
        queryClient.removeQueries();
        console.log(`🧹 [Auth] Cleared ${queriesBeforeClear} React Query cache entries`);

        // Also clear user-specific cache from localStorage to prevent stale user data
        // We preserve Supabase auth token which was just set by the sign-in above
        console.log('🧹 [Auth] Analyzing localStorage before cleanup...');
        const allKeys = Object.keys(localStorage);
        const supabaseKeys = allKeys.filter(key => key.startsWith('sb-') || key.includes('auth') || key.includes('supabase'));
        const userKeys = allKeys.filter(key => !key.startsWith('sb-') && !key.includes('auth') && !key.includes('supabase'));

        console.log('🧹 [Auth] LocalStorage analysis:', {
          totalKeys: allKeys.length,
          preservedKeys: supabaseKeys,
          keysToRemove: userKeys
        });

        console.log('🧹 [Auth] Clearing user-specific localStorage cache...');
        userKeys.forEach(key => {
          const value = localStorage.getItem(key);
          console.log(`🧹 [Auth] Removing localStorage key: ${key} (${value?.length || 0} chars)`);
          localStorage.removeItem(key);
        });

        console.log(`🧹 [Auth] Cleanup complete: removed ${userKeys.length} user keys, preserved ${supabaseKeys.length} auth keys`);

        // Verify cleanup was successful
        const remainingKeys = Object.keys(localStorage);
        console.log('🧹 [Auth] Post-cleanup localStorage verification:', {
          remainingKeys: remainingKeys.length,
          expectedKeys: supabaseKeys.length,
          cleanupSuccessful: remainingKeys.length === supabaseKeys.length
        });

          // Check user roles to determine redirect
          if (data.user) {
            console.log('👤 [Auth] Checking user roles for user:', data.user.id);
            console.log('👤 [Auth] User profile details:', {
              id: data.user.id,
              email: data.user.email,
              createdAt: data.user.created_at,
              emailConfirmed: data.user.email_confirmed_at ? true : false,
              lastSignIn: data.user.last_sign_in_at,
              userMetadata: data.user.user_metadata
            });

            let roles: any[] = []; // Declare roles outside try block

            try {
              console.log('🔍 [Auth] Executing user_roles query...');
              const { data: userRoles, error: rolesError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", data.user.id);

              if (rolesError) {
                console.error('❌ [Auth] CRITICAL: Failed to fetch user roles from database:', rolesError);
                console.error('❌ [Auth] Roles query error details:', {
                  message: rolesError.message,
                  code: rolesError.code,
                  details: rolesError.details,
                  hint: rolesError.hint,
                  statusCode: rolesError.status
                });
                console.error('🚫 [Auth] Database connection check...');
                // Test basic connectivity
                const { error: testError } = await supabase.from('user_roles').select('count').limit(1);
                if (testError) {
                  console.error('❌ [Auth] Database connectivity test failed:', testError);
                } else {
                  console.log('✅ [Auth] Database connectivity OK, issue may be with RLS policies');
                }
                throw new Error(`User roles query failed: ${rolesError.message}`);
              }

              roles = userRoles || []; // Assign to outer scope variable
              console.log('✅ [Auth] User roles query successful:', {
                rolesCount: roles.length,
                roles: roles.map(r => r.role),
                rawData: roles
              });

              if (!roles || roles.length === 0) {
                console.error('🚫 [Auth] CRITICAL: User has no roles assigned - this blocks access');
                console.error('🚫 [Auth] User details for admin reference:', {
                  userId: data.user.id,
                  email: data.user.email,
                  createdAt: data.user.created_at,
                  lastSignIn: data.user.last_sign_in_at,
                  userMetadata: data.user.user_metadata,
                  supabaseUserId: data.user.id
                });
                console.error('🚫 [Auth] SOLUTION: Admin must run SQL: INSERT INTO user_roles (user_id, role) VALUES (\'' + data.user.id + '\', \'client\');');
                // AuthGuard will handle showing "No Access" modal
              }
            } catch (rolesQueryError) {
              console.error('💥 [Auth] Role checking process failed:', rolesQueryError);
              console.error('💥 [Auth] Role query error details:', {
                message: rolesQueryError.message,
                stack: rolesQueryError.stack
              });
              throw rolesQueryError; // Re-throw to be caught by outer catch
            }

            if (!roles || roles.length === 0) {
              console.error('🚫 [Auth] CRITICAL: User has no roles assigned - cannot access application');
              console.error('🚫 [Auth] User details:', {
                userId: data.user.id,
                email: data.user.email,
                createdAt: data.user.created_at,
                lastSignIn: data.user.last_sign_in_at
              });
              console.error('🚫 [Auth] This user needs admin to assign roles in user_roles table');
              // AuthGuard will handle showing "No Access" modal
            }

            const isSiteSupervisor = roles.some(r => r.role === "site_supervisor");
            console.log('👤 [Auth] Is site supervisor:', isSiteSupervisor);

          toast.success(t('auth:login.messages.welcomeBack'));

          if (isSiteSupervisor) {
            console.log('🏗️ [Auth] Redirecting to supervisor hub');
            navigate("/supervisor/hub");
          } else {
            console.log('🏠 [Auth] Redirecting to dashboard');
            navigate("/");
          }
        } else {
          console.warn('⚠️ [Auth] No user data in auth response, redirecting to dashboard');
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error('💥 [Auth] Authentication process failed:', error);
      console.error('💥 [Auth] Full error object:', {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });

      // Provide a user-friendly error message - distinguish known auth errors and network issues
      const isUserAlreadyRegistered = error?.message === 'User already registered';
      const isInvalidLoginCredentials = error?.message === 'Invalid login credentials';
      const isSignUpApiError =
        isSignUp &&
        (error?.message?.includes('API error happened') || error?.message?.includes('Failed to create user'));
      const isFailedFetch =
        error?.status === 0 ||
        (error?.message === 'Failed to fetch' && error?.name === 'AuthRetryableFetchError');
      const isServerTimeout =
        error?.status === 504 ||
        error?.status === 502 ||
        error?.message === '{}' ||
        (!error?.message && error?.status !== 0);

      if (isUserAlreadyRegistered) {
        setIsSignUp(false);
        toast.error(t('auth:login.validation.userAlreadyRegistered'));
      } else if (isInvalidLoginCredentials) {
        toast.error(t('auth:login.validation.invalidLoginCredentials'));
      } else if (isSignUpApiError) {
        toast.error(t('auth:login.validation.signUpApiError'));
      } else {
        const errorMessage = isFailedFetch
          ? t('auth:login.validation.fetchFailed')
          : isServerTimeout
            ? t('auth:login.validation.connectionError')
            : (error?.message || t('auth:login.validation.authenticationFailed'));
        console.error('💥 [Auth] Showing user error message:', errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      console.log('🔄 [Auth] Authentication process completed');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          padding: '1.5rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            lineHeight: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.025em'
          }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            color: '#64748b'
          }}>
            {isSignUp
              ? 'Enter your details to create a new account'
              : 'Enter your credentials to access your dashboard'}
          </p>
        </div>
        <div style={{
          padding: '1.5rem',
          paddingTop: 0
        }}>
          <form onSubmit={handleAuth} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <Label htmlFor="email" style={{
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                fontWeight: 500
              }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  display: 'flex',
                  height: '2.5rem',
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  color: '#1e293b'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <Label htmlFor="password" style={{
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                fontWeight: 500
              }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  display: 'flex',
                  height: '2.5rem',
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  color: '#1e293b'
                }}
              />
              <p style={{
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#64748b'
              }}>
                Use 8+ characters with uppercase, lowercase, number, and special symbol.
              </p>
              {!isSignUp && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <Link
                    to="/forgot-password"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                    className="hover:underline"
                  >
                    {t('auth:forgotPassword.linkLabel')}
                  </Link>
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                fontWeight: 500,
                height: '2.5rem',
                padding: '0.5rem 1rem',
                width: '100%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <Button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                fontWeight: 500,
                height: '2.5rem',
                padding: '0.5rem 1rem',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
