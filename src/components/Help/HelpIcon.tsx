import * as React from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

export interface HelpIconProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
  /**
   * Whether to show the app version in the popover footer.
   * Defaults to false.
   */
  showVersion?: boolean;
}

export function HelpIcon({ content, title, className, showVersion = false }: HelpIconProps) {
  const { t } = useLocalization();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors",
            className
          )}
          type="button"
          aria-label={t("common.help")}
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        {title && <h4 className="font-medium mb-2">{title}</h4>}
        <div className="text-sm text-muted-foreground">
          {content}
        </div>
        {showVersion && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground/70">
              Version {__APP_VERSION__}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}