import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIIndicatorProps {
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "compact";
}

export function AIIndicator({ className, showLabel = false, variant = "default" }: AIIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-sky-500/10 via-primary/10 to-blue-600/10 border border-primary/30",
              variant === "compact" && "px-2 py-0.5",
              className
            )}
          >
            <Sparkles className={cn(
              "text-primary",
              variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            {showLabel && (
              <span className={cn(
                "font-medium text-primary",
                variant === "compact" ? "text-xs" : "text-sm"
              )}>
                AI
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI-powered features available</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
