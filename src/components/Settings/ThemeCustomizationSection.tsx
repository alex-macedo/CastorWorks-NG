import { useState, useEffect, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ColorPicker } from "@/components/ui/color-picker";
import { ThemePreview } from "./ThemePreview";
import { useThemePreview } from "@/hooks/useThemeCustomization";
import { defaultTheme, defaultDarkTheme } from "@/constants/defaultTheme";
import { sanitizeTheme, validateTheme } from "@/utils/themeValidation";
import type { ThemeCustomization } from "@/types/theme";
import { RotateCcw } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTheme } from "next-themes";

interface ThemeCustomizationSectionProps {
  value: ThemeCustomization | null;
  onChange: (theme: ThemeCustomization) => void;
  onReset?: () => void;
  mode?: 'light' | 'dark';
}

export function ThemeCustomizationSection({
  value,
  onChange,
  onReset,
  mode,
}: ThemeCustomizationSectionProps) {
  const { t } = useLocalization();
  const { setTheme, resolvedTheme } = useTheme();
  const { previewTheme, clearPreview } = useThemePreview();
  const [showPreview, setShowPreview] = useState(false);
   const isHydratingRef = useRef(false);
   const isManuallyTogglingPreviewRef = useRef(false);
   const isUpdatingPreviewRef = useRef(false);
   const previewThemeRef = useRef<ThemeCustomization | null>(null);

  const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;

  const form = useForm<ThemeCustomization>({
    defaultValues: value || effectiveDefault,
  });

  const currentTheme = useWatch({ control: form.control });
  const previousThemeRef = useRef<ThemeCustomization | null>(null);

  // Sync incoming value into the internal form when it changes
  useEffect(() => {
    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
    const nextTheme = sanitizeTheme(value || effectiveDefault, effectiveDefault);
    const current = form.getValues();
    const nextString = JSON.stringify(nextTheme);
    const currentString = JSON.stringify(current);
    const previousString = previousThemeRef.current ? JSON.stringify(previousThemeRef.current) : null;

    // Only sync if:
    // 1. The incoming value is different from current form values
    // 2. The incoming value is different from what we last sent to parent
    // 3. We're not currently in the middle of a user-initiated change
    if (nextString !== currentString && nextString !== previousString) {
      // Check if this is just an enabled field change that we initiated
      const currentEnabled = current.enabled ?? false;
      const nextEnabled = nextTheme.enabled ?? false;
      const onlyEnabledChanged = 
        currentEnabled !== nextEnabled &&
        JSON.stringify({ ...current, enabled: nextEnabled }) === nextString;
      
      // If only enabled changed and it matches what we're trying to set, don't reset
      if (onlyEnabledChanged && currentEnabled !== nextEnabled) {
        // Just update the enabled field without resetting the whole form
        form.setValue('enabled', nextEnabled, { shouldDirty: false });
        previousThemeRef.current = nextTheme;
        return;
      }

      isHydratingRef.current = true;
      previousThemeRef.current = nextTheme;
      form.reset(nextTheme);
      // Update preview if enabled, but mark it so preview effect doesn't run again
      if (showPreview && !isManuallyTogglingPreviewRef.current) {
        previewThemeRef.current = nextTheme;
        previewTheme(nextTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, form, showPreview]); // Removed previewTheme from dependencies since it's now memoized and stable

  // Update parent form whenever theme changes (debounced to avoid excessive updates)
  useEffect(() => {
    // Skip if we're currently hydrating from parent value
    if (isHydratingRef.current) {
      // Reset flag after hydration is complete
      const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
      const sanitized = sanitizeTheme(currentTheme, effectiveDefault);
      previousThemeRef.current = sanitized;
      // Also update preview ref to prevent preview effect from running
      if (showPreview) {
        previewThemeRef.current = sanitized;
      }
      // Use setTimeout to ensure this runs after form.watch() has processed
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 0);
      return;
    }

    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
    const sanitized = sanitizeTheme(currentTheme, effectiveDefault);
    const themeString = JSON.stringify(sanitized);
    const previousThemeString = previousThemeRef.current ? JSON.stringify(previousThemeRef.current) : null;

    // Only update if theme actually changed
    if (themeString !== previousThemeString) {
      // Update ref BEFORE calling onChange to prevent sync effect from resetting
      previousThemeRef.current = sanitized;
      // Update preview ref to track what we're sending to parent
      if (showPreview) {
        previewThemeRef.current = sanitized;
      }
      onChange(sanitized);
    }
  }, [currentTheme, onChange, showPreview, mode]);

  // Sync app mode with active editing mode when preview is on
  useEffect(() => {
    if (showPreview && mode && resolvedTheme !== mode) {
      setTheme(mode);
    }
  }, [showPreview, mode, resolvedTheme, setTheme]);

  // Update preview when theme changes (but not when manually toggling or hydrating)
  useEffect(() => {
    // Skip if we're manually toggling preview, hydrating, updating preview, or if preview is off
    if (isManuallyTogglingPreviewRef.current || isHydratingRef.current || isUpdatingPreviewRef.current || !showPreview) {
      return;
    }

    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
    const sanitized = sanitizeTheme(currentTheme, effectiveDefault);
    const sanitizedString = JSON.stringify(sanitized);
    const previousPreviewString = previewThemeRef.current ? JSON.stringify(previewThemeRef.current) : null;

    // Only update preview if theme actually changed
    if (sanitizedString !== previousPreviewString) {
      previewThemeRef.current = sanitized;
      isUpdatingPreviewRef.current = true;
      previewTheme(sanitized);

      // Reset flag after a brief delay to allow state to settle
      setTimeout(() => {
        isUpdatingPreviewRef.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, showPreview, mode]); // Removed previewTheme from dependencies to prevent loops

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  const handleReset = () => {
    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
    form.reset(effectiveDefault);
    previousThemeRef.current = effectiveDefault;
    if (onReset) {
      onReset();
    }
    if (showPreview) {
      previewTheme(effectiveDefault);
    }
  };

  const handleTogglePreview = (checked: boolean) => {
    isManuallyTogglingPreviewRef.current = true;
    setShowPreview(checked);
    if (checked) {
      const sanitized = sanitizeTheme(currentTheme, defaultTheme);
      previewThemeRef.current = sanitized;
      previewTheme(sanitized);
    } else {
      previewThemeRef.current = null;
      clearPreview();
    }
    // Reset flag after a brief delay to allow state to settle
    setTimeout(() => {
      isManuallyTogglingPreviewRef.current = false;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4 gap-4">
        {mode && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </span>
            <span className="text-xs text-muted-foreground">
              Editing theme for this mode
            </span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Switch
                id="preview-mode"
                checked={showPreview}
                onCheckedChange={handleTogglePreview}
              />
              <Label htmlFor="preview-mode" className="cursor-pointer font-bold text-primary">
                {t('settings.themeCustomization.livePreview')}
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[150px] text-right">
              {t('settings.themeCustomization.preview.description', { defaultValue: 'See unsaved changes in real-time' })}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('settings.themeCustomization.reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className={showPreview ? "xl:col-span-8 space-y-6" : "xl:col-span-12 space-y-6"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Accordion type="multiple" defaultValue={["colors"]} className="w-full space-y-4">

            <AccordionItem value="colors">
              <AccordionTrigger>{t('settings.themeCustomization.colors.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <Controller
                    name="colors.primary"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.primary')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.secondary"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.secondary')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.success"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.success')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.warning"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.warning')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.destructive"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.destructive')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.accent"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.accent')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.muted"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.muted')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.mutedForeground"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.mutedForeground', { defaultValue: 'Inactive Tab Text' })}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.tabsActive"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.tabsActive', { defaultValue: 'Active Tab Background' })}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.tabsActiveForeground"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.tabsActiveForeground', { defaultValue: 'Active Tab Text' })}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="colors.ring"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.colors.ring')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Accordion type="multiple" defaultValue={["sidebar", "layout"]} className="w-full space-y-4">
            <AccordionItem value="buttons">
              <AccordionTrigger>{t('settings.themeCustomization.buttons.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('settings.themeCustomization.buttons.borderRadius')}</Label>
                    <Controller
                      name="buttonStyle.borderRadius"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "rounded-md"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rounded-md">{t('settings.themeCustomization.buttons.borderRadiusOptions.rounded-md')}</SelectItem>
                            <SelectItem value="rounded-lg">{t('settings.themeCustomization.buttons.borderRadiusOptions.rounded-lg')}</SelectItem>
                            <SelectItem value="rounded-full">{t('settings.themeCustomization.buttons.borderRadiusOptions.rounded-full')}</SelectItem>
                            <SelectItem value="rounded-none">{t('settings.themeCustomization.buttons.borderRadiusOptions.rounded-none')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('settings.themeCustomization.buttons.variant')}</Label>
                    <Controller
                      name="buttonStyle.variant"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "default"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{t('settings.themeCustomization.buttons.variantOptions.default')}</SelectItem>
                            <SelectItem value="rounded">{t('settings.themeCustomization.buttons.variantOptions.rounded')}</SelectItem>
                            <SelectItem value="square">{t('settings.themeCustomization.buttons.variantOptions.square')}</SelectItem>
                            <SelectItem value="pill">{t('settings.themeCustomization.buttons.variantOptions.pill')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cards">
              <AccordionTrigger>{t('settings.themeCustomization.cards.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('settings.themeCustomization.cards.borderRadius')}</Label>
                    <Controller
                      name="cardStyle.borderRadius"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "rounded-xl"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rounded-lg">{t('settings.themeCustomization.cards.borderRadiusOptions.rounded-lg')}</SelectItem>
                            <SelectItem value="rounded-xl">{t('settings.themeCustomization.cards.borderRadiusOptions.rounded-xl')}</SelectItem>
                            <SelectItem value="rounded-2xl">{t('settings.themeCustomization.cards.borderRadiusOptions.rounded-2xl')}</SelectItem>
                            <SelectItem value="rounded-none">{t('settings.themeCustomization.cards.borderRadiusOptions.rounded-none')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('settings.themeCustomization.cards.shadow')}</Label>
                    <Controller
                      name="cardStyle.shadow"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "md"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sm">{t('settings.themeCustomization.cards.shadowOptions.sm')}</SelectItem>
                            <SelectItem value="md">{t('settings.themeCustomization.cards.shadowOptions.md')}</SelectItem>
                            <SelectItem value="lg">{t('settings.themeCustomization.cards.shadowOptions.lg')}</SelectItem>
                            <SelectItem value="none">{t('settings.themeCustomization.cards.shadowOptions.none')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('settings.themeCustomization.cards.borderWidth')}</Label>
                    <Controller
                      name="cardStyle.borderWidth"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "1"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t('settings.themeCustomization.cards.borderWidthOptions.1')}</SelectItem>
                            <SelectItem value="2">{t('settings.themeCustomization.cards.borderWidthOptions.2')}</SelectItem>
                            <SelectItem value="0">{t('settings.themeCustomization.cards.borderWidthOptions.0')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="typography">
              <AccordionTrigger>{t('settings.themeCustomization.typography.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('settings.themeCustomization.typography.fontFamily')}</Label>
                    <Controller
                      name="typography.fontFamily"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "system"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Inter">{t('settings.themeCustomization.typography.fontFamilyOptions.Inter')}</SelectItem>
                            <SelectItem value="Roboto">{t('settings.themeCustomization.typography.fontFamilyOptions.Roboto')}</SelectItem>
                            <SelectItem value="Open Sans">{t('settings.themeCustomization.typography.fontFamilyOptions.Open Sans')}</SelectItem>
                            <SelectItem value="system">{t('settings.themeCustomization.typography.fontFamilyOptions.system')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('settings.themeCustomization.typography.headingWeight')}</Label>
                    <Controller
                      name="typography.headingWeight"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "600"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400">{t('settings.themeCustomization.typography.headingWeightOptions.400')}</SelectItem>
                            <SelectItem value="500">{t('settings.themeCustomization.typography.headingWeightOptions.500')}</SelectItem>
                            <SelectItem value="600">{t('settings.themeCustomization.typography.headingWeightOptions.600')}</SelectItem>
                            <SelectItem value="700">{t('settings.themeCustomization.typography.headingWeightOptions.700')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sidebar">
              <AccordionTrigger>{t('settings.themeCustomization.sidebar.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <Controller
                    name="sidebar.background"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.sidebar.background')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="sidebar.foreground"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.sidebar.foreground')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="sidebar.accent"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.sidebar.accent')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="sidebar.border"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.sidebar.border')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="layout">
              <AccordionTrigger>{t('settings.themeCustomization.layout.title')}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <Controller
                    name="layout.background"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.layout.background')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="layout.foreground"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.layout.foreground')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="layout.border"
                    control={form.control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.themeCustomization.layout.border')}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <div>
                    <Label>{t('settings.themeCustomization.layout.radius')}</Label>
                    <Controller
                      name="layout.radius"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || "0.5rem"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0rem">0px (None)</SelectItem>
                            <SelectItem value="0.25rem">4px (Small)</SelectItem>
                            <SelectItem value="0.5rem">8px (Medium)</SelectItem>
                            <SelectItem value="0.75rem">12px (Large)</SelectItem>
                            <SelectItem value="1rem">16px (Extra Large)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </div>

          <div className="flex flex-col gap-2 pt-4 bg-muted/30 p-4 rounded-lg border-2 border-primary/20 shadow-sm">
            <div className="flex items-center gap-3">
              <Controller
                name="enabled"
                control={form.control}
                onChange={([checked]) => {
                  // If enabling globally, we might want to also toggle preview to show success
                  if (checked && !showPreview) {
                    handleTogglePreview(true);
                  }
                  return checked;
                }}
                render={({ field }) => {
                  const handleEnabledChange = (checked: boolean) => {
                    field.onChange(checked);
                    const currentValues = form.getValues();
                    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
                    const updatedTheme = { ...currentValues, enabled: checked };
                    const sanitized = sanitizeTheme(updatedTheme, effectiveDefault);
                    previousThemeRef.current = sanitized;
                    onChange(sanitized);
                  };

                  return (
                    <Switch
                      id="theme-enabled"
                      checked={field.value ?? false}
                      onCheckedChange={handleEnabledChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  );
                }}
              />
              <div className="flex flex-col">
                <Label 
                  htmlFor="theme-enabled" 
                  className="cursor-pointer font-bold text-lg"
                  onClick={() => {
                    const currentValue = form.getValues('enabled') ?? false;
                    const newValue = !currentValue;
                    form.setValue('enabled', newValue, { shouldDirty: true });
                    const currentValues = form.getValues();
                    const updatedTheme = { ...currentValues, enabled: newValue };
                    const effectiveDefault = mode === 'dark' ? defaultDarkTheme : defaultTheme;
                    const sanitized = sanitizeTheme(updatedTheme, effectiveDefault);
                    previousThemeRef.current = sanitized;
                    onChange(sanitized);
                  }}
                >
                  {t('settings.themeCustomization.enableCustomTheme')}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {t('settings.themeCustomization.enableDescription', { defaultValue: 'Apply this theme to the whole organization after saving' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="lg:sticky lg:top-4 lg:h-fit xl:col-span-4">
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {t('settings.themeCustomization.preview.title')}
                </CardTitle>
                <CardDescription>
                  {t('settings.themeCustomization.preview.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background dark:bg-slate-900 rounded-lg p-1">
                  <ThemePreview 
                    theme={sanitizeTheme(currentTheme, mode === 'dark' ? defaultDarkTheme : defaultTheme)} 
                    mode={mode} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
