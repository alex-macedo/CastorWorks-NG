import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ThemeCustomization } from "@/types/theme";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ThemePreviewProps {
  theme: ThemeCustomization;
  className?: string;
  mode?: 'light' | 'dark';
}

export function ThemePreview({ theme, className, mode }: ThemePreviewProps) {
  const { t } = useLocalization();
  const { colors, buttonStyle, cardStyle, typography, sidebar, layout } = theme;

  // Apply theme styles dynamically
  const cardClassName = cn(
    "border",
    cardStyle.borderRadius,
    cardStyle.shadow === "none" ? "" : cardStyle.shadow === "sm" ? "shadow-sm" : cardStyle.shadow === "md" ? "shadow-md" : "shadow-lg",
    cardStyle.borderWidth === "0" ? "border-0" : cardStyle.borderWidth === "1" ? "border" : "border-2"
  );

  const buttonClassName = cn(
    buttonStyle.borderRadius,
    // Note: Variant styles are handled by Button component variants
    // Border radius is the main customizable aspect
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('themePreview.colorPalette')}</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.primary})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.primary')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.secondary})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.secondary')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.success})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.success')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.warning})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.warning')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.destructive})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.destructive')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.accent})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('themePreview.accent')}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.muted})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('settings.themeCustomization.colors.muted', { defaultValue: 'Muted Background' })}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.mutedForeground})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('settings.themeCustomization.colors.mutedForeground', { defaultValue: 'Inactive Tab Text' })}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.tabsActive})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('settings.themeCustomization.colors.tabsActive', { defaultValue: 'Active Tab Bg' })}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.tabsActiveForeground})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('settings.themeCustomization.colors.tabsActiveForeground', { defaultValue: 'Active Tab Text' })}</p>
          </div>
          <div className="space-y-2">
            <div
              className="h-16 w-full rounded-md border-2 border-border"
              style={{ backgroundColor: `hsl(${colors.ring})` }}
            />
            <p className="text-xs text-center text-muted-foreground">{t('settings.themeCustomization.colors.ring')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tabs & Selection Preview</h3>
        <div 
          className="w-full max-w-md rounded-lg overflow-hidden border shadow-sm"
          style={{ backgroundColor: layout.background }}
        >
          {/* Tab Bar Preview */}
          <div 
            className="flex items-center gap-2 p-1"
            style={{ backgroundColor: `hsl(${colors.muted})` }}
          >
            <div 
              className="px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-all"
              style={{ 
                backgroundColor: `hsl(${colors.tabsActive})`,
                color: `hsl(${colors.tabsActiveForeground})`
              }}
            >
              Active Tab
            </div>
            <div 
              className="px-3 py-1.5 rounded-md text-sm font-medium"
              style={{ 
                color: `hsl(${colors.mutedForeground})`
              }}
            >
              Inactive Tab
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="w-full rounded-md border bg-popover text-popover-foreground shadow-sm p-1">
              <div 
                className="flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none"
                style={{ 
                  backgroundColor: `hsl(${colors.accent})`,
                  color: '#fff' // Standard accent foreground is white
                }}
              >
                <span className="flex-1">Selected Menu Item</span>
                <span className="ml-auto h-4 w-4">✓</span>
              </div>
              <div className="flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none">
                <span className="flex-1">Normal Item</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('themePreview.buttonStyles')}</h3>
        <div className="flex flex-wrap gap-4">
          <Button className={buttonClassName} variant="default">
            {t('default')}
          </Button>
          <Button className={buttonClassName} variant="secondary">
            {t('themePreview.secondary')}
          </Button>
          <Button className={buttonClassName} variant="destructive">
            {t('themePreview.destructive')}
          </Button>
          <Button className={buttonClassName} variant="outline">
            {t('themePreview.outline')}
          </Button>
          <Button className={buttonClassName} variant="ghost">
            {t('themePreview.ghost')}
          </Button>
          <Button className={buttonClassName} variant="link">
            {t('themePreview.link')}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('themePreview.cardStyles')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle style={{ fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily, fontWeight: parseInt(typography.headingWeight) }}>
                {t('themePreview.cardTitle')}
              </CardTitle>
              <CardDescription>{t('themePreview.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{t('themePreview.cardContent')}</p>
            </CardContent>
          </Card>
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle style={{ fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily, fontWeight: parseInt(typography.headingWeight) }}>
                {t('themePreview.anotherCard')}
              </CardTitle>
              <CardDescription>{t('themePreview.withBadges')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">{t('default')}</Badge>
                <Badge variant="secondary">{t('themePreview.secondary')}</Badge>
                <Badge variant="success">{t('themePreview.success')}</Badge>
                <Badge variant="destructive">{t('themePreview.destructive')}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('themePreview.typography')}</h3>
        <div className="space-y-2">
          <h1
            style={{
              fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily,
              fontWeight: parseInt(typography.headingWeight),
            }}
          >
            {t('themePreview.heading1', { fontFamily: typography.fontFamily, fontWeight: typography.headingWeight })}
          </h1>
          <h2
            style={{
              fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily,
              fontWeight: parseInt(typography.headingWeight),
            }}
          >
            {t('themePreview.heading2')}
          </h2>
          <h3
            style={{
              fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily,
              fontWeight: parseInt(typography.headingWeight),
            }}
          >
            {t('themePreview.heading3')}
          </h3>
          <p style={{ fontFamily: typography.fontFamily === 'system' ? 'system-ui' : typography.fontFamily }}>
            {t('themePreview.bodyText')}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('settings.themeCustomization.sidebar.title')}</h3>
        <div 
          className="p-4 rounded-lg flex items-center justify-between border"
          style={{ 
            backgroundColor: `hsl(${sidebar.background})`,
            color: `hsl(${sidebar.foreground})`,
            borderColor: `hsl(${sidebar.border})`
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="h-8 w-8 rounded-md"
              style={{ backgroundColor: `hsl(${sidebar.accent})` }}
            />
            <span className="font-medium">Sidebar Preview</span>
          </div>
          <Badge 
            variant="outline"
            style={{ 
              borderColor: `hsl(${sidebar.foreground})`,
              color: `hsl(${sidebar.foreground})`
            }}
          >
            Active Item Accent
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('settings.themeCustomization.layout.title')}</h3>
        <div 
          className="p-8 border-2 border-dashed flex flex-col items-center gap-4"
          style={{ 
            backgroundColor: `hsl(${layout.background})`,
            color: `hsl(${layout.foreground})`,
            borderColor: `hsl(${layout.border})`,
            borderRadius: layout.radius
          }}
        >
          <p className="text-center font-medium">Page Layout Preview</p>
          <div 
            className="w-24 h-4 border border-current opacity-20"
            style={{ borderRadius: layout.radius }}
          />
          <p className="text-xs opacity-60">Global radius: {layout.radius}</p>
        </div>
      </div>
    </div>
  );
}

