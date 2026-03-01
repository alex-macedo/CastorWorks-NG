import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  const { t } = useLocalization();

  return (
    <div className="flex gap-1">
      <DateInput
        value={from}
        onChange={onFromChange}
        placeholder={t('financial.ledger.columnFilters.from')}
        className="h-7 text-xs w-[110px]"
        max={to || undefined}
      />
      <DateInput
        value={to}
        onChange={onToChange}
        placeholder={t('financial.ledger.columnFilters.to')}
        className="h-7 text-xs w-[110px]"
        min={from || undefined}
      />
      {(from || to) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface TextFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextFilter({ value, onChange, placeholder }: TextFilterProps) {
  const { t } = useLocalization();
  const defaultPlaceholder = placeholder || t('financial.ledger.columnFilters.filter');
  
  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultPlaceholder}
        className="h-7 text-xs pr-6"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-7 px-2"
          onClick={() => onChange('')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectFilter({ value, onChange, options, placeholder }: SelectFilterProps) {
  const { t } = useLocalization();
  const defaultPlaceholder = placeholder || t('financial.ledger.columnFilters.all');
  
  return (
    <div className="flex gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs w-full">
          <SelectValue placeholder={defaultPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{defaultPlaceholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== 'all' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => onChange('all')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface NumberRangeFilterProps {
  min: number | null;
  max: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
}

export function NumberRangeFilter({ min, max, onMinChange, onMaxChange }: NumberRangeFilterProps) {
  const { t } = useLocalization();
  
  return (
    <div className="flex gap-1">
      <Input
        type="number"
        value={min ?? ''}
        onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={t('financial.ledger.columnFilters.min')}
        className="h-7 text-xs w-[70px]"
      />
      <Input
        type="number"
        value={max ?? ''}
        onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={t('financial.ledger.columnFilters.max')}
        className="h-7 text-xs w-[70px]"
      />
      {(min !== null || max !== null) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            onMinChange(null);
            onMaxChange(null);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
