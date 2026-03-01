import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useThemeCustomization } from "@/hooks/useThemeCustomization";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider wrapper that applies company theme customization
 * on top of the base light/dark theme system
 * 
 * TEMPORARILY DISABLED: ThemeCustomizationWrapper for static corporate theme testing
 * The useThemeCustomization hook applies HSL colors with !important which
 * overrides the static RGB theme in index.css
 */
function ThemeCustomizationWrapper({ children }: { children: ReactNode }) {
  // useThemeCustomization(); // DISABLED for static corporate theme
  return <>{children}</>;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeCustomizationWrapper>
        {children}
      </ThemeCustomizationWrapper>
    </NextThemesProvider>
  );
};
