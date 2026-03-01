import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { validateCNPJ, formatCNPJ, formatPhone, validateEmail, validateURL } from "@/utils/validation";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';
import { Loader2, Upload, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { lookupBrazilCep } from "@/lib/addressLookup";

import { useLocalization } from "@/contexts/LocalizationContext";

export function CompanyProfileForm() {
  const { t } = useLocalization();
  const { settings, updateSettings } = useCompanySettings();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);

  const form = useForm({
    values: settings ? {
      company_name: settings.company_name || '',
      tax_id: settings.tax_id || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      website: settings.website || '',
      company_bio: (settings as any).company_bio || '',
      company_logo_url: settings.company_logo_url || '',
      additional_info: (settings as any).additional_info || '',
      general_terms: (settings as any).general_terms || '',
      zip_code: '', // Not stored in DB, used for CEP lookup
    } : undefined,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('👆 handleLogoUpload triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📄 File selected:', { name: file.name, size: file.size, type: file.type });

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      console.warn('⚠️ File too large:', { size: file.size });
      toast({
        title: t('common.errorTitle'),
        description: t('settings.companyProfile.fileSizeError'),
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.warn('⚠️ Invalid file type:', { type: file.type });
      toast({
        title: t('common.errorTitle'),
        description: t('settings.companyProfile.fileTypeError'),
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ File validation passed');
    setUploading(true);
    
    try {
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${fileName}`;

      console.log('%c🚀 LOGO UPLOAD STARTING', 'color: green; font-weight: bold', {
        fileName,
        filePath,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type,
      });

      console.log('📤 Calling supabase.storage.from("project-images").upload()...');
      const { data, error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('%c❌ UPLOAD ERROR', 'color: red; font-weight: bold', {
          error: uploadError,
          message: uploadError.message,
          statusCode: (uploadError as any).status,
          statusMessage: (uploadError as any).statusText,
        });
        
        // Handle Nginx 404 errors or other non-JSON responses
        if (uploadError.message?.includes('<html>') || (uploadError as any).status === 404) {
          throw new Error('Upload failed: Storage service endpoint not found (404). Please contact support to verify server routing configuration.');
        }
        
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('%c✅ UPLOAD SUCCESSFUL', 'color: green; font-weight: bold', {
        data,
        filePath,
      });

      // Update form field with the uploaded file path
      console.log('📝 Setting form value company_logo_url:', filePath);
      form.setValue('company_logo_url', filePath);

      // Use helper to resolve a signed URL for immediate preview
      console.log('%c🔍 RESOLVING PREVIEW URL', 'color: blue; font-weight: bold', {
        filePath,
        ttl: '31536000 seconds (1 year)',
      });
      
      try {
        const signed = await resolveStorageUrl(filePath, 60 * 60 * 24 * 365);
        if (signed) {
          console.log('%c✅ PREVIEW URL RESOLVED', 'color: green; font-weight: bold', {
            signedUrl: signed.substring(0, 80) + '...',
          });
          setPreviewUrl(signed);
        } else {
          console.warn('%c⚠️ COULD NOT RESOLVE PREVIEW URL', 'color: orange; font-weight: bold');
        }
      } catch (urlError) {
        console.error('%c❌ ERROR RESOLVING PREVIEW URL', 'color: red; font-weight: bold', {
          error: urlError,
          filePath,
        });
      }

      // Immediately save the logo URL to the database
      console.log('%c💾 SAVING TO DATABASE', 'color: blue; font-weight: bold', {
        company_logo_url: filePath,
      });
      const result = await updateSettings.mutateAsync({
        company_logo_url: filePath,
      });
      console.log('✅ Database save successful:', result);
      
      console.log('%c🎉 LOGO UPLOAD COMPLETE!', 'color: green; font-weight: bold; font-size: 14px');
      toast({
        title: t('common.success'),
        description: t('settings.companyProfile.logoUploadSuccess'),
      });
    } catch (error: any) {
      console.error('%c❌ LOGO UPLOAD ERROR', 'color: red; font-weight: bold; font-size: 14px', {
        fullError: error,
        message: error.message,
        errorDescription: error.error_description,
        stack: error.stack,
      });
      const errorMessage = error.message || error.error_description || t('settings.companyProfile.logoProcessError');
      toast({
        title: t('common.errorTitle'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Upload handler cleanup');
      setUploading(false);
    }
  };

  // Ensure existing settings logo shows as preview (signed URL)
  useEffect(() => {
    let mounted = true;
    const loadPreview = async () => {
      const filePath = settings?.company_logo_url;
      if (!filePath) {
        setPreviewUrl(null);
        return;
      }

      // If it's already a full URL, use as-is
      if (filePath.startsWith('http')) {
        setPreviewUrl(filePath);
        return;
      }

        try {
          const signed = await resolveStorageUrl(filePath, 60 * 60 * 24 * 365);
          if (mounted) setPreviewUrl(signed);
        } catch (err) {
          console.error('Failed to create signed url for preview:', err);
          setPreviewUrl(null);
        }
    };

    loadPreview();
    return () => { mounted = false; };
  }, [settings?.company_logo_url]);

  const onSubmit = (data: any) => {
    // Validate CNPJ if provided
    if (data.tax_id && !validateCNPJ(data.tax_id)) {
      form.setError('tax_id', { message: t('settings.companyProfile.invalidCNPJ') });
      return;
    }

    // Validate email if provided
    if (data.email && !validateEmail(data.email)) {
      form.setError('email', { message: t('settings.companyProfile.invalidEmail') });
      return;
    }

    // Validate URL if provided
    if (data.website && !validateURL(data.website)) {
      form.setError('website', { message: t('settings.companyProfile.invalidURL') });
      return;
    }

    // Exclude zip_code from update data (not stored in DB)
    const { zip_code, ...updateData } = data;

    updateSettings.mutate(updateData);
  };

  const runCepLookup = async (cep: string) => {
    if (!cep || cep.length < 8) return;

    setIsLookingUpAddress(true);
    try {
      const { normalized, error } = await lookupBrazilCep(cep);
      if (error) {
        toast({
          title: t('settings.companyProfile.addressLookupErrorTitle'),
          description: t('settings.companyProfile.addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      const hasAddressData = normalized?.line1 || normalized?.city || normalized?.district;

      if (!normalized?.quality?.is_valid && !hasAddressData) {
        toast({
          title: t('settings.companyProfile.addressLookupErrorTitle'),
          description: t('settings.companyProfile.addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      applyAddressLookup(normalized);
    } catch (error) {
      console.error('CEP lookup error:', error);
      toast({
        title: t('settings.companyProfile.addressLookupErrorTitle'),
        description: t('settings.companyProfile.addressLookupErrorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsLookingUpAddress(false);
    }
  };

  const applyAddressLookup = (normalized: any) => {
    // Build full address from line1, city, and region
    const addressParts = [];
    if (normalized.line1) addressParts.push(normalized.line1);
    if (normalized.city) addressParts.push(normalized.city);
    if (normalized.region) addressParts.push(normalized.region);

    const fullAddress = addressParts.join(', ');

    // Set the full address in the address field
    if (fullAddress) {
      form.setValue('address', fullAddress, { shouldDirty: true, shouldValidate: true });
    }

    // Ensure the postal code remains in the zip_code field (it should already be there from the input)
    // We don't need to set it again as the user input is preserved
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* General Information Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{t('settings.companyProfile.generalInformation')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.companyProfile.generalInformationDescription')}
            </p>
          </div>

          {/* Row 1: Company Name (60%), CNPJ (15%), Website (25%) */}
          <div className="flex gap-4">
            <div className="w-[60%]">
              <FormField
                control={form.control}
                name="company_name"
                rules={{ required: t('settings.companyProfile.companyNameRequired') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.companyNameLabel')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('settings.companyProfile.companyNamePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[15%]">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.cnpjLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('settings.companyProfile.cnpjPlaceholder')}
                        value={formatCNPJ(field.value || '')}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[25%]">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.websiteLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('settings.companyProfile.websitePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Row 2: ZIP/CEP Code (15%), Address (85%) */}
          <div className="flex gap-4">
            <div className="w-[15%]">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.zipCodeLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          placeholder={t('settings.companyProfile.zipCodePlaceholder')}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                          onBlur={(e) => {
                            field.onBlur();
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits.length === 8) {
                              void runCepLookup(digits);
                            }
                          }}
                          inputMode="numeric"
                          maxLength={9}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => {
                            const digits = field.value?.replace(/\D/g, '') || '';
                            if (digits.length === 8) {
                              void runCepLookup(digits);
                            }
                          }}
                          disabled={isLookingUpAddress || !field.value || field.value.replace(/\D/g, '').length !== 8}
                        >
                          {isLookingUpAddress ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.companyProfile.zipCodeHint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[85%]">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.addressLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('settings.companyProfile.addressPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Row 3: Phone (15%), Email (25%), Company Description (60%) */}
          <div className="flex gap-4">
            <div className="w-[15%]">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.phoneLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('settings.companyProfile.phonePlaceholder')}
                        value={formatPhone(field.value || '')}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[25%]">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={t('settings.companyProfile.emailPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[60%]">
              <FormField
                control={form.control}
                name="company_bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.companyProfile.companyDescriptionLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('settings.companyProfile.companyDescriptionPlaceholder')}
                        maxLength={500}
                        rows={4}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.companyProfile.charactersCount', { count: field.value?.length || 0 })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Quote Information Section */}
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="text-lg font-semibold">{t('settings.companyProfile.quoteInformation')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('settings.companyProfile.quoteInformationDescription')}
            </p>
          </div>

          <FormField
            control={form.control}
            name="additional_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.companyProfile.additionalInfoLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('settings.companyProfile.additionalInfoPlaceholder')}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="general_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.companyProfile.generalTermsLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('settings.companyProfile.generalTermsPlaceholder')}
                    rows={10}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Logo Upload Section */}
        <div className="border-t pt-6">
          <FormField
            control={form.control}
            name="company_logo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.companyProfile.companyLogoLabel')}</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    {(previewUrl || field.value) && (
                      <div className="flex justify-center">
                        <img
                          src={previewUrl ?? field.value}
                          alt={t('settings.companyProfile.companyLogoAlt')}
                          className="h-32 w-32 object-contain rounded-lg border"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                      {uploading && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            {t('settings.companyProfile.uploading')}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.companyProfile.logoHint')}
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('settings.companyProfile.saveButton')}
        </Button>
      </form>
    </Form>
  );
}
