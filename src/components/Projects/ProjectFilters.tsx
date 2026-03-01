import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useConfigDropdown } from "@/hooks/useConfigDropdown";
import { MultiSelect } from "@/components/ui/multi-select";

interface ProjectFiltersProps {
  onFilterChange: (filters: ProjectFilters) => void;
}

export interface ProjectFilters {
  status?: string[];
  type?: string[];
  client?: string[]; // Added client filter
  minBudget?: number;
  maxBudget?: number;
  startDateFrom?: string;
  startDateTo?: string;
}

export const ProjectFilters = ({ onFilterChange }: ProjectFiltersProps) => {
  const { t } = useLocalization();
  const statusHook = useConfigDropdown('project_status');
  const typeHook = useConfigDropdown('project_type');
  const clientHook = useConfigDropdown('client_type'); // Using client_type for demonstration or if exists
  
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterUpdate = (key: keyof ProjectFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    // Remove empty arrays
    if (Array.isArray(value) && value.length === 0) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    handleFilterUpdate(field, numValue);
  };

  const handleDateChange = (field: 'startDateFrom' | 'startDateTo', value: string) => {
    handleFilterUpdate(field, value || undefined);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== undefined
  );

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.type?.length || 0,
    filters.minBudget ? 1 : 0,
    filters.maxBudget ? 1 : 0,
    filters.startDateFrom ? 1 : 0,
    filters.startDateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          {t('common.filter')}
          {activeFilterCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{t('common.filters')}</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                {t('projects:clearFilters')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('projects:filterByStatus')}</Label>
            <MultiSelect
              options={statusHook.values.map(s => ({ id: s.key, name: s.label }))}
              selected={filters.status || []}
              onChange={(selected) => handleFilterUpdate('status', selected)}
              placeholder={t('projects:allStatuses')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('projects:filterByType')}</Label>
            <MultiSelect
              options={typeHook.values.map(t => ({ id: t.key, name: t.label }))}
              selected={filters.type || []}
              onChange={(selected) => handleFilterUpdate('type', selected)}
              placeholder={t('projects:allTypes')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('projects:budgetRange')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder={t('projects:minBudget')}
                  value={filters.minBudget || ''}
                  onChange={(e) => handleBudgetChange('minBudget', e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder={t('projects:maxBudget')}
                  value={filters.maxBudget || ''}
                  onChange={(e) => handleBudgetChange('maxBudget', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DateRangeFilter
            startDate={filters.startDateFrom || ''}
            endDate={filters.startDateTo || ''}
            onStartDateChange={(value) => handleDateChange('startDateFrom', value)}
            onEndDateChange={(value) => handleDateChange('startDateTo', value)}
            startLabel={t('common.dateRange')}
            endLabel={t('common.to')}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
