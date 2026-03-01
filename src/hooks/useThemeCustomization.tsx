import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useCompanySettings } from './useCompanySettings';
import { applyTheme, resetTheme } from '@/utils/themeApplier';
import { defaultTheme, defaultDarkTheme } from '@/constants/defaultTheme';
import type { ThemeCustomization, PartialThemeCustomization, DualModeTheme } from '@/types/theme';
import { sanitizeTheme } from '@/utils/themeValidation';

const isThemeCustomization = (value: unknown): value is ThemeCustomization => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasEnabledFlag = typeof candidate.enabled === 'boolean';
  const hasColorsObject = candidate.colors && typeof candidate.colors === 'object';

  return hasEnabledFlag && Boolean(hasColorsObject);
};

const isDualModeTheme = (value: unknown): value is DualModeTheme => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Boolean(candidate.light && candidate.dark);
};

const parseThemeCustomization = (raw: unknown): ThemeCustomization | DualModeTheme | null => {
  if (!raw) return null;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse theme_customization JSON:', error);
      return null;
    }
  }

  if (isDualModeTheme(parsed)) {
    return {
      light: sanitizeTheme(parsed.light as PartialThemeCustomization, defaultTheme),
      dark: sanitizeTheme(parsed.dark as PartialThemeCustomization, defaultDarkTheme),
      activeMode: (parsed as any).activeMode || 'light',
    };
  }

  if (isThemeCustomization(parsed)) {
    // Normalize enabled flag if it comes back as a string
    if (typeof (parsed as any).enabled === 'string') {
      (parsed as any).enabled = (parsed as any).enabled === 'true';
    }
    return sanitizeTheme(parsed as PartialThemeCustomization, defaultTheme);
  }

  return null;
};

// Module-level state to coordinate between the global hook and the preview hook
// This ensures only one theme application effect is active at a time
let globalPreviewActive = false;
let globalPreviewTheme: ThemeCustomization | null = null;
let themeChangeListeners: Array<() => void> = [];

const notifyThemeChange = () => {
  themeChangeListeners.forEach(listener => listener());
};

/**
 * Hook for managing theme customization
 * 
 * Loads theme from company settings and applies it to the document.
 * Handles theme changes reactively and provides preview mode.
 */
export function useThemeCustomization() {
  const { settings, isLoading } = useCompanySettings();
  const { resolvedTheme } = useTheme();
  
  // Local state just to trigger re-renders when the global preview state changes
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    themeChangeListeners.push(handleUpdate);
    return () => {
      themeChangeListeners = themeChangeListeners.filter(l => l !== handleUpdate);
    };
  }, []);

  const themeCustomizationData = settings?.theme_customization;

  // Serialize to handle unstable references
  const serializedTheme = JSON.stringify(themeCustomizationData);

  const theme = useMemo(() => {
    // If a preview is active, the preview theme takes precedence
    if (globalPreviewActive && globalPreviewTheme) {
      return globalPreviewTheme;
    }

    const parsed = parseThemeCustomization(themeCustomizationData);
    if (!parsed) return null;

    if ('light' in parsed && 'dark' in parsed) {
      // It's a DualModeTheme
      return resolvedTheme === 'dark' ? parsed.dark : parsed.light;
    }

    // It's a single ThemeCustomization
    return parsed;
  }, [themeCustomizationData, resolvedTheme]);

  // Apply theme when it changes
  useEffect(() => {
    // If we have no theme, or it's disabled, we MUST reset
    // This is important because resetTheme removes the style tag
    if (theme && theme.enabled) {
      applyTheme(theme);
    } else {
      resetTheme();
    }
  }, [theme]);

  return {
    theme: theme || defaultTheme,
    isEnabled: theme?.enabled ?? false,
    isLoading,
  };
}

/**
 * Hook for previewing theme changes without saving
 * Useful in theme customization UI
 */
export function useThemePreview() {
  const previewTheme = useCallback((theme: ThemeCustomization) => {
    globalPreviewActive = true;
    globalPreviewTheme = theme;
    notifyThemeChange();
  }, []);

  const clearPreview = useCallback(() => {
    globalPreviewActive = false;
    globalPreviewTheme = null;
    notifyThemeChange();
  }, []);

  return {
    previewTheme,
    clearPreview,
    currentPreview: globalPreviewTheme,
  };
}
