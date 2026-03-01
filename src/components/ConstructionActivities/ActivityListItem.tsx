import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Activity {
  sequence: number;
  name: string;
  defaultDays: number;
}

interface ActivityListItemProps {
  activity: Activity;
  onUpdate: (sequence: number, updates: Partial<Activity>) => void;
  onRemove: (sequence: number) => void;
  readOnly?: boolean;
}

export function ActivityListItem({
  activity,
  onUpdate,
  onRemove,
  readOnly = false,
}: ActivityListItemProps) {
  const { t } = useLocalization();
  
  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
      <div className="w-12 text-center text-sm font-medium text-muted-foreground">
        #{activity.sequence}
      </div>
      
      <Input
        value={activity.name}
        onChange={(e) => onUpdate(activity.sequence, { name: e.target.value })}
        placeholder={t('constructionActivities.activityNamePlaceholder')}
        disabled={readOnly}
        className="flex-1"
      />
      
      <div className="flex items-center gap-2 w-32">
        <Input
          type="number"
          value={activity.defaultDays}
          onChange={(e) => onUpdate(activity.sequence, { defaultDays: parseInt(e.target.value) || 1 })}
          disabled={readOnly}
          min={1}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">{t('constructionActivities.days')}</span>
      </div>
      
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(activity.sequence)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}