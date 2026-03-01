import { useMemo, useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';
import { cn } from '@/lib/utils';

interface TasksFormsViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
  projectId?: string;
}

interface Form {
  id: string;
  project_id?: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  created_at: string;
  updated_at?: string;
  nameKey?: string;
  descriptionKey?: string;
}

export const TasksFormsView = ({ tasks, onTaskEdit, projectId }: TasksFormsViewProps) => {
  const { t, language, dateFormat } = useLocalization();
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const forms = useMemo(() => {
    // Return empty array when no forms exist
    return [] as Form[];
  }, []);

  // Get locale for date formatting
  const getLocale = (): Locale => {
    const localeMap: Record<Language, Locale> = {
      'en-US': enUS,
      'pt-BR': ptBR,
      'es-ES': es,
      'fr-FR': fr,
    };
    return localeMap[language] || enUS;
  };

  // forms are derived from projectId and localization function `t` via useMemo

  const handleAddForm = () => {
    setSelectedForm(null);
    setIsFormSheetOpen(true);
  };

  const handleEditForm = (form: Form) => {
    setSelectedForm(form);
    setIsFormSheetOpen(true);
  };

  const handleDeleteForm = (formId: string) => {
    // In real implementation, this would call a delete mutation
    console.log('Delete form:', formId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'draft':
        return 'bg-muted';
      case 'archived':
        return 'bg-destructive/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('architect.tasks.viewModes.forms')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('architect.tasks.formsDescription')}
          </p>
        </div>
        <Button onClick={handleAddForm} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          {t('architect.tasks.addForm')}
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">{t('architect.tasks.noForms')}</p>
            <Button onClick={handleAddForm} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {t('architect.tasks.addForm')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{form.name}</CardTitle>
                    {form.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 ml-2', getStatusColor(form.status))}
                  >
                    {t(`architect.tasks.formStatuses.${form.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{t('architect.tasks.formType')}: {t(`architect.tasks.formTypes.${form.type}`)}</span>
                  <span>{formatDate(form.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditForm(form)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteForm(form.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sliding Form Sheet */}
      <Sheet open={isFormSheetOpen} onOpenChange={setIsFormSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedForm
                ? t('architect.tasks.editForm')
                : t('architect.tasks.addForm')}
            </SheetTitle>
            <SheetDescription>
              {selectedForm
                ? t('architect.tasks.editFormDescription')
                : t('architect.tasks.addFormDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {/* Form content would go here */}
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('architect.tasks.formEditorComingSoon')}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
