import React from 'react';
import { format } from 'date-fns';
import { DateInput } from '@/components/ui/DateInput';
import { useLocalization } from '@/contexts/LocalizationContext';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel,
  endLabel,
  disabled = false,
  className,
}) => {
  const { t } = useLocalization();

  // Convert Date objects to yyyy-MM-dd format for min/max constraints
  const formatDateForConstraint = (date: string | Date | null | undefined): string | undefined => {
    if (date instanceof Date) {
      return format(date, 'yyyy-MM-dd');
    }
    return typeof date === 'string' ? date : undefined;
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {startLabel || t('common.startDate')}
          </label>
           <DateInput
             value={startDate}
             onChange={onStartDateChange}
             placeholder={t('common.selectDate')}
             disabled={disabled}
             max={formatDateForConstraint(endDate)}
           />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {endLabel || t('common.endDate')}
          </label>
           <DateInput
             value={endDate}
             onChange={onEndDateChange}
             placeholder={t('common.selectDate')}
             disabled={disabled}
             min={formatDateForConstraint(startDate)}
           />
        </div>
      </div>
    </div>
  );
};
