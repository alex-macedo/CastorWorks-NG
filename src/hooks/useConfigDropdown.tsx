import { useConfig, type ConfigValue } from '@/contexts/ConfigContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConfigDropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const useConfigDropdown = (categoryKey: string) => {
  const { getConfigValues, getConfigLabel } = useConfig();
  const { t } = useLocalization();

  // Static fallbacks to keep critical dropdowns usable if config lookup returns empty
  const fallbackValues: Record<string, ConfigValue[]> = {
    project_types: [
      { id: 'residential', key: 'residential', label: t('projects:fallbackTypes.residential') || 'Residential', sortOrder: 1 },
      { id: 'commercial', key: 'commercial', label: t('projects:fallbackTypes.commercial') || 'Commercial', sortOrder: 2 },
      { id: 'renovation', key: 'renovation', label: t('projects:fallbackTypes.renovation') || 'Renovation', sortOrder: 3 },
      { id: 'infrastructure', key: 'infrastructure', label: t('projects:fallbackTypes.infrastructure') || 'Infrastructure', sortOrder: 4 },
    ],
    project_status: [
      { id: 'planning', key: 'planning', label: t('projects:fallbackStatus.planning') || 'Planning', sortOrder: 1 },
      { id: 'in_progress', key: 'in_progress', label: t('projects:fallbackStatus.inProgress') || 'In Progress', sortOrder: 2 },
      { id: 'paused', key: 'paused', label: t('projects:fallbackStatus.paused') || 'Paused', sortOrder: 3 },
      { id: 'completed', key: 'completed', label: t('projects:fallbackStatus.completed') || 'Completed', sortOrder: 4 },
      { id: 'active', key: 'active', label: t('projects:fallbackStatus.active') || 'Active', sortOrder: 5 },
      { id: 'delayed', key: 'delayed', label: t('projects:fallbackStatus.delayed') || 'Delayed', sortOrder: 6 },
      { id: 'on_track', key: 'on_track', label: t('projects:fallbackStatus.onTrack') || 'On Track', sortOrder: 7 },
      { id: 'at_risk', key: 'at_risk', label: t('projects:fallbackStatus.atRisk') || 'At Risk', sortOrder: 8 },
      { id: 'on_hold', key: 'on_hold', label: t('projects:fallbackStatus.onHold') || 'On Hold', sortOrder: 9 },
    ],
  };

  const valuesFromConfig = getConfigValues(categoryKey);
  const values = valuesFromConfig.length > 0 ? valuesFromConfig : (fallbackValues[categoryKey] || []);

  const renderSelect = (props: ConfigDropdownProps) => {
    const { value, onValueChange, placeholder, disabled, className } = props;

    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {values.map((v) => (
            <SelectItem key={v.key} value={v.key}>
              <div className="flex items-center gap-2">
                {v.icon && <span>{v.icon}</span>}
                <span>{v.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return {
    values,
    getLabel: (valueKey: string) => getConfigLabel(categoryKey, valueKey),
    renderSelect,
  };
};
