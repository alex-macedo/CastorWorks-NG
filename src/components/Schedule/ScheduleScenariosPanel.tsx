import { useState } from "react";
import { Clock, PlayCircle, Trash2, Star, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useScheduleScenarios } from "@/hooks/useScheduleScenarios";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDistanceToNow } from "date-fns";

interface ScheduleScenariosPanelProps {
  projectId?: string;
}

export function ScheduleScenariosPanel({ projectId }: ScheduleScenariosPanelProps) {
  const { t } = useLocalization();
  const { scenarios, isLoading, activateScenario, deleteScenario, markAsBaseline } =
    useScheduleScenarios(projectId);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("schedule:scenarios.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("schedule:scenarios.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("schedule:scenarios.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("schedule:scenarios.title")}
            <Badge variant="secondary" className="ml-auto">
              {scenarios.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{scenario.scenario_name}</span>
                  {scenario.is_active && (
                    <Badge variant="default" className="shrink-0">
                      {t("schedule:scenarios.active")}
                    </Badge>
                  )}
                  {scenario.is_baseline && (
                    <Badge variant="outline" className="shrink-0">
                      <Star className="h-3 w-3 mr-1" />
                      {t("schedule:scenarios.baseline")}
                    </Badge>
                  )}
                </div>
                {scenario.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {scenario.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {t("schedule:scenarios.created")}{" "}
                  {formatDistanceToNow(new Date(scenario.created_at!), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => activateScenario.mutate(scenario.id)}
                  disabled={scenario.is_active || activateScenario.isPending}
                  title={t("schedule:scenarios.activate")}
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => markAsBaseline.mutate(scenario.id)}
                      disabled={scenario.is_baseline}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {t("schedule:scenarios.markBaseline")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmId(scenario.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("schedule:scenarios.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("schedule:scenarios.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("schedule:scenarios.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteScenario.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
