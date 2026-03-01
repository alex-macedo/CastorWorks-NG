import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { useContactTypes } from '@/hooks/useContactTypes';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Contact, ContactFormData } from '@/types/contacts';

const createContactFormSchema = (t: (key: string) => string) =>
  z.object({
    full_name: z.string().min(1, t('contacts.validation.fullNameRequired')),
    email: z.string().email(t('contacts.validation.invalidEmail')).optional().or(z.literal('')),
    phone_number: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    zip_code: z.string().optional().or(z.literal('')),
    role: z.string().optional().or(z.literal('')),
    company: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  });

interface ContactFormSheetProps {
  contact?: Contact | null;
  onSuccess?: () => void;
}

export const ContactFormSheet = ({ contact, onSuccess }: ContactFormSheetProps) => {
  const { t } = useLocalization();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { contactTypes, isLoading: contactTypesLoading } = useContactTypes();
  const contactFormSchema = createContactFormSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact || {
      full_name: '',
      email: '',
      phone_number: '',
      address: '',
      city: '',
      zip_code: '',
      role: '',
      company: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (contact) {
      reset({
        full_name: contact.full_name,
        email: contact.email || '',
        phone_number: contact.phone_number || '',
        address: contact.address || '',
        city: contact.city || '',
        zip_code: contact.zip_code || '',
        role: contact.role || '',
        company: contact.company || '',
        notes: contact.notes || '',
      });
    }
  }, [contact, reset]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      if (contact) {
        await updateContact.mutateAsync({
          id: contact.id,
          updates: data,
        });
      } else {
        await createContact.mutateAsync(data);
      }
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const isLoading = createContact.isPending || updateContact.isPending;

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {contact ? t('contacts.editContact') : t('contacts.addContact')}
        </SheetTitle>
        <SheetDescription>
          {contact
            ? t('contacts.updateDescription')
            : t('contacts.addDescription')}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">{t('contacts.fullName')} *</Label>
          <Input
            id="full_name"
            placeholder={t("additionalPlaceholders.johnDoe")}
            {...register('full_name')}
            disabled={isLoading}
          />
          {errors.full_name && (
            <p className="text-sm text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('contacts.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("additionalPlaceholders.exampleEmail")}
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">{t('contacts.phone')}</Label>
          <Input
            id="phone_number"
            placeholder={t('contacts.placeholderPhone')}
            {...register('phone_number')}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">{t('contacts.contactType')}</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value || ''}
                disabled={isLoading || contactTypesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contacts.selectContactType')} />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">{t('contacts.company')}</Label>
          <Input
            id="company"
            placeholder={t("additionalPlaceholders.companyName")}
            {...register('company')}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('contacts.address')}</Label>
          <Input
            id="address"
            placeholder={t("additionalPlaceholders.streetAddress")}
            {...register('address')}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">{t('contacts.city')}</Label>
            <Input
              id="city"
              placeholder={t("additionalPlaceholders.city")}
              {...register('city')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">{t('contacts.zipCode')}</Label>
            <Input
              id="zip_code"
              placeholder={t('contacts.placeholderZipCode')}
              {...register('zip_code')}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t('contacts.notes')}</Label>
          <Textarea
            id="notes"
            placeholder={t("additionalPlaceholders.additionalNotes")}
            rows={3}
            {...register('notes')}
            disabled={isLoading}
          />
        </div>

        <SheetFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onSuccess?.();
            }}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? contact
                ? t('common.updating')
                : t('common.creating')
              : contact
                ? t('common.update')
                : t('common.create')}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
};
