import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormRenderer } from '@/components/forms/Renderer/FormRenderer';
import { PublicFormLayout } from '@/components/forms/Renderer/PublicFormLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { AlertCircle, FileX } from 'lucide-react';
import type { FormThemeVariant } from '@/components/forms/Renderer/glassTokens';

interface FormData {
  id: string;
  title: string;
  status: string;
  is_public: boolean;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    variant?: string;
  };
}

/**
 * PublicFormPage
 * 
 * Public-facing form submission page with CastorWorks branding.
 * Accessible via share token without authentication.
 * Route: /form/:shareToken
 */
export function PublicFormPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { t } = useLocalization();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: branding } = useQuery({
    queryKey: ['public-form-branding', shareToken],
    queryFn: async () => {
      if (!shareToken) return null;

      const { data, error: invokeError } = await supabase.functions.invoke('get-public-branding', {
        body: { formShareToken: shareToken },
      });

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Failed to load public form branding');

      return data.branding as {
        companyName?: string | null;
        companyLogoUrl?: string | null;
      } | null;
    },
    enabled: !!shareToken,
    retry: false,
  });

  useEffect(() => {
    const fetchFormByToken = async () => {
      if (!shareToken) {
        setError(t('forms:publicForm.formNotFoundMessage'));
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('forms')
          .select('id, title, status, is_public, theme')
          .eq('share_token', shareToken)
          .single();

        if (fetchError || !data) {
          setError(t('forms:publicForm.formNotFoundMessage'));
          setLoading(false);
          return;
        }

        if (data.status !== 'published') {
          setError(t('forms:publicForm.formClosedMessage'));
          setLoading(false);
          return;
        }

        setFormData(data as FormData);
      } catch (err) {
        console.error('Error fetching form:', err);
        setError(t('forms:publicForm.formNotFoundMessage'));
      } finally {
        setLoading(false);
      }
    };

    fetchFormByToken();
  }, [shareToken, t]);

  if (loading) {
    return (
      <PublicFormLayout>
        <div className="container max-w-2xl mx-auto py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
            <p className="text-muted-foreground">Loading form…</p>
          </div>
        </div>
      </PublicFormLayout>
    );
  }

  if (error || !formData) {
    const isClosedForm = error === t('forms:publicForm.formClosedMessage');
    
    return (
      <PublicFormLayout>
        <div className="container max-w-2xl mx-auto py-12">
          <div className="flex flex-col items-center justify-center text-center bg-background rounded-lg border p-8">
            {isClosedForm ? (
              <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
            ) : (
              <FileX className="h-16 w-16 text-muted-foreground mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {isClosedForm ? t('forms:publicForm.formClosed') : t('forms:publicForm.formNotFound')}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {error || t('forms:publicForm.formNotFoundMessage')}
            </p>
          </div>
        </div>
      </PublicFormLayout>
    );
  }

  const theme = formData.theme as FormData['theme'];
  const themeVariantParam = searchParams.get('theme');
  const themeVariant: FormThemeVariant =
    themeVariantParam === 'dark-gold' || themeVariantParam === 'darkGold'
      ? 'darkGold'
      : theme?.variant === 'dark-gold' || theme?.variant === 'darkGold'
        ? 'darkGold'
        : 'light';

  return (
    <PublicFormLayout 
      formTitle={formData.title}
      companyName={branding?.companyName || undefined}
      logoUrl={theme?.logoUrl || branding?.companyLogoUrl || undefined}
      primaryColor={theme?.primaryColor}
      themeVariant={themeVariant}
    >
      <FormRenderer
        formId={formData.id}
        mode="respond"
        themeVariant={themeVariant}
      />
    </PublicFormLayout>
  );
}

export default PublicFormPage;
