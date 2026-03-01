import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLocalization } from '@/contexts/LocalizationContext';
import { ALL_ROLES, ROLE_LABEL_KEYS } from '@/constants/rolePermissions';

type VisibilitySelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export const VisibilitySelector = ({ value, onChange, disabled }: VisibilitySelectorProps) => {
  const { t } = useLocalization();

  const toggleRole = (role: string) => {
    if (disabled) return;

    if (value.includes(role)) {
      onChange(value.filter((item) => item !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ALL_ROLES.map((role) => (
        <div key={role} className="flex items-center gap-2">
          <Checkbox
            id={`content-visibility-${role}`}
            checked={value.includes(role)}
            onCheckedChange={() => toggleRole(role)}
            disabled={disabled}
          />
          <Label htmlFor={`content-visibility-${role}`} className="text-sm font-medium">
            {t(ROLE_LABEL_KEYS[role])}
          </Label>
        </div>
      ))}
    </div>
  );
};
