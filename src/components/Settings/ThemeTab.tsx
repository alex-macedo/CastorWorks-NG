import { useState, useEffect } from "react";
import { ThemeCustomizationSection } from "./ThemeCustomizationSection";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { defaultTheme, defaultDarkTheme, defaultDualModeTheme } from "@/constants/defaultTheme";
import type { ThemeCustomization, DualModeTheme } from "@/types/theme";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ThemeTab() {
  const { t } = useLocalization();
  const { settings, updateSettings } = useCompanySettings();
  const [dualModeTheme, setDualModeTheme] = useState<DualModeTheme>(defaultDualModeTheme);
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!settings) return;
    const rawTheme = settings.theme_customization;
    
    // Check if the theme is already in dual-mode format
    if (rawTheme) {
      try {
        const parsedTheme = typeof rawTheme === 'string' ? JSON.parse(rawTheme) : rawTheme;
        
        // If it has both 'light' and 'dark' properties, it's already in dual-mode format
        if (parsedTheme.light && parsedTheme.dark && parsedTheme.activeMode) {
          setDualModeTheme(parsedTheme as DualModeTheme);
          setActiveMode(parsedTheme.activeMode);
        } else {
          // Legacy single-theme format - convert to dual-mode
          // Treat the old theme as the light mode
          const convertedTheme: DualModeTheme = {
            light: parsedTheme as ThemeCustomization,
            dark: defaultDarkTheme,
            activeMode: 'light',
          };
          setDualModeTheme(convertedTheme);
          setActiveMode('light');
        }
      } catch (error) {
        console.error('Failed to parse theme customization:', error);
        setDualModeTheme(defaultDualModeTheme);
        setActiveMode('light');
      }
    } else {
      setDualModeTheme(defaultDualModeTheme);
      setActiveMode('light');
    }
  }, [settings]);

  const handleThemeChange = (theme: ThemeCustomization) => {
    const updated: DualModeTheme = {
      ...dualModeTheme,
      [activeMode]: theme,
    };
    setDualModeTheme(updated);
  };

  const handleModeChange = (mode: 'light' | 'dark') => {
    setActiveMode(mode);
    setDualModeTheme({
      ...dualModeTheme,
      activeMode: mode,
    });
  };

  const handleSave = () => {
    updateSettings.mutate({
      theme_customization: dualModeTheme,
    });
  };

  const handleReset = () => {
    if (activeMode === 'light') {
      setDualModeTheme({
        ...dualModeTheme,
        light: defaultTheme,
      });
    } else {
      setDualModeTheme({
        ...dualModeTheme,
        dark: defaultDarkTheme,
      });
    }
  };

  const currentTheme = activeMode === 'light' ? dualModeTheme.light : dualModeTheme.dark;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.themeCustomization.title')}</CardTitle>
        <CardDescription>
          {t('settings.themeCustomization.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Light/Dark Mode Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            {t('settings.themeCustomization.modeSelector') || 'Theme Mode'}
          </label>
          <Tabs value={activeMode} onValueChange={(v) => handleModeChange(v as 'light' | 'dark')} variant="pill">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="light">
                ☀️ {t('settings.themeCustomization.lightMode') || 'Light Mode'}
              </TabsTrigger>
              <TabsTrigger value="dark">
                🌙 {t('settings.themeCustomization.darkMode') || 'Dark Mode'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Theme Customization Section */}
        <ThemeCustomizationSection
          value={currentTheme}
          onChange={handleThemeChange}
          onReset={handleReset}
          mode={activeMode}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 justify-start">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.themeCustomization.saveTheme')}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={updateSettings.isPending}
          >
            {t('settings.themeCustomization.resetTheme') || 'Reset ' + activeMode + ' Mode'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
