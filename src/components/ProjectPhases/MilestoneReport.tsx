import { useState } from "react";
import { Flag, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Milestone } from "@/hooks/useMilestones";
import { differenceInDays } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";

interface MilestoneReportProps {
  milestones: Milestone[];
  onSendNotifications: () => void;
  canEdit: boolean;
}

interface MilestoneSummaryCardsProps {
  milestones: Milestone[];
}

function useMilestoneMetrics(milestones: Milestone[]) {
  const today = new Date();

  const parseDueDate = (dueDate: string) => {
    const parsed = new Date(dueDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  
  const pending = milestones.filter(m => m.status === 'pending');
  const achieved = milestones.filter(m => m.status === 'achieved');
  const pendingByDate = pending.sort((a, b) => {
    const dateA = parseDueDate(a.due_date);
    const dateB = parseDueDate(b.due_date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  const completionRate = milestones.length > 0 
    ? Math.round((achieved.length / milestones.length) * 100)
    : 0;

  return {
    today,
    parseDueDate,
    pending,
    achieved,
    pendingByDate,
    completionRate,
  };
}

export function MilestoneSummaryCards({ milestones }: MilestoneSummaryCardsProps) {
  const { t } = useLocalization();
  const { achieved, pending, completionRate } = useMilestoneMetrics(milestones);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {t("projectPhases.milestoneReport.totalMilestones")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="text-xl font-bold leading-none">{milestones.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {t("projectPhases.milestoneReport.achievedCount")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="text-xl font-bold leading-none text-green-600">{achieved.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {t("projectPhases.milestoneReport.pendingCount")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="text-xl font-bold leading-none text-blue-600">{pending.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {t("projectPhases.milestoneReport.completionRate")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="text-xl font-bold leading-none">{completionRate}%</div>
          <Progress value={completionRate} className="mt-2 h-2" />
        </CardContent>
      </Card>
    </div>
  );
}

export function MilestoneReport({ milestones, onSendNotifications, canEdit }: MilestoneReportProps) {
  const { t } = useLocalization();
  const { today, parseDueDate, pendingByDate } = useMilestoneMetrics(milestones);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

  const getStatusBadge = (milestone: Milestone) => {
    const dueDate = parseDueDate(milestone.due_date);
    const daysUntil = dueDate ? differenceInDays(dueDate, today) : null;

    if (milestone.status === 'achieved') {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />{t("projectPhases.milestoneReport.achieved")}</Badge>;
    }
    
    if (daysUntil !== null && daysUntil < 0) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t("projectPhases.milestoneReport.overdue")}</Badge>;
    }
    
    if (daysUntil !== null && daysUntil <= 7) {
      return <Badge variant="secondary" className="bg-orange-500 text-white"><Clock className="h-3 w-3 mr-1" />{t("projectPhases.milestoneReport.dueSoon")}</Badge>;
    }
    
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t("projectPhases.milestoneReport.pending")}</Badge>;
  };

  const getDaysText = (dueDate: string) => {
    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) return '--';
    const days = differenceInDays(parsedDueDate, today);
    if (days < 0) return t("projectPhases.milestoneReport.daysOverdue").replace("{{count}}", Math.abs(days).toString());
    if (days === 0) return t("projectPhases.milestoneReport.dueToday");
    if (days === 1) return t("projectPhases.milestoneReport.dueTomorrow");
    return t("projectPhases.milestoneReport.daysRemaining").replace("{{count}}", days.toString());
  };

  const buckets = [
    {
      key: '30',
      title: t("projectPhases.milestoneReport.next30Days"),
      min: 0,
      max: 30,
    },
    {
      key: '60',
      title: t("projectPhases.milestoneReport.next60Days"),
      min: 31,
      max: 60,
    },
    {
      key: '90',
      title: t("projectPhases.milestoneReport.next90Days"),
      min: 61,
      max: 90,
    },
    {
      key: '120',
      title: t("projectPhases.milestoneReport.next120Days"),
      min: 91,
      max: 120,
    },
  ];

  const getBucketItems = (min: number, max: number) =>
    pendingByDate.filter((milestone) => {
      const dueDate = parseDueDate(milestone.due_date);
      if (!dueDate) return false;
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= min && daysUntil <= max;
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("projectPhases.milestoneReport.upcomingMilestones")}</CardTitle>
              <CardDescription>{t("projectPhases.milestoneReport.next120Days")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpcomingExpanded((previous) => !previous)}
              >
                {isUpcomingExpanded ? t("projectPhases.collapsePhases") : t("projectPhases.expandPhases")}
              </Button>
              {canEdit && isUpcomingExpanded && (
                <Button onClick={onSendNotifications} variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  {t("projectPhases.milestoneReport.sendNotifications")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {isUpcomingExpanded && (
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {buckets.map((bucket) => {
                const items = getBucketItems(bucket.min, bucket.max);

                return (
                  <div key={bucket.key} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{bucket.title}</h4>
                      <Badge variant="outline">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("projectPhases.milestoneReport.noMilestones")}
                        </p>
                      ) : (
                        items.map((milestone) => (
                          <div key={milestone.id} className="rounded-md border p-2">
                            <div className="flex items-center gap-2">
                              <Flag className="h-4 w-4 text-primary" />
                              <p className="truncate text-sm font-medium">{milestone.name}</p>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(milestone.due_date)}</span>
                              <span>{getDaysText(milestone.due_date)}</span>
                            </div>
                            <div className="mt-1">{getStatusBadge(milestone)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

    </div>
  );
}
