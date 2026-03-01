import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconClassName?: string;
  className?: string;
  animate?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  iconClassName = "text-muted-foreground",
  className,
  animate = true,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        animate && "animate-fade-in"
      )}>
        <div className={cn(
          "w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6",
          animate && "animate-scale-in"
        )}>
          <Icon className={cn("h-12 w-12", iconClassName)} />
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
