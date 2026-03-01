import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLocalization } from "@/contexts/LocalizationContext";
import { validateCNPJ, formatCNPJ, formatPhone, validateEmail, validateURL } from "@/utils/validation";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';
import { Loader2, Upload, MapPin, Save, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { lookupBrazilCep } from "@/lib/addressLookup";
import { useRealTimeValidation, validationRules } from "@/hooks/useRealTimeValidation";

interface EditCompanyProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditCompanyProfileDialog({
  open,
  onClose,
}: EditCompanyProfileDialogProps) {
  const { t } = useLocalization();
  const { settings, updateSettings } = useCompanySettings();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formInitializedRef = useRef(false);

  const form = useForm({
    defaultValues: {
      company_name: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      company_bio: '',
      company_logo_url: '',
      additional_info: '',
      general_terms: '',
      zip_code: '',

    },
  });
  const watchedValues = useWatch({ control: form.control });

  // Real-time validation for company name
  const companyNameValidation = useRealTimeValidation<string>({
    rules: [
      validationRules.required('Company name is required'),
      validationRules.minLength(2, 'Company name must be at least 2 characters'),
      validationRules.maxLength(100, 'Company name must be no more than 100 characters'),
    ],
  });

  // Real-time validation for email
  const emailValidation = useRealTimeValidation<string>({
    rules: [
      validationRules.required('Email is required'),
      validationRules.email('Please enter a valid email address'),
    ],
  });

  // Real-time validation for CNPJ
  const cnpjValidation = useRealTimeValidation<string>({
    rules: [
      validationRules.cnpj('Please enter a valid CNPJ'),
    ],
  });

  // Real-time validation for website
  const websiteValidation = useRealTimeValidation<string>({
    rules: [
      validationRules.url('Please enter a valid URL'),
    ],
  });

  const handleClose = () => {
    clearDraft(); // Clear draft when dialog is closed
    // Reset validations
    companyNameValidation.reset();
    emailValidation.reset();
    cnpjValidation.reset();
    websiteValidation.reset();
    onClose();
  };

  // Load draft data from localStorage (only when dialog opens)
  useEffect(() => {
    if (!open || !settings) {
      // Reset initialization flag when dialog closes
      if (!open) {
        formInitializedRef.current = false;
      }
      return;
    }
    
    // Only initialize once when dialog opens
    if (formInitializedRef.current) return;
    
    const draftKey = 'company-profile-draft';
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        // Only use draft if it's less than 24 hours old
        const draftAge = Date.now() - (draftData.timestamp || 0);
        if (draftAge < 24 * 60 * 60 * 1000) { // 24 hours
          

          form.reset({
            company_name: draftData.company_name || settings.company_name || '',
            tax_id: draftData.tax_id || settings.tax_id || '',
            address: draftData.address || settings.address || '',
            phone: draftData.phone || settings.phone || '',
            email: draftData.email || settings.email || '',
            website: draftData.website || settings.website || '',
            company_bio: draftData.company_bio || (settings as any).company_bio || '',
            company_logo_url: draftData.company_logo_url || settings.company_logo_url || '',
            additional_info: draftData.additional_info || (settings as any).additional_info || '',
            general_terms: draftData.general_terms || (settings as any).general_terms || '',
            zip_code: '',

          });
          setLastSaved(new Date(draftData.timestamp));
          setAutoSaveStatus('saved');
          formInitializedRef.current = true;
        } else {
          // Draft is too old, remove it
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        console.error('Failed to load draft data:', error);
        localStorage.removeItem(draftKey);
      }
    }
    
    // If no draft or draft was invalid, initialize from settings
    if (!formInitializedRef.current && settings) {

      form.reset({
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
        zip_code: '',

      });
      formInitializedRef.current = true;
    }
  }, [open, settings, form]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('👆 handleLogoUpload triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📄 File selected:', { name: file.name, size: file.size, type: file.type });

    // Validate file - increase to 10MB for production flexibility
    if (file.size > 10 * 1024 * 1024) {
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
      // Verify user is authenticated before uploading
      console.log('🔐 Checking session...');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.error('❌ No active session found');
        throw new Error('You must be logged in to upload files. Please refresh the page and try again.');
      }

      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = fileName;
      const uploadBucket = 'project-images';

      console.log('%c🚀 LOGO UPLOAD STARTING', 'color: green; font-weight: bold', {
        fileName,
        filePath,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type,
      });

      // Use the standard supabase storage upload method which is more reliable 
      // as it uses the properly configured client with protocol and URL fixes
      console.log('📤 Calling supabase.storage.from("project-images").upload()...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(uploadBucket)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('%c❌ UPLOAD ERROR', 'color: red; font-weight: bold', {
          error: uploadError,
          message: uploadError.message,
          statusCode: (uploadError as any).status,
        });

        // Handle Nginx 404 errors or other non-JSON responses
        if (uploadError.message?.includes('<html>') || (uploadError as any).status === 404) {
          throw new Error('Upload failed: Storage service endpoint not found (404). Please contact support to verify server routing configuration.');
        }

        throw uploadError;
      }

      console.log('%c✅ UPLOAD SUCCESSFUL', 'color: green; font-weight: bold', {
        uploadData,
        filePath,
      });

      // Update form and get preview URL
      console.log('📝 Setting form value company_logo_url:', filePath);
      form.setValue('company_logo_url', filePath);
      
      console.log('%c🔍 RESOLVING PREVIEW URL', 'color: blue; font-weight: bold');
      const signed = await resolveStorageUrl(filePath, 60 * 60 * 24 * 365);
      if (signed) {
        console.log('%c✅ PREVIEW URL RESOLVED', 'color: green; font-weight: bold', {
          signedUrl: signed.substring(0, 80) + '...',
        });
        setPreviewUrl(signed);
      } else {
        console.warn('%c⚠️ COULD NOT RESOLVE PREVIEW URL', 'color: orange; font-weight: bold');
      }

      console.log('%c💾 SAVING TO DATABASE', 'color: blue; font-weight: bold');
      await updateSettings.mutateAsync({
        company_logo_url: filePath,
      });
      console.log('✅ Database save successful');

      toast({
        title: t('common.success'),
        description: t('settings.companyProfile.logoUploadSuccess'),
      });
    } catch (error: any) {
      console.error('%c❌ LOGO UPLOAD ERROR', 'color: red; font-weight: bold', error);
      toast({
        title: t('common.errorTitle'),
        description: error?.message || error?.error?.message || t('settings.companyProfile.logoProcessError'),
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Upload handler cleanup');
      setUploading(false);
    }
  };



  useEffect(() => {
    let mounted = true;
    const loadPreview = async () => {
      const logoPath = settings?.company_logo_url;
      if (!logoPath) {
        setPreviewUrl(null);
        return;
      }

      // If already a full URL, use directly
      if (logoPath.startsWith('http')) {
        setPreviewUrl(logoPath);
        return;
      }

      // Use resolveStorageUrl for all storage paths - it handles bucket detection
      // and signed URL generation (defaults to project-images bucket)
      try {
        const signed = await resolveStorageUrl(logoPath, 60 * 60 * 24 * 365);
        if (mounted && signed) {
          console.log('EditCompanyProfile: Logo preview URL resolved', { url: signed.substring(0, 50) + '...' });
          setPreviewUrl(signed);
        }
      } catch (err) {
        console.error('EditCompanyProfile: Failed to resolve logo URL:', err);
        if (mounted) setPreviewUrl(null);
      }
    };

    loadPreview();
    return () => { mounted = false; };
  }, [settings?.company_logo_url]);

  const onSubmit = (data: any) => {
    if (data.tax_id && !validateCNPJ(data.tax_id)) {
      form.setError('tax_id', { message: t('settings.companyProfile.invalidCNPJ') });
      return;
    }

    if (data.email && !validateEmail(data.email)) {
      form.setError('email', { message: t('settings.companyProfile.invalidEmail') });
      return;
    }

    if (data.website && !validateURL(data.website)) {
      form.setError('website', { message: t('settings.companyProfile.invalidURL') });
      return;
    }

    const { zip_code, ...updateData } = data;

    const finalUpdateData = {
      ...updateData,
    };

    updateSettings.mutate(finalUpdateData, {
      onSuccess: () => {
        clearDraft(); // Clear draft on successful save
        toast({
          title: t('common.success'),
          description: t('settings.companyProfile.saveSuccess'),
        });
        onClose();
      },
      onError: (error) => {
        console.error("Failed to update company profile:", error);
        toast({
          title: t('common.errorTitle'),
          description: t('settings.companyProfile.saveError'),
          variant: 'destructive',
        });
      },
    });
  };

  // Auto-save draft to localStorage
  const saveDraft = useCallback((data: any) => {
    try {
      const draftData = {
        ...data,
        timestamp: Date.now(),
      };
      localStorage.setItem('company-profile-draft', JSON.stringify(draftData));
      setLastSaved(new Date());
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
      setAutoSaveStatus('error');
    }
  }, []);

  // Debounced auto-save
  const debouncedAutoSave = useCallback((data: any) => {
    setAutoSaveStatus('saving');

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(data);
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [saveDraft]);

  // Watch form changes for auto-save
  useEffect(() => {
    if (form.formState.isDirty && watchedValues) {
      debouncedAutoSave(watchedValues);
    }
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form.formState.isDirty, watchedValues, debouncedAutoSave]);

  // Clear draft when form is submitted or dialog is closed
  const clearDraft = useCallback(() => {
    localStorage.removeItem('company-profile-draft');
    setLastSaved(null);
    setAutoSaveStatus('idle');
  }, []);



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
    const addressParts = [];
    if (normalized.line1) addressParts.push(normalized.line1);
    if (normalized.city) addressParts.push(normalized.city);
    if (normalized.region) addressParts.push(normalized.region);

    const fullAddress = addressParts.join(', ');

    if (fullAddress) {
      form.setValue('address', fullAddress, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-[1075px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{t("settings:editCompanyProfile")}</SheetTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('settings.saving')}</span>
                </>
              )}
              {autoSaveStatus === 'saved' && lastSaved && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">
                    {t('common.saved')} {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600">
                    {t('settings.companyProfile.saveError')}
                  </span>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
            {/* General Information Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">{t('settings.companyProfile.generalInformation')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.companyProfile.generalInformationDescription')}
                </p>
              </div>

              {/* Row 1: Company Name (54%), CNPJ (16.5%), Website (25%) */}
              <div className="flex gap-4">
                <div className="w-[54%]">
                  <FormField
                    control={form.control}
                    name="company_name"
                    rules={{ required: t('settings.companyProfile.companyNameRequired') }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.companyProfile.companyNameLabel')} *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder={t('settings.companyProfile.companyNamePlaceholder')}
                              onChange={(e) => {
                                field.onChange(e);
                                companyNameValidation.handleChange(e.target.value);
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                companyNameValidation.handleBlur(e.target.value);
                              }}
                              className={
                                companyNameValidation.validation.isValid === false
                                  ? 'border-red-500 focus:border-red-500'
                                  : companyNameValidation.validation.isValid === true
                                  ? 'border-green-500 focus:border-green-500'
                                  : ''
                              }
                            />
                            {companyNameValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {companyNameValidation.validation.isValid === true && !companyNameValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {companyNameValidation.validation.isValid === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {companyNameValidation.validation.error && (
                          <p className="text-sm text-red-600">{companyNameValidation.validation.error}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="w-[16.5%]">
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.companyProfile.cnpjLabel')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder={t('settings.companyProfile.cnpjPlaceholder')}
                              value={formatCNPJ(field.value || '')}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                field.onChange(rawValue);
                                cnpjValidation.handleChange(rawValue);
                              }}
                              onBlur={() => {
                                field.onBlur();
                                cnpjValidation.handleBlur(field.value);
                              }}
                              maxLength={18}
                              className={
                                cnpjValidation.validation.isValid === false
                                  ? 'border-red-500 focus:border-red-500'
                                  : cnpjValidation.validation.isValid === true
                                  ? 'border-green-500 focus:border-green-500'
                                  : ''
                              }
                            />
                            {cnpjValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {cnpjValidation.validation.isValid === true && !cnpjValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {cnpjValidation.validation.isValid === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {cnpjValidation.validation.error && (
                          <p className="text-sm text-red-600">{cnpjValidation.validation.error}</p>
                        )}
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
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder={t('settings.companyProfile.websitePlaceholder')}
                              onChange={(e) => {
                                field.onChange(e);
                                websiteValidation.handleChange(e.target.value);
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                websiteValidation.handleBlur(e.target.value);
                              }}
                              className={
                                websiteValidation.validation.isValid === false
                                  ? 'border-red-500 focus:border-red-500'
                                  : websiteValidation.validation.isValid === true
                                  ? 'border-green-500 focus:border-green-500'
                                  : ''
                              }
                            />
                            {websiteValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {websiteValidation.validation.isValid === true && !websiteValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {websiteValidation.validation.isValid === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {websiteValidation.validation.error && (
                          <p className="text-sm text-red-600">{websiteValidation.validation.error}</p>
                        )}
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

              {/* Row 3: Phone (above Email) and Company Description sharing same row height */}
              <div className="flex gap-4">
                <div className="w-[25%] flex flex-col gap-4">
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

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.companyProfile.emailLabel')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type="email"
                              placeholder={t('settings.companyProfile.emailPlaceholder')}
                              onChange={(e) => {
                                field.onChange(e);
                                emailValidation.handleChange(e.target.value);
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                emailValidation.handleBlur(e.target.value);
                              }}
                              className={
                                emailValidation.validation.isValid === false
                                  ? 'border-red-500 focus:border-red-500'
                                  : emailValidation.validation.isValid === true
                                  ? 'border-green-500 focus:border-green-500'
                                  : ''
                              }
                            />
                            {emailValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {emailValidation.validation.isValid === true && !emailValidation.validation.isValidating && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {emailValidation.validation.isValid === false && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {emailValidation.validation.error && (
                          <p className="text-sm text-red-600">{emailValidation.validation.error}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="w-[75%]">
                  <FormField
                    control={form.control}
                    name="company_bio"
                    render={({ field }) => (
                      <FormItem className="h-full">
                        <FormLabel>{t('settings.companyProfile.companyDescriptionLabel')}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t('settings.companyProfile.companyDescriptionPlaceholder')}
                            maxLength={500}
                            rows={4}
                            className="h-full resize-none"
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
            <div className="space-y-6 pt-8 mt-8">
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


          </form>
        </Form>

        <SheetFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
