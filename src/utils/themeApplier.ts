/**
 * @deprecated
 * Theme applier utility is deprecated.
 *
 * REASON: The corporate theme is now statically defined in src/index.css using RGB color format.
 * Dynamic CSS injection is no longer needed.
 *
 * MIGRATION: Theme colors are now controlled via CSS custom properties in index.css.
 * The theme system has been simplified - colors are static and defined once.
 *
 * TO REMOVE: This file can be safely deleted after verifying the new theme works.
 * The new theme uses RGB format directly: rgb(var(--color-name))
 *
 * This file was used to:
 * - Inject dynamic CSS with HSL color values
 * - Apply !important flags to CSS properties
 * - Handle database-driven theme customization
 *
 * All of this is now replaced by static CSS variables in index.css.
 */
import type { ThemeCustomization } from '@/types/theme';
import { defaultTheme } from '@/constants/defaultTheme';

/**
 * Theme Application Utility
 *
 * Dynamically injects CSS variables into the document root to apply
 * custom theme settings. Handles both light and dark mode variants.
 */

const THEME_STYLE_ID = 'custom-theme-styles';

/**
 * Generates CSS variable declarations from theme customization
 * Applies to both light and dark modes
 */
export function getThemeCSSVariables(theme: ThemeCustomization): string {
  const { colors, typography, sidebar, layout } = theme;

   // Generate CSS variables with HIGHER specificity using !important
   // to ensure they override default variables from index.css
   let cssVars = ':root {\n';

  // Helper function to set a CSS custom property
  const setCssProperty = (property: string, value: string, important = false) => {
    cssVars += `  ${property}: ${value}${important ? ' !important' : ''};\n`;
  };

  // Set accent color (always set first)
  setCssProperty('--accent', colors.accent, true);

  // Set primary color and its foreground
  setCssProperty('--primary', colors.primary, true);
  setCssProperty('--primary-foreground', '0 0% 100%', true); // White text on primary background

  // Set other color properties with their foreground colors
  setCssProperty('--secondary', colors.secondary, true);
  setCssProperty('--secondary-foreground', '0 0% 100%', true); // White text on secondary

  setCssProperty('--success', colors.success, true);
  setCssProperty('--success-foreground', '0 0% 100%', true); // White text on success

  setCssProperty('--warning', colors.warning, true);
  setCssProperty('--warning-foreground', '224 24% 14%', true); // Dark text on warning

  setCssProperty('--destructive', colors.destructive, true);
  setCssProperty('--destructive-foreground', '0 0% 100%', true); // White text on destructive

  setCssProperty('--muted', colors.muted, true);
  setCssProperty('--muted-foreground', colors.mutedForeground, true);

  setCssProperty('--tabs-active', colors.tabsActive, true);
  setCssProperty('--tabs-active-foreground', colors.tabsActiveForeground, true);

  setCssProperty('--ring', colors.ring, true);

  // Set layout properties
  setCssProperty('--background', layout.background, true);
  setCssProperty('--foreground', layout.foreground, true);

  setCssProperty('--card', layout.background, true); // Card uses same as background
  setCssProperty('--card-foreground', layout.foreground, true);

  setCssProperty('--popover', layout.background, true); // Popover uses same as background
  setCssProperty('--popover-foreground', layout.foreground, true);

  setCssProperty('--border', layout.border, true);
  setCssProperty('--input', layout.border, true); // Input border matches border

  setCssProperty('--radius', layout.radius);

  setCssProperty('--accent-foreground', '0 0% 100%', true); // White text on accent

  // Set sidebar properties
  setCssProperty('--sidebar-background', sidebar.background);
  setCssProperty('--sidebar-foreground', sidebar.foreground);
  setCssProperty('--sidebar-accent', sidebar.accent);
  setCssProperty('--sidebar-border', sidebar.border);

  // Set typography properties
  setCssProperty('--font-family', typography.fontFamily);
  setCssProperty('--heading-weight', typography.headingWeight);

   cssVars += '}\n';
   return cssVars;
 }

/**
 * Applies theme customization to the document
 * Creates or updates a style element in the document head
 * Applies to both light and dark modes
 */
export function applyTheme(theme: ThemeCustomization | null): void {
  // If no theme or theme is disabled, use defaults
  if (!theme || !theme.enabled) {
    const existingStyle = document.getElementById(THEME_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
      document.body.style.fontFamily = '';
    }
    return;
  }

  const newCss = getThemeCSSVariables(theme);
  let existingStyle = document.getElementById(THEME_STYLE_ID);

  // Always remove and recreate to ensure styles are applied with proper specificity
  // This is critical for the !important flags to take effect
  if (existingStyle) {
    existingStyle.remove();
    existingStyle = null;
  }

  // Create new style element
  const styleElement = document.createElement('style');
  styleElement.id = THEME_STYLE_ID;
  styleElement.textContent = newCss;

  // Append to document head
  document.head.appendChild(styleElement);

  // Apply typography font family to body
  if (theme.typography.fontFamily !== 'system') {
    document.documentElement.style.setProperty('--font-family', theme.typography.fontFamily);
    document.body.style.fontFamily = `var(--font-family), system-ui, -apple-system, sans-serif`;
  } else {
    document.documentElement.style.removeProperty('--font-family');
    document.body.style.fontFamily = '';
  }
}

/**
 * Resets theme to default
 * Removes custom theme styles
 */
export function resetTheme(): void {
  const existingStyle = document.getElementById(THEME_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Reset font family
  document.documentElement.style.removeProperty('--font-family');
  document.body.style.fontFamily = '';
}

/**
 * Gets the current theme from the style element (if exists)
 * Useful for debugging or reading current applied theme
 */
export function getCurrentTheme(): ThemeCustomization | null {
  const styleElement = document.getElementById(THEME_STYLE_ID);
  if (!styleElement) {
    return null;
  }

  // Parse CSS variables from style element
  // This is a simplified version - full parsing would require more complex logic
  // For now, we'll return null and rely on the source of truth (company settings)
  return null;
}

