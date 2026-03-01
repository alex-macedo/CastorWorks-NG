import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card className={cn(
      "border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 group overflow-hidden",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300",
            iconClassName
          )}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center text-xs font-medium gap-1 px-2 py-1 rounded-full",
              trend.isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            )}>
              <TrendingUp className="h-3 w-3" />
              <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            {description && (
              <span className="text-xs text-muted-foreground truncate">{description}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
