import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

export type IssueFilterType = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
export type IssueSeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

interface IssueFiltersProps {
  activeStatusFilter: IssueFilterType;
  activeSeverityFilter: IssueSeverityFilter;
  onStatusFilterChange: (filter: IssueFilterType) => void;
  onSeverityFilterChange: (filter: IssueSeverityFilter) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
}


export function IssueFilters({
  activeStatusFilter,
  activeSeverityFilter,
  onStatusFilterChange,
  onSeverityFilterChange,
  totalCount,
  filteredCount,
  className,
}: IssueFiltersProps) {
  const { t } = useLocalization();
  const hasActiveFilters = activeStatusFilter !== 'all' || activeSeverityFilter !== 'all';

  const statusFilters: { value: IssueFilterType; label: string; color?: string }[] = [
    { value: 'all', label: t('supervisor.all') },
    { value: 'open', label: t('supervisor.open'), color: 'bg-orange-100 text-orange-700' },
    { value: 'in_progress', label: t('supervisor.inprogress'), color: 'bg-yellow-100 text-yellow-700' },
    { value: 'resolved', label: t('supervisor.resolved'), color: 'bg-green-100 text-green-700' },
    { value: 'closed', label: t('supervisor.closed'), color: 'bg-gray-100 text-gray-700' },
  ];

  const severityFilters: { value: IssueSeverityFilter; label: string; color?: string }[] = [
    { value: 'all', label: t('supervisor.allSeverities') },
    { value: 'low', label: t('supervisor.low'), color: 'bg-blue-100 text-blue-700' },
    { value: 'medium', label: t('supervisor.medium'), color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: t('supervisor.high'), color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: t('supervisor.critical'), color: 'bg-red-100 text-red-700' },
  ];

  const clearAllFilters = () => {
    onStatusFilterChange('all');
    onSeverityFilterChange('all');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {filteredCount} {filteredCount === 1 ? t('supervisor.issue') : t('supervisor.issues')}
            {hasActiveFilters && ` ${t('supervisor.of')} ${totalCount}`}
          </span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            {t('supervisor.clearFilters')}
          </Button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Badge
            key={filter.value}
            variant={activeStatusFilter === filter.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeStatusFilter === filter.value && filter.color,
              !filter.color && activeStatusFilter === filter.value && "bg-primary text-primary-foreground"
            )}
            onClick={() => onStatusFilterChange(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      {/* Severity Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {severityFilters.map((filter) => (
          <Badge
            key={filter.value}
            variant={activeSeverityFilter === filter.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105 text-xs",
              activeSeverityFilter === filter.value && filter.color,
              !filter.color && activeSeverityFilter === filter.value && "bg-primary text-primary-foreground"
            )}
            onClick={() => onSeverityFilterChange(filter.value)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
