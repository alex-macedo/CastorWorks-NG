import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  Package,
  Truck,
  QrCode,
} from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { cn } from "@/lib/utils";

export function QuickActionGrid() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { vibrate } = useHapticFeedback();
  const { selectedProject } = useSupervisorProject();

  const handleActionClick = (path: string) => {
    vibrate("medium");
    navigate(path);
  };

  const actions = [
    {
      title: t("supervisor.logActivity"),
      description: t("supervisor.logActivityDesc"),
      icon: ClipboardList,
      path: "/supervisor/activity-log",
      color: "bg-primary/10 text-accent-foreground border-border",
    },
    {
      title: t("supervisor.logTime"),
      description: t("supervisor.logTimeDesc"),
      icon: Clock,
      path: "/supervisor/time-logs",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      title: t("supervisor.logistics.inventory") || "Inventory",
      description: t("supervisor.logistics.checkStockLevels") || "Check stock levels",
      icon: Package,
      path: "/supervisor/logistics/inventory",
      color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    {
      title: t("supervisor.logistics.qrScanner") || "QR Scanner",
      description: t("supervisor.logistics.scanToUpdateStock") || "Scan materials",
      icon: QrCode,
      path: "/supervisor/logistics/scanner",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={() => handleActionClick(action.path)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2",
              "min-h-[100px] active:scale-95 transition-transform",
              action.color
            )}
          >
            <Icon className="h-8 w-8 mb-2" strokeWidth={2} />
            <div className="text-center">
              <div className="font-semibold text-xs mb-0.5">{action.title}</div>
              <div className="text-[10px] opacity-70 line-clamp-2 leading-tight">
                {action.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
