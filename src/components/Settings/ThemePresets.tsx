import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThemeCustomization, ThemePreset as PresetType } from "@/types/theme";
import { defaultTheme } from "@/constants/defaultTheme";
import { Palette, Zap, Minus, Bold } from "lucide-react";

interface ThemePresetsProps {
  onSelect: (theme: ThemeCustomization) => void;
  currentPreset?: PresetType;
}

/**
 * Pre-defined theme presets
 */
const presets: Record<PresetType, ThemeCustomization> = {
  professional: defaultTheme,
  
  modern: {
    ...defaultTheme,
    colors: {
      primary: "220 90% 56%",
      secondary: "280 90% 56%",
      success: "142 71% 45%",
      warning: "38 92% 50%",
      destructive: "0 84% 60%",
      accent: "220 90% 95%",
      muted: "220 13% 95%",
    },
    buttonStyle: {
      borderRadius: "rounded-lg",
      variant: "rounded",
    },
    cardStyle: {
      borderRadius: "rounded-xl",
      shadow: "md",
      borderWidth: "1",
    },
  },

  minimal: {
    ...defaultTheme,
    colors: {
      primary: "220 13% 18%",
      secondary: "220 13% 46%",
      success: "142 36% 45%",
      warning: "38 36% 50%",
      destructive: "0 65% 50%",
      accent: "220 13% 96%",
      muted: "220 13% 98%",
    },
    buttonStyle: {
      borderRadius: "rounded-md",
      variant: "square",
    },
    cardStyle: {
      borderRadius: "rounded-lg",
      shadow: "sm",
      borderWidth: "2",
    },
    typography: {
      fontFamily: "Inter",
      headingWeight: "500",
    },
  },

  bold: {
    ...defaultTheme,
    colors: {
      primary: "271 81% 56%",
      secondary: "25 95% 53%",
      success: "142 71% 45%",
      warning: "45 93% 47%",
      destructive: "0 84% 60%",
      accent: "271 81% 95%",
      muted: "220 13% 95%",
    },
    buttonStyle: {
      borderRadius: "rounded-full",
      variant: "pill",
    },
    cardStyle: {
      borderRadius: "rounded-2xl",
      shadow: "lg",
      borderWidth: "0",
    },
    typography: {
      fontFamily: "Roboto",
      headingWeight: "700",
    },
  },

  custom: defaultTheme, // Placeholder for custom theme
};

const presetIcons = {
  professional: Palette,
  modern: Zap,
  minimal: Minus,
  bold: Bold,
  custom: Palette,
};

const presetDescriptions: Record<PresetType, string> = {
  professional: "Clean and professional, perfect for business",
  modern: "Vibrant and contemporary with rounded elements",
  minimal: "Subtle and understated, maximum clarity",
  bold: "High contrast and attention-grabbing",
  custom: "Your custom theme settings",
};

export function ThemePresets({ onSelect, currentPreset }: ThemePresetsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Theme Presets</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Start with a pre-designed theme or create your own
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(presets) as PresetType[]).map((preset) => {
          if (preset === "custom") return null; // Skip custom preset in grid
          
          const theme = presets[preset];
          const Icon = presetIcons[preset];
          const isSelected = currentPreset === preset;

          return (
            <Card
              key={preset}
              className={`cursor-pointer transition-all hover:border-primary ${
                isSelected ? "border-primary border-2" : ""
              }`}
              onClick={() => onSelect(theme)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <CardTitle className="text-sm capitalize">{preset}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {presetDescriptions[preset]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  <div
                    className="h-8 flex-1 rounded"
                    style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                  />
                  <div
                    className="h-8 flex-1 rounded"
                    style={{ backgroundColor: `hsl(${theme.colors.secondary})` }}
                  />
                  <div
                    className="h-8 flex-1 rounded"
                    style={{ backgroundColor: `hsl(${theme.colors.success})` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

