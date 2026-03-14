/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { z } from "zod";
import { languageMetadata, useLocalization, type Language } from "@/contexts/LocalizationContext";
import { useQueryClient } from "@tanstack/react-query";
import { JoinWaitlistDialog } from "@/components/auth/JoinWaitlistDialog";
import castorworksLogo from "@/assets/castorworks-brand.png";
import i18n from "@/lib/i18n/i18n";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLanguage, setLoginLanguage] = useState<Language>('pt-BR');
  const hasManualLanguageSelection = useRef(false);
  const shouldLogStorageWarnings = import.meta.env.MODE !== 'test';
  const loginPromoHighlights = [
    t('auth:login.promo.points.projects'),
    t('auth:login.promo.points.ai'),
    t('auth:login.promo.points.team'),
  ];
  const availableLanguages = (Object.keys(languageMetadata) as Language[]).map((code) => ({
    code,
    label: languageMetadata[code].nativeName,
  }));

  useEffect(() => {
    if (hasManualLanguageSelection.current) {
      return;
    }

    if (i18n.language !== 'pt-BR') {
      void i18n.changeLanguage('pt-BR');
    }

    setLoginLanguage('pt-BR');
  }, [t]);

  const handleLoginLanguageChange = (language: Language) => {
    hasManualLanguageSelection.current = true;
    void i18n.changeLanguage(language);
    setLoginLanguage(language);
  };

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

    console.log('🔐 [Auth] Starting signin attempt for email:', email);

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
      const isFailedFetch =
        error?.status === 0 ||
        (error?.message === 'Failed to fetch' && error?.name === 'AuthRetryableFetchError');
      const isServerTimeout =
        error?.status === 504 ||
        error?.status === 502 ||
        error?.message === '{}' ||
        (!error?.message && error?.status !== 0);

      if (isUserAlreadyRegistered) {
        toast.error(t('auth:login.validation.userAlreadyRegistered'));
      } else if (isInvalidLoginCredentials) {
        toast.error(t('auth:login.validation.invalidLoginCredentials'));
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
      background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
      padding: '1rem'
    }}>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1720px] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] lg:grid-cols-[minmax(24rem,28rem)_minmax(0,1fr)]">
        <div className="flex items-center justify-center bg-slate-50/90 px-6 py-10 sm:px-10 lg:px-12">
          <div style={{
            width: '100%',
            maxWidth: '32rem',
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
                {t('auth:login.title')}
              </h1>
              <p style={{
                fontSize: '0.875rem',
                lineHeight: '1.25rem',
                color: '#64748b'
              }}>
                {t('auth:login.description')}
              </p>
              <div className="mt-2 flex justify-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Globe className="h-4 w-4" />
                      {t('auth:login.languageButton')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {availableLanguages.map((item) => (
                      <DropdownMenuItem
                        key={item.code}
                        className="flex items-center justify-between"
                        onClick={() => handleLoginLanguageChange(item.code)}
                      >
                        <span>{item.label}</span>
                        {loginLanguage === item.code ? <Check className="h-4 w-4 text-primary" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                    {t('auth:login.emailLabel')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth:login.emailPlaceholder')}
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
                    {t('auth:login.passwordLabel')}
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
                    {t('auth:login.passwordHint')}
                  </p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    <Link
                      to="/forgot-password"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      {t('auth:forgotPassword.linkLabel')}
                    </Link>
                  </p>
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
                  {loading ? t('auth:login.loading') : t('auth:login.signIn')}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_52%,#fdf8f1_100%)] lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(249,115,22,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_28%)]" />
          <div className="relative flex h-full w-full items-start p-10 xl:p-14 2xl:p-16">
            <div className="grid w-full gap-8 xl:grid-cols-[minmax(0,1.35fr)_320px] 2xl:grid-cols-[minmax(0,1.5fr)_340px]">
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                <img
                  src={castorworksLogo}
                  alt="CastorWorks"
                  className="h-[72px] w-[72px] shrink-0 rounded-2xl bg-white object-cover shadow-[0_18px_45px_-24px_rgba(15,23,42,0.18)]"
                />
                <div className="inline-flex items-center rounded-full border border-sky-300/60 bg-sky-100/80 px-4 py-1.5 text-sm font-medium text-sky-800">
                  {t('auth:login.promo.badge')}
                </div>
              </div>
              <h2 className="mt-8 max-w-none text-[3.35rem] font-semibold leading-[1.02] tracking-tight text-slate-950 xl:text-[4.6rem] 2xl:text-[5.2rem]">
                {t('auth:login.promo.title')}
              </h2>
              <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-700 xl:max-w-3xl xl:text-[1.15rem]">
                {t('auth:login.promo.description')}
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {loginPromoHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-base leading-8 text-slate-700 shadow-sm backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
              </div>

              <div className="flex flex-col gap-4 xl:pt-2">
                <div className="rounded-[28px] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.3)] backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-sky-700">
                  {t('auth:login.promo.ctaEyebrow')}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  {t('auth:login.promo.ctaTitle')}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {t('auth:login.promo.ctaDescription')}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <JoinWaitlistDialog source="login-promo-panel">
                    <Button className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
                      {t('auth:login.promo.joinList')}
                    </Button>
                  </JoinWaitlistDialog>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-slate-300 bg-transparent px-6 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => window.open('https://devng.castorworks.cloud/', '_blank', 'noopener,noreferrer')}
                  >
                    {t('auth:login.promo.learnMore')}
                  </Button>
                </div>
              </div>
                <div className="rounded-[24px] border border-sky-200 bg-sky-50/90 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-sky-900">{t('auth:login.promo.sideTitle')}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{t('auth:login.promo.sideDescription')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
