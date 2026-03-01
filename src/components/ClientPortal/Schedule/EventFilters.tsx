import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventType } from '@/types/clientPortal';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/contexts/LocalizationContext';

interface EventFiltersProps {
  activeFilters: EventType[];
  onToggleFilter: (type: EventType) => void;
}

const filterOptions: { type: EventType; label: string; color: string }[] = [
  { type: 'milestone', label: 'Milestones', color: 'bg-blue-500 hover:bg-blue-600' },
  { type: 'meeting', label: 'Meetings', color: 'bg-green-500 hover:bg-green-600' },
  { type: 'inspection', label: 'Inspections', color: 'bg-blue-500 hover:bg-blue-600' },
  { type: 'deadline', label: 'Deadlines', color: 'bg-yellow-500 hover:bg-yellow-600' },
];

export function EventFilters({ activeFilters, onToggleFilter }: EventFiltersProps) {
  const { t } = useLocalization();

  const isActive = (type: EventType) => {
    return activeFilters.length === 0 || activeFilters.includes(type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("commonUI.filters") }</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ type, label, color }) => (
            <Badge
              key={type}
              variant={isActive(type) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all',
                isActive(type) ? `${color} text-white` : 'hover:bg-primary/10'
              )}
              onClick={() => onToggleFilter(type)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
