import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";
import { formatCPF } from "@/utils/formatters";
import { ClientCombobox } from "@/components/Clients/ClientCombobox";

interface ClientInfoStepProps {
  control: Control<any>;
}

export const ClientInfoStep = ({ control }: ClientInfoStepProps) => {
  const { t } = useLocalization();

  return (
    <div className="space-y-4">
      {/* Row 1: Project Name, Client, Client CPF on same line */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:projectNameLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('projects:projectNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:clientNameLabel')}</FormLabel>
              <FormControl>
                <ClientCombobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder={t('projects:clientLabel')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="client_cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:clientCPFLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('projects:clientCPFPlaceholder')}
                  value={field.value ? formatCPF(field.value) : ''}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                  maxLength={14}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Budget Date */}
      <FormField
        control={control}
        name="budget_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{t('projects:budgetDateLabel')}</FormLabel>
            <FormControl>
              <DateInput
                value={field.value || ''}
                onChange={field.onChange}
                placeholder={t('common.selectDate')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="zip_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:zipCodeLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('projects:zipCodePlaceholder')}
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(e.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  maxLength={9}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Street Name and Number on same line */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="construction_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:constructionAddressLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('projects:constructionAddressPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row: Neighborhood, City, and State on same line */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={control}
          name="neighborhood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:neighborhoodLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('projects:neighborhoodPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:cityLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('projects:cityLabel')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:stateLabel')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectState')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
