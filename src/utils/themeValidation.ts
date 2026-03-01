/**
 * @deprecated
 * Theme validation utility is deprecated.
 *
 * REASON: The corporate theme uses RGB format defined in CSS, not HSL.
 * Validation functions for HSL colors are no longer needed.
 *
 * TO REMOVE: This file can be safely deleted after verifying the new theme works.
 *
 * This file provided:
 * - HSL color format validation
 * - WCAG contrast ratio calculations
 * - RGB color format validation and conversion
 *
 * All theme validation is now handled by static CSS definitions.
 */
import type { ThemeCustomization, ThemeColors, PartialThemeCustomization } from '@/types/theme';

/**
 * Validates HSL color format
 * Expected format: "H S% L%" (e.g., "271 81% 56%")
 */
export function isValidHSLColor(color: string): boolean {
  const hslRegex = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
  if (!hslRegex.test(color)) {
    return false;
  }

  const parts = color.split(/\s+/);
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1]);
  const l = parseInt(parts[2]);

  return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
}

/**
 * Validates all colors in a ThemeColors object
 */
export function validateThemeColors(colors: ThemeColors): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const colorKeys: (keyof ThemeColors)[] = ['primary', 'secondary', 'success', 'warning', 'destructive', 'accent', 'muted', 'mutedForeground', 'tabsActive', 'tabsActiveForeground'];

  colorKeys.forEach((key) => {
    if (!colors[key] || !isValidHSLColor(colors[key])) {
      errors.push(`Invalid HSL color format for ${key}: ${colors[key]}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Converts HSL string to RGB for contrast calculation
 * Format: "H S% L%" -> {r, g, b}
 */
function hslToRgb(hsl: string): { r: number; g: number; b: number } {
  const parts = hsl.split(/\s+/);
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculates relative luminance for contrast ratio
 * Based on WCAG 2.1 guidelines
 */
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates contrast ratio between two colors
 * Returns a value between 1 and 21
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hslToRgb(color1);
  const rgb2 = hslToRgb(color2);

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validates contrast ratios for accessibility
 * Checks primary/foreground combinations meet WCAG AA standards
 */
export function validateAccessibility(colors: ThemeColors): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const foreground = "0 0% 100%"; // White foreground (typical for primary buttons)

  // Check primary color contrast
  const primaryContrast = getContrastRatio(colors.primary, foreground);
  if (primaryContrast < 4.5) {
    warnings.push(`Primary color contrast ratio (${primaryContrast.toFixed(2)}) is below WCAG AA standard (4.5:1)`);
  }

  // Check secondary color contrast
  const secondaryContrast = getContrastRatio(colors.secondary, foreground);
  if (secondaryContrast < 4.5) {
    warnings.push(`Secondary color contrast ratio (${secondaryContrast.toFixed(2)}) is below WCAG AA standard (4.5:1)`);
  }

  // Check destructive color contrast
  const destructiveContrast = getContrastRatio(colors.destructive, foreground);
  if (destructiveContrast < 4.5) {
    warnings.push(`Destructive color contrast ratio (${destructiveContrast.toFixed(2)}) is below WCAG AA standard (4.5:1)`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Validates a complete theme customization object
 */
export function validateTheme(theme: PartialThemeCustomization): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (theme.colors) {
    const colorValidation = validateThemeColors(theme.colors);
    errors.push(...colorValidation.errors);

    const accessibilityValidation = validateAccessibility(theme.colors);
    warnings.push(...accessibilityValidation.warnings);
  }

  // Validate button style if provided
  if (theme.buttonStyle) {
    const validBorderRadius = ["rounded-md", "rounded-lg", "rounded-full", "rounded-none"];
    if (!validBorderRadius.includes(theme.buttonStyle.borderRadius || "")) {
      errors.push(`Invalid button borderRadius: ${theme.buttonStyle.borderRadius}`);
    }

    const validVariants = ["default", "rounded", "square", "pill"];
    if (!validVariants.includes(theme.buttonStyle.variant || "")) {
      errors.push(`Invalid button variant: ${theme.buttonStyle.variant}`);
    }
  }

  // Validate card style if provided
  if (theme.cardStyle) {
    const validCardRadius = ["rounded-lg", "rounded-xl", "rounded-2xl", "rounded-none"];
    if (!validCardRadius.includes(theme.cardStyle.borderRadius || "")) {
      errors.push(`Invalid card borderRadius: ${theme.cardStyle.borderRadius}`);
    }

    const validShadows = ["sm", "md", "lg", "none"];
    if (!validShadows.includes(theme.cardStyle.shadow || "")) {
      errors.push(`Invalid card shadow: ${theme.cardStyle.shadow}`);
    }

    const validBorderWidths = ["1", "2", "0"];
    if (!validBorderWidths.includes(theme.cardStyle.borderWidth || "")) {
      errors.push(`Invalid card borderWidth: ${theme.cardStyle.borderWidth}`);
    }
  }

  // Validate typography if provided
  if (theme.typography) {
    const validFonts = ["Inter", "Roboto", "Open Sans", "system"];
    if (!validFonts.includes(theme.typography.fontFamily || "")) {
      errors.push(`Invalid font family: ${theme.typography.fontFamily}`);
    }

    const validWeights = ["400", "500", "600", "700"];
    if (!validWeights.includes(theme.typography.headingWeight || "")) {
      errors.push(`Invalid heading weight: ${theme.typography.headingWeight}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes theme data before saving
 * Ensures all required fields are present and valid
 */
export function sanitizeTheme(theme: PartialThemeCustomization, defaultTheme: ThemeCustomization): ThemeCustomization {
  return {
    colors: {
      ...defaultTheme.colors,
      ...theme.colors,
      tabsActive: theme.colors?.tabsActive ?? defaultTheme.colors.tabsActive,
      tabsActiveForeground: theme.colors?.tabsActiveForeground ?? defaultTheme.colors.tabsActiveForeground,
      mutedForeground: theme.colors?.mutedForeground ?? defaultTheme.colors.mutedForeground,
    },
    buttonStyle: {
      ...defaultTheme.buttonStyle,
      ...theme.buttonStyle,
    },
    cardStyle: {
      ...defaultTheme.cardStyle,
      ...theme.cardStyle,
    },
    typography: {
      ...defaultTheme.typography,
      ...theme.typography,
    },
    sidebar: {
      ...defaultTheme.sidebar,
      ...theme.sidebar,
    },
    layout: {
      ...defaultTheme.layout,
      ...theme.layout,
    },
    enabled: theme.enabled ?? defaultTheme.enabled,
  };
}
