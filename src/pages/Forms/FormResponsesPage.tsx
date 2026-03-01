import { useParams, useNavigate } from 'react-router-dom';
import { FormAnalyticsDashboard } from '@/components/forms/Analytics/FormAnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useForm } from '@/hooks/useForms';
import { useLocalization } from '@/contexts/LocalizationContext';

/**
 * FormResponsesPage
 * 
 * Displays analytics and responses for a specific form.
 * Shows aggregated statistics and individual response data.
 */
export function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { form } = useForm(id);

  if (!id) {
    return (
      <div className="container max-w-6xl py-12 text-center">
        <p className="text-muted-foreground">{t('forms:publicForm.formNotFoundMessage')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container max-w-6xl py-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forms:actions.back')}
          </Button>
          {form && (
            <div>
              <h1 className="text-2xl font-bold">{form.title}</h1>
              <p className="text-muted-foreground">{t('forms:responses.title')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <FormAnalyticsDashboard formId={id} />
    </div>
  );
}

export default FormResponsesPage;
