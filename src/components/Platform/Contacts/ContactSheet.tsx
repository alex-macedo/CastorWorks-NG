import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import type { Contact } from '@/types/contacts';

interface ContactSheetProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
}

export function ContactSheet({ open, onClose, contact }: ContactSheetProps) {
  const { t } = useLocalization();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isEdit = !!contact;

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      role: '',
      company: '',
      address: '',
      city: '',
      zip_code: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset(contact
        ? {
            full_name: contact.full_name ?? '',
            email: contact.email ?? '',
            phone_number: contact.phone_number ?? '',
            role: contact.role ?? '',
            company: contact.company ?? '',
            address: contact.address ?? '',
            city: contact.city ?? '',
            zip_code: contact.zip_code ?? '',
            notes: contact.notes ?? '',
          }
        : {
            full_name: '', email: '', phone_number: '', role: '',
            company: '', address: '', city: '', zip_code: '', notes: '',
          });
    }
  }, [open, contact, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateContact.mutateAsync({ id: contact!.id, updates: values });
      } else {
        await createContact.mutateAsync(values as any);
      }
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('platform:contacts.editContact') : t('platform:contacts.newContact')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:contacts.fullName')} *</Label>
            <Input {...register('full_name', { required: true })} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:contacts.email')}</Label>
              <Input type="email" {...register('email')} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:contacts.phone')}</Label>
              <Input {...register('phone_number')} disabled={isPending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:contacts.role')}</Label>
              <Input {...register('role')} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:contacts.company')}</Label>
              <Input {...register('company')} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:contacts.address')}</Label>
            <Input {...register('address')} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:contacts.city')}</Label>
              <Input {...register('city')} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:contacts.zipCode')}</Label>
              <Input {...register('zip_code')} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:contacts.notes')}</Label>
            <Textarea {...register('notes')} rows={3} disabled={isPending} />
          </div>
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.saving') : t('common.save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
