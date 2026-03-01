import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface SupplierScoreBadgeProps {
  score: number;
  className?: string;
}

export function SupplierScoreBadge({ score, className }: SupplierScoreBadgeProps) {
  let variant: "success" | "warning" | "destructive" | "default" = "default";
  let label = "Unknown";

  if (score >= 80) {
    variant = "success";
    label = "Excellent";
  } else if (score >= 60) {
    variant = "warning";
    label = "Good";
  } else if (score > 0) {
    variant = "destructive";
    label = "Needs Improvement";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant} 
            className={cn("cursor-help inline-flex items-center gap-2", className)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Score: {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Performance Score: {score}/100 ({label})</p>
          <p className="text-xs text-muted-foreground">Based on delivery time, quality, and pricing.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
