import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { useLocalization } from "@/contexts/LocalizationContext";

interface FilterConfig {
  status: string[];
  progressMin: number | null;
  progressMax: number | null;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
}

interface ProjectPlanFiltersProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
}

export function ProjectPlanFilters({ filters, onFiltersChange }: ProjectPlanFiltersProps) {
  const { t } = useLocalization();
  const [localFilters, setLocalFilters] = useState<FilterConfig>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: 'not_started', label: t('projectPhases.filters.notStarted') },
    { value: 'in_progress', label: t('projectPhases.filters.inProgress') },
    { value: 'completed', label: t('projectPhases.filters.completed') },
    { value: 'delayed', label: t('projectPhases.filters.delayed') },
  ];

  const handleStatusToggle = (status: string) => {
    const newStatus = localFilters.status.includes(status)
      ? localFilters.status.filter(s => s !== status)
      : [...localFilters.status, status];
    setLocalFilters({ ...localFilters, status: newStatus });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterConfig = {
      status: [],
      progressMin: null,
      progressMax: null,
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: '',
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFilterCount = 
    filters.status.length +
    (filters.progressMin !== null ? 1 : 0) +
    (filters.progressMax !== null ? 1 : 0) +
    (filters.startDateFrom ? 1 : 0) +
    (filters.startDateTo ? 1 : 0) +
    (filters.endDateFrom ? 1 : 0) +
    (filters.endDateTo ? 1 : 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          {t('projectPhases.filters.filter')}
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{t('projectPhases.filters.filterOptions')}</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                {t('projectPhases.filters.clearAll')}
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>{t('projectPhases.filters.status')}</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <Badge
                  key={option.value}
                  variant={localFilters.status.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleStatusToggle(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Progress Range */}
          <div className="space-y-2">
            <Label>{t('projectPhases.filters.progressRange')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('projectPhases.filters.min')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={localFilters.progressMin ?? ''}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    progressMin: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('projectPhases.filters.max')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={localFilters.progressMax ?? ''}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    progressMax: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Start Date Range */}
          <DateRangeFilter
            startDate={localFilters.startDateFrom}
            endDate={localFilters.startDateTo}
            onStartDateChange={(value) => setLocalFilters({ ...localFilters, startDateFrom: value })}
            onEndDateChange={(value) => setLocalFilters({ ...localFilters, startDateTo: value })}
            startLabel={t('projectPhases.filters.startDateRange')}
            endLabel={t('projectPhases.filters.to')}
          />

          {/* End Date Range */}
          <DateRangeFilter
            startDate={localFilters.endDateFrom}
            endDate={localFilters.endDateTo}
            onStartDateChange={(value) => setLocalFilters({ ...localFilters, endDateFrom: value })}
            onEndDateChange={(value) => setLocalFilters({ ...localFilters, endDateTo: value })}
            startLabel={t('projectPhases.filters.endDateRange')}
            endLabel={t('projectPhases.filters.to')}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              {t('projectPhases.filters.cancel')}
            </Button>
            <Button size="sm" onClick={handleApplyFilters}>
              {t('projectPhases.filters.apply')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
