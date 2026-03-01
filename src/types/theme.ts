/**
 * @deprecated
 * Theme types are deprecated.
 *
 * REASON: Theme customization is now static in CSS using RGB format.
 * Database-driven theme customization has been removed.
 *
 * TO REMOVE: This file can be safely deleted after verifying the new theme works.
 *
 * These types defined:
 * - ThemeColors (HSL color format for customization)
 * - ThemeCustomization (full theme customization structure)
 * - PartialThemeCustomization (optional fields)
 *
 * Theme is now defined statically in src/index.css.
 */

export interface ThemeColors {
  primary: string; // HSL format: "271 81% 56%"
  secondary: string;
  success: string;
  warning: string;
  destructive: string;
  accent: string;
  muted: string;
  mutedForeground: string;
  tabsActive: string;
  tabsActiveForeground: string;
  ring: string;
}

export type ButtonBorderRadius = "rounded-md" | "rounded-lg" | "rounded-full" | "rounded-none";
export type ButtonVariant = "default" | "rounded" | "square" | "pill";

export interface ButtonStyle {
  borderRadius: ButtonBorderRadius;
  variant: ButtonVariant;
}

export type CardBorderRadius = "rounded-lg" | "rounded-xl" | "rounded-2xl" | "rounded-none";
export type CardShadow = "sm" | "md" | "lg" | "none";
export type CardBorderWidth = "1" | "2" | "0";

export interface CardStyle {
  borderRadius: CardBorderRadius;
  shadow: CardShadow;
  borderWidth: CardBorderWidth;
}

export type FontFamily = "Inter" | "Roboto" | "Open Sans" | "system";
export type HeadingWeight = "400" | "500" | "600" | "700";

export interface TypographySettings {
  fontFamily: FontFamily;
  headingWeight: HeadingWeight;
}

export interface SidebarSettings {
  background: string;
  foreground: string;
  accent: string;
  border: string;
}

export interface LayoutSettings {
  background: string;
  foreground: string;
  border: string;
  radius: string; // e.g., "0.5rem"
}

export interface ThemeCustomization {
  colors: ThemeColors;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  typography: TypographySettings;
  sidebar: SidebarSettings;
  layout: LayoutSettings;
  enabled: boolean;
}

/**
 * Partial theme customization for updates
 */
export type PartialThemeCustomization = Partial<ThemeCustomization>;

/**
 * Theme preset identifier
 */
export type ThemePreset = "professional" | "modern" | "minimal" | "bold" | "custom";

/**
 * DualModeTheme - Supports separate theme customization for light and dark modes
 * Allows users to configure different color schemes and styling for each mode independently
 */
export interface DualModeTheme {
  light: ThemeCustomization;
  dark: ThemeCustomization;
  activeMode: 'light' | 'dark';
}

