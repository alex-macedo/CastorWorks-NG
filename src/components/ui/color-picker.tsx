import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Converts HSL string to hex color
 * Format: "H S% L%" -> "#RRGGBB"
 */
function hslToHex(hsl: string): string {
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

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts hex color to HSL string
 * Format: "#RRGGBB" -> "H S% L%"
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace("#", "");

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${h} ${s}% ${lPercent}%`;
}

export interface ColorPickerProps {
  value: string; // HSL format: "271 81% 56%"
  onChange: (value: string) => void; // Returns HSL format
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ value, onChange, label, className, disabled, ...props }, ref) => {
    const [hexValue, setHexValue] = React.useState(() => {
      try {
        return hslToHex(value);
      } catch {
        return "#000000";
      }
    });

    // Update hex value when HSL value changes externally
    React.useEffect(() => {
      try {
        const newHex = hslToHex(value);
        if (newHex !== hexValue) {
          setHexValue(newHex);
        }
      } catch {
        // Invalid HSL, keep current hex
      }
    }, [value, hexValue]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHex = e.target.value;
      setHexValue(newHex);

      try {
        const newHsl = hexToHsl(newHex);
        onChange(newHsl);
      } catch {
        // Invalid hex, ignore
      }
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 rounded-md border-2 border-border"
            style={{ backgroundColor: hexValue }}
          />
          <Input
            ref={ref}
            type="color"
            value={hexValue}
            onChange={handleHexChange}
            disabled={disabled}
            className="h-10 w-20 cursor-pointer"
            {...props}
          />
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 font-mono text-sm"
            placeholder="271 81% 56%"
          />
        </div>
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

