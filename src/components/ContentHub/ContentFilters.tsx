import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ContentHubFilters, ContentStatus, ContentType } from '@/types/contentHub';
import { CONTENT_STATUSES, CONTENT_TYPES } from './contentHubOptions';

const ALL_OPTION = 'all';

type ContentFiltersProps = {
  filters: ContentHubFilters;
  onChange: (filters: ContentHubFilters) => void;
};

export const ContentFilters = ({ filters, onChange }: ContentFiltersProps) => {
  const { t } = useLocalization();

  const handleTypeChange = (value: string) => {
    onChange({ ...filters, type: value === ALL_OPTION ? undefined : (value as ContentType) });
  };

  const handleStatusChange = (value: string) => {
    onChange({ ...filters, status: value === ALL_OPTION ? undefined : (value as ContentStatus) });
  };

  const handleSearchChange = (value: string) => {
    onChange({ ...filters, search: value });
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <Input
          value={filters.search ?? ''}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder={t('contentHub.filters.search')}
        />
      </div>
      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
        <Select value={filters.type ?? ALL_OPTION} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder={t('contentHub.filters.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION}>{t('contentHub.filters.allTypes')}</SelectItem>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`contentHub.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status ?? ALL_OPTION} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('contentHub.filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION}>{t('contentHub.filters.allStatuses')}</SelectItem>
            {CONTENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`contentHub.status.${status === 'pending_approval' ? 'pending' : status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleReset}>
          {t('contentHub.filters.reset')}
        </Button>
      </div>
    </div>
  );
};
