import { useParams, useNavigate } from 'react-router-dom';
import { FormBuilder } from '@/components/forms/Builder/FormBuilder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

/**
 * FormBuilderPage
 * 
 * Page wrapper for the FormBuilder component.
 * Handles both creating new forms (/forms/new) and editing existing ones (/forms/:id/edit).
 */
export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLocalization();
  const isNew = !id;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Back Button */}
      <div className="border-b bg-background">
        <div className="container max-w-5xl py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forms:actions.back')}
          </Button>
        </div>
      </div>

      {/* Form Builder */}
      <FormBuilder
        formId={isNew ? undefined : id}
        onSave={(formId) => {
          if (isNew) {
            navigate(`/forms/${formId}/edit`, { replace: true });
          }
        }}
      />
    </div>
  );
}

export default FormBuilderPage;
