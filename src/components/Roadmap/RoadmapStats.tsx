import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface RoadmapStatsProps {
  tasks: any[];
}

export function RoadmapStats({ tasks }: RoadmapStatsProps) {
  const { t } = useLocalization();
  const notStarted = tasks.filter(t => t.status === 'not_started').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { labelKey: "roadmap.metrics.totalTasks", value: total, icon: Circle, color: "text-gray-500" },
    { labelKey: "roadmap.taskStatus.notStarted", value: notStarted, icon: Circle, color: "text-gray-500" },
    { labelKey: "roadmap.taskStatus.inProgress", value: inProgress, icon: Clock, color: "text-blue-500" },
    { labelKey: "roadmap.taskStatus.completed", value: completed, icon: CheckCircle2, color: "text-green-500" },
    { labelKey: "roadmap.taskStatus.blocked", value: blocked, icon: AlertCircle, color: "text-red-500" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.labelKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                {t(stat.labelKey)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.labelKey === "roadmap.taskStatus.completed" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {completionRate}% {t("common.completed")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
