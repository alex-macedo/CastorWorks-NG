import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Search, CloudSun, ChevronDown, Check, LayoutGrid, Sun, Moon, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PrefetchButton } from "@/components/Navigation/PrefetchButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumbs } from "./PageBreadcrumbs";
import { HelpIcon } from "../Help/HelpIcon";
import { NotificationBell } from "../Notifications/NotificationBell";
import { RunningTimeIndicator } from "@/components/Shared/TimeClock/RunningTimeIndicator";
import { FloatingTimeClock } from "@/components/Shared/TimeClock/FloatingTimeClock";
import {
  languageMetadata,
  useLocalization,
  type Language,
} from "@/contexts/LocalizationContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useCurrentUserRoles } from "@/hooks/useUserRoles";

type ThemeValue = "light" | "dark" | "system";

const LANGUAGES: Language[] = ['en-US', 'es-ES', 'fr-FR', 'pt-BR'];

export const TopBar = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLocalization();
  const roles = useCurrentUserRoles();
  const { preferences, isLoading: isLoadingPreferences, updatePreferences } = useUserPreferences();
  const { setTheme, theme: activeTheme } = useTheme();
  const { mutate: updateUserTheme, isPending: isUpdatingTheme } = updatePreferences;
  const [pendingTheme, setPendingTheme] = useState<ThemeValue | null>(null);
  const themeUpdateSubmitted = useRef(false);
  const lastSyncedTheme = useRef<ThemeValue | null>(null);

  // CRITICAL FIX: Only sync next-themes with database when preferences loads/changes
  // Do NOT call setTheme again after handleThemeChange already did it
  // NOTE: setTheme is intentionally excluded from dependencies to prevent infinite loop.
  // When database preferences change, we sync to next-themes, but we don't want
  // setTheme in the dependency array because that would trigger on every theme change
  // from next-themes (circular dependency). Instead, we use lastSyncedTheme ref to
  // prevent re-syncing the same value.
  useEffect(() => {
    if (!preferences?.theme) {
      return;
    }

    // If we have a pending change from user, don't sync yet
    if (pendingTheme !== null) {
      return;
    }

    // Use lastSyncedTheme ref to prevent infinite loop from setTheme dependency changes
    // Only set if this preference value hasn't been synced yet
    if (preferences.theme !== lastSyncedTheme.current) {
      lastSyncedTheme.current = preferences.theme;
      setTheme(preferences.theme as ThemeValue);
      
      // CRITICAL: Also manually ensure the DOM class matches
      // In case next-themes doesn't apply it. Use setTimeout to ensure next-themes has finished.
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const htmlElement = document.documentElement;
          if (preferences.theme === 'dark') {
            htmlElement.classList.add('dark');
          } else if (preferences.theme === 'light') {
            htmlElement.classList.remove('dark');
          }
        }, 50); // Increased delay to ensure next-themes applies theme first
      }
    } else {
      // Even if synced before, force the DOM to match in case of initial load issues
      if (typeof window !== 'undefined' && activeTheme && activeTheme !== preferences.theme) {
        setTimeout(() => {
          const htmlElement = document.documentElement;
          if (preferences.theme === 'dark') {
            htmlElement.classList.add('dark');
          } else {
            htmlElement.classList.remove('dark');
          }
        }, 50);
      }
    }
  }, [preferences?.theme, pendingTheme, activeTheme]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ setTheme is intentionally excluded to prevent infinite loop (uses lastSyncedTheme ref instead)

  // Handle persisting pending theme changes to database
  useEffect(() => {
    if (!pendingTheme) {
      themeUpdateSubmitted.current = false;
      return;
    }

    if (!preferences?.id) {
      return;
    }

    // If database already has this value, clear pending state and reset flag
    if (preferences.theme === pendingTheme) {
      themeUpdateSubmitted.current = false;
      setPendingTheme(null);
      return;
    }

    // Only submit once per pending theme
    if (themeUpdateSubmitted.current || isUpdatingTheme) {
      return;
    }

    themeUpdateSubmitted.current = true;
    updateUserTheme({ theme: pendingTheme });
  }, [preferences?.id, preferences?.theme, pendingTheme, updateUserTheme, isUpdatingTheme]);

  // Force theme sync when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastSyncedTheme.current = null; // Reset so next sync effect will trigger
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const selectedTheme = useMemo<ThemeValue>(() => {
    if (pendingTheme) {
      return pendingTheme;
    }

    if (preferences?.theme === "light" || preferences?.theme === "dark" || preferences?.theme === "system") {
      return preferences.theme;
    }

    if (activeTheme === "light" || activeTheme === "dark" || activeTheme === "system") {
      return activeTheme;
    }

    return "system";
  }, [pendingTheme, preferences?.theme, activeTheme]);

  const themeOptions = useMemo(
    () => [
      {
        value: "light" as ThemeValue,
        label: t("topBar.themeLight"),
        icon: Sun,
      },
      {
        value: "dark" as ThemeValue,
        label: t("topBar.themeDark"),
        icon: Moon,
      },
      {
        value: "system" as ThemeValue,
        label: t("topBar.themeSystem"),
        icon: Monitor,
      },
    ],
    [t]
  );

  const handleThemeChange = (value: ThemeValue) => {
    // Prevent duplicate submissions
    if (pendingTheme === value && themeUpdateSubmitted.current) {
      return;
    }
    
    // Update next-themes immediately for UI feedback
    setTheme(value);
    
    // FALLBACK: Force theme class on HTML element
    // This ensures visual feedback happens immediately
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const htmlElement = document.documentElement;
        
        // Force apply the correct theme class
        if (value === 'dark') {
          // Always add dark class
          htmlElement.classList.add('dark');
        } else if (value === 'light') {
          // Always remove dark class
          htmlElement.classList.remove('dark');
        }
      }, 50); // Match the timing in SyncEffect for consistency
    }
    
    // Mark that we've already synced this value (prevents SyncEffect from calling setTheme again)
    lastSyncedTheme.current = value;
    
    // Track this change for database sync
    setPendingTheme(value);
    
    // Mark as needing submission (will be handled by useEffect)
    themeUpdateSubmitted.current = false;
  };

  const isGlobalAdmin = roles.includes('global_admin');
  const canUseTimeTrackingShortcut = roles.some(role =>
    ['admin', 'project_manager', 'architect', 'global_admin'].includes(role)
  );

  return (
    <div className="flex items-center justify-between w-full gap-4">
      <PageBreadcrumbs />
      <div className="flex items-center gap-4 flex-1 max-w-md max-sm:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("topBar.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RunningTimeIndicator />
        <NotificationBell />
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("topBar.themeToggle")}
              className="relative h-9 w-9"
              disabled={isLoadingPreferences && !preferences}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t("topBar.themeToggle")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{t("topBar.theme")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themeOptions.map(option => {
              const Icon = option.icon;
              const isActive = selectedTheme === option.value;

              return (
                <DropdownMenuItem
                  key={option.value}
                  className="flex items-center gap-2"
                  onSelect={() => handleThemeChange(option.value)}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="flex-1 text-sm">{option.label}</span>
                  {isActive && <Check className="h-4 w-4" aria-hidden />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <HelpIcon content={t("topBar.helpTooltip")} title={t("topBar.helpTitle")} showVersion />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label={t("topBar.language")}
              >
                <span className="text-lg" aria-hidden>
                  {languageMetadata[language]?.flag ?? '🏳️'}
                </span>
                <span className="hidden sm:inline">
                  {t("topBar.language")}
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {LANGUAGES.map(lang => {
                const metadata = languageMetadata[lang];
                const isActive = lang === language;

                return (
                  <DropdownMenuItem
                    key={lang}
                    className="flex items-center gap-2"
                    onSelect={() => setLanguage(lang)}
                  >
                    <span className="text-lg" aria-hidden>
                      {metadata?.flag ?? '🏳️'}
                    </span>
                    <span className="flex-1 text-sm">{metadata?.nativeName ?? lang}</span>
                    {isActive && <Check className="h-4 w-4" aria-hidden />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden sm:flex items-center gap-2">
            {isGlobalAdmin && (
              <PrefetchButton variant="ghost" size="sm" prefetchPath="/roadmap" onClick={() => navigate("/roadmap")}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t("topBar.roadmap")}</span>
              </PrefetchButton>
            )}
            <PrefetchButton variant="ghost" size="sm" prefetchPath="/weather" onClick={() => navigate("/weather")}>
              <CloudSun className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("topBar.weather")}</span>
            </PrefetchButton>
            {canUseTimeTrackingShortcut && <FloatingTimeClock variant="topbar" />}
          </div>
          <div className="sm:hidden flex items-center gap-1">
            <PrefetchButton variant="ghost" size="sm" prefetchPath="/weather" onClick={() => navigate("/weather")}>
              <CloudSun className="h-4 w-4" />
            </PrefetchButton>
            {canUseTimeTrackingShortcut && <FloatingTimeClock variant="topbar" />}
          </div>
        </div>
      </div>
    </div>
  );
};
