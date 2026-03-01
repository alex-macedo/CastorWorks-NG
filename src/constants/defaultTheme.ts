/**
 * @deprecated
 * Default theme constants are deprecated.
 *
 * REASON: Theme is now static in CSS. This file is kept for reference only.
 * The actual theme values are defined in src/index.css using RGB format.
 *
 * TO REMOVE: This file can be safely deleted after verifying the new theme works.
 *
 * This file contained:
 * - defaultTheme (light mode defaults in HSL format)
 * - darkModeDefaultTheme (dark mode defaults in HSL format)
 * - DualModeTheme type for light/dark theme structure
 *
 * All theme values are now in src/index.css as CSS custom properties.
 */
import type { ThemeCustomization, DualModeTheme } from '@/types/theme';

/**
 * Default Theme Configuration for Light Mode
 *
 * Matches the current CSS variable values defined in src/index.css
 * Used as fallback when no customization is set and for reset functionality.
 */
export const defaultTheme: ThemeCustomization = {
  colors: {
    primary: "217 91% 60%",
    secondary: "215 16% 47%",
    success: "142 76% 45%",
    warning: "38 92% 50%",
    destructive: "0 84% 60%",
    accent: "217 91% 60%", // Match primary color for consistency
    muted: "215 25% 90%",
    mutedForeground: "220 12% 40%",
    tabsActive: "210 30% 99%", // Matches card/background
    tabsActiveForeground: "224 24% 14%", // Matches foreground
    ring: "221 83% 53%",
  },
  buttonStyle: {
    borderRadius: "rounded-md",
    variant: "default",
  },
  cardStyle: {
    borderRadius: "rounded-xl",
    shadow: "md",
    borderWidth: "1",
  },
  typography: {
    fontFamily: "system",
    headingWeight: "600",
  },
  sidebar: {
    background: "220 18% 12%",
    foreground: "220 9% 80%",
    accent: "220 18% 16%",
    border: "220 18% 18%",
  },
  layout: {
    background: "210 22% 98%",
    foreground: "224 24% 14%",
    border: "215 16% 85%",
    radius: "0.5rem",
  },
  enabled: false,
};

/**
 * Default Theme Configuration for Dark Mode
 * Optimized for dark mode with adjusted contrast and colors
 */
export const defaultDarkTheme: ThemeCustomization = {
  colors: {
    primary: "217 91% 70%",
    secondary: "215 16% 60%",
    success: "142 76% 55%",
    warning: "38 92% 60%",
    destructive: "0 84% 70%",
    accent: "217 91% 70%", // Match primary color for consistency
    muted: "220 20% 14%",
    mutedForeground: "220 10% 72%",
    tabsActive: "220 18% 12%", // Matches card/background
    tabsActiveForeground: "210 14% 96%", // Matches foreground
    ring: "221 83% 63%",
  },
  buttonStyle: {
    borderRadius: "rounded-md",
    variant: "default",
  },
  cardStyle: {
    borderRadius: "rounded-xl",
    shadow: "md",
    borderWidth: "1",
  },
  typography: {
    fontFamily: "system",
    headingWeight: "600",
  },
  sidebar: {
    background: "220 18% 10%",
    foreground: "220 9% 85%",
    accent: "220 18% 14%",
    border: "220 18% 12%",
  },
  layout: {
    background: "220 18% 14%",
    foreground: "210 22% 92%",
    border: "220 18% 20%",
    radius: "0.5rem",
  },
  enabled: false,
};

/**
 * Default Dual Mode Theme Configuration
 * Combines light and dark mode themes for the new dual-mode system
 */
export const defaultDualModeTheme: DualModeTheme = {
  light: defaultTheme,
  dark: defaultDarkTheme,
  activeMode: 'light',
};

