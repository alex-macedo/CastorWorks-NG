import { UseFormReturn } from 'react-hook-form';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getStatesByLanguage } from '@/constants/statesByLanguage';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ClientCombobox } from "@/components/Clients/ClientCombobox";
import { Loader2, Search, MapPin } from 'lucide-react';
import { ProjectFormData } from '@/schemas/project';

interface ClientInfoFieldsProps {
  form: UseFormReturn<ProjectFormData>;
  selectedLanguage: string;
  isLookingUpAddress: boolean;
  runCepLookup: (zip: string) => void;
}

const formatZipCode = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
};

const unformatZipCode = (value: string) => value.replace(/\D/g, '').slice(0, 8);

export const ClientInfoFields = ({
  form,
  selectedLanguage,
  isLookingUpAddress,
  runCepLookup
}: ClientInfoFieldsProps) => {
  const { t } = useLocalization();

  return (
    <div className="space-y-4">
      {/* Project Name and Client - 2 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="inline-flex items-center">
                {t('projects:projectNameLabel')}
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('projects:projectNamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="inline-flex items-center">
                {t('projects:clientLabel')}
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <ClientCombobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder={t('projects:clientPlaceholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="rounded-lg border bg-muted/30 p-2 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{t('projects:projectAddress')}</span>
        </div>

        {/* Address fields in specific grid layout from edit form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="zip_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:zipCodeLabel')}</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('projects:zipCodePlaceholder')}
                        value={field.value ? formatZipCode(String(field.value)) : ''}
                        onChange={(e) => field.onChange(unformatZipCode(e.target.value))}
                        className="flex-1"
                        inputMode="numeric"
                        maxLength={9}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 flex gap-2"
                        onClick={() => runCepLookup(unformatZipCode(field.value || ''))}
                        disabled={isLookingUpAddress || !field.value || unformatZipCode(field.value).length < 8}
                      >
                        {isLookingUpAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">{t('projects:lookupAddress')}</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-5">
            <FormField
              control={form.control}
              name="construction_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center">
                    {t('projects:constructionAddressLabel')}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects:constructionAddressPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="street_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:streetNumberLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects:streetNumberPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="address_complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:addressComplementLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects:addressComplementPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:neighborhoodLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects:neighborhoodPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center">
                    {t('projects:cityLabel')}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('projects:cityLabel')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-4">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center">
                    {t('projects:stateLabel')}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('projects:selectState')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getStatesByLanguage(selectedLanguage).map((state) => (
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
      </div>
    </div>
  );
};
