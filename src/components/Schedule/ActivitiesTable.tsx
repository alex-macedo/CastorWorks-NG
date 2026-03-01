import { useState } from "react";
import { Pencil, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { getActivityStatus } from "@/utils/timelineCalculators";
import { Database } from "@/integrations/supabase/types";

type ProjectActivity = Database["public"]["Tables"]["project_activities"]["Row"];

interface ActivitiesTableProps {
  activities: ProjectActivity[];
  onEdit: (activity: ProjectActivity) => void;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

export function ActivitiesTable({
  activities,
  onEdit,
  onDelete,
  onMarkComplete,
}: ActivitiesTableProps) {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const [sortField, setSortField] = useState<"sequence" | "start_date">("sequence");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedActivities = [...activities].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    
    if (sortField === "sequence") {
      return (a.sequence - b.sequence) * multiplier;
    }
    
    if (sortField === "start_date") {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return (dateA - dateB) * multiplier;
    }
    
    return 0;
  });

  const handleSort = (field: "sequence" | "start_date") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("schedule:activities.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("sequence")}
                >
                  {t("schedule:activities.sequence")}
                  {sortField === "sequence" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableHead>
                <TableHead>{t("schedule:activities.activityName")}</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("start_date")}
                >
                  {t("schedule:activities.startDate")}
                  {sortField === "start_date" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </TableHead>
                <TableHead>{t("schedule:activities.endDate")}</TableHead>
                <TableHead>{t("schedule:activities.duration")}</TableHead>
                <TableHead>{t("schedule:activities.progress")}</TableHead>
                <TableHead>{t("schedule:activities.completionDate")}</TableHead>
                <TableHead>{t("schedule:activities.status")}</TableHead>
                <TableHead className="text-right">{t("schedule:activities.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t("schedule:activities.noActivities")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedActivities.map((activity) => {
                  const status = getActivityStatus({
                    sequence: activity.sequence,
                    name: activity.name,
                    start_date: activity.start_date,
                    end_date: activity.end_date,
                    completion_date: activity.completion_date,
                    completion_percentage: activity.completion_percentage,
                    days_for_activity: activity.days_for_activity,
                  });

                  return (
                    <TableRow key={activity.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{activity.sequence}</TableCell>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>
                        {activity.start_date
                          ? formatDate(activity.start_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {activity.end_date
                          ? formatDate(activity.end_date)
                          : "-"}
                      </TableCell>
                      <TableCell>{activity.days_for_activity} days</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.completion_percentage}%</span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${activity.completion_percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.completion_date
                          ? formatDate(activity.completion_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <ActivityStatusBadge status={status} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activity.completion_percentage < 100 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onMarkComplete(activity.id)}
                              title={t("schedule:actions.markComplete")}
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(activity)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(activity.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
