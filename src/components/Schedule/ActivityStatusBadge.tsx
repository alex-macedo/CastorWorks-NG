import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";

interface ActivityStatusBadgeProps {
  status: "completed" | "delayed" | "in_progress" | "not_started";
  size?: "sm" | "md";
}

export function ActivityStatusBadge({ status, size = "md" }: ActivityStatusBadgeProps) {
  const { t } = useLocalization();

  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          label: t("schedule:status.completed"),
          className: "bg-success hover:bg-success",
          icon: CheckCircle2,
        };
      case "delayed":
        return {
          label: t("schedule:status.delayed"),
          className: "bg-destructive hover:bg-destructive",
          icon: AlertCircle,
        };
      case "in_progress":
        return {
          label: t("schedule:status.inProgress"),
          className: "bg-primary hover:bg-primary",
          icon: Clock,
        };
      case "not_started":
        return {
          label: t("schedule:status.notStarted"),
          className: "bg-muted hover:bg-muted text-muted-foreground",
          icon: Circle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <Badge className={config.className}>
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  );
}
