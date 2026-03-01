import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from "@/hooks/clientPortal/useClientPortalAuth";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useDateFormat } from '@/hooks/useDateFormat';
import { Loader2, Calendar } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface UpcomingScheduleCardProps {
  clientId?: string | null;
}

export function UpcomingScheduleCard({ clientId }: UpcomingScheduleCardProps) {
  const { t } = useLocalization();
  const { projectId } = useClientPortalAuth();
  const { activities, isLoading } = useProjectActivities(projectId || undefined);
  const { formatShortDate } = useDateFormat();

  const nextThreeActivities = useMemo(() => {
    if (!activities) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activities
      .filter(a => {
        if (!a.start_date) return false;
        const startDate = new Date(a.start_date);
        // show non-completed, future or ongoing tasks
        return a.completion_percentage < 100 && (startDate >= today || (a.end_date && new Date(a.end_date) >= today));
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_date || 0).getTime();
        const dateB = new Date(b.start_date || 0).getTime();
        return dateA - dateB;
      })
      .slice(0, 3);
  }, [activities]);

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.upcomingSchedule.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projectId ? (
           <div className="space-y-4">
             {nextThreeActivities.length > 0 ? (
               nextThreeActivities.map(activity => (
                 <div key={activity.id} className="border-b last:border-0 pb-3 last:pb-0">
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{activity.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {activity.start_date ? formatShortDate(activity.start_date) : ''}
                      </span>
                   </div>
                   {/* User specifically asked for descriptions */}
                   {activity.description && (
                     <p className="text-xs text-muted-foreground line-clamp-2">
                       {activity.description}
                     </p>
                   )}
                 </div>
               ))
             ) : (
               <div className="text-sm text-muted-foreground">
                 {t("clientPortal.dashboard.upcomingSchedule.noMilestones")}
               </div>
             )}
           </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
             {t("clientPortal.dashboard.upcomingSchedule.noProject")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
