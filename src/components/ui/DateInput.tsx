import React from 'react';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value: string | Date | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string; // yyyy-MM-dd format
  max?: string; // yyyy-MM-dd format
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  min,
  max,
}) => {
  // Convert value to display format for the CalendarDatePicker placeholder
  const getDisplayPlaceholder = () => {
    return placeholder;
  };

  // Handle date change from CalendarDatePicker (always yyyy-MM-dd format)
  const handleDateChange = (dateString: string) => {
    if (!dateString) {
      onChange('');
      return;
    }

    onChange(dateString);
  };

  return (
    <CalendarDatePicker
      value={value}
      onChange={handleDateChange}
      placeholder={getDisplayPlaceholder()}
      disabled={disabled}
      className={cn("w-full", className)}
      min={min}
      max={max}
    />
  );
};
