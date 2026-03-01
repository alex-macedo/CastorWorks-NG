import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  change?: string;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "success" | "warning" | "secondary";
  compact?: boolean;
  accent?: "gradient" | "solid" | "vibrant";
  hint?: string;
  onClick?: () => void;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  change,
  trend,
  color = "primary",
  compact = false,
  accent = "solid",
  hint,
  onClick,
}: MetricCardProps) => {
  return (
    <Card
      className={cn(
        "relative h-full transition-all border border-border/50",
        "hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : "region"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? undefined : `${title} metric`}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      } : undefined}
    >
      <CardHeader className={cn("flex flex-row items-start justify-between pb-2 space-y-0", {
        "pt-4 px-4": compact,
      })}>
        <CardTitle className={cn("text-sm font-semibold text-muted-foreground", {
          "text-xs": compact,
        })}>
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10", {
          "p-1.5": compact,
        })}>
          <Icon className={cn("h-4 w-4 text-blue-600 dark:text-blue-400", {
            "h-3.5 w-3.5": compact,
          })} aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className={cn({
        "pb-4 px-4": compact,
      })}>
        <div className={cn("text-3xl font-bold tracking-tight", {
          "text-xl": compact,
        })}>
           <CountUp end={value} />
        </div>
        {change && (
          <div
            className={cn("text-xs font-medium mt-1 text-muted-foreground")}
            aria-label={`change ${change} trend ${trend || 'neutral'}`}
          >
            {change}
          </div>
        )}
        {hint && (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
};