import { useState, useEffect, useCallback } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { languageMetadata } from "@/contexts/LocalizationContext";
import { Badge } from "@/components/ui/badge";

interface AddTranslationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'category' | 'value';
  entityId: string;
  entityKey: string;
  onSuccess?: () => void;
}

interface TranslationData {
  label: string;
  reviewNotes: string;
  markAsReviewed: boolean;
  needsReview: boolean;
  lastReviewedAt: string | null;
}

type TranslationsMap = Record<string, TranslationData>;

export const AddTranslationDialog = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityKey,
  onSuccess,
}: AddTranslationDialogProps) => {
  const { t } = useLocalization();
  const { formatDateTime } = useDateFormat();
  const [translations, setTranslations] = useState<TranslationsMap>({
    "en-US": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
    "pt-BR": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
    "es-ES": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
    "fr-FR": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTranslations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_translations')
        .select('language_code, label, review_notes, needs_review, last_reviewed_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;

      const newTranslations: TranslationsMap = {
        "en-US": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
        "pt-BR": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
        "es-ES": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
        "fr-FR": { label: "", reviewNotes: "", markAsReviewed: false, needsReview: false, lastReviewedAt: null },
      };

      if (data) {
        data.forEach((item) => {
          const langCode = item.language_code as keyof TranslationsMap;
          if (newTranslations[langCode]) {
            newTranslations[langCode] = {
              label: item.label || "",
              reviewNotes: item.review_notes || "",
              markAsReviewed: false,
              needsReview: item.needs_review ?? false,
              lastReviewedAt: item.last_reviewed_at,
            };
          }
        });
      }

      setTranslations(newTranslations);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast.error(t('settings.translations.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, t]);

  useEffect(() => {
    if (isOpen) {
      loadTranslations();
    }
  }, [isOpen, loadTranslations]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      for (const [langCode, data] of Object.entries(translations)) {
        if (data.label.trim()) {
          const updateData: any = {
            entity_type: entityType,
            entity_id: entityId,
            language_code: langCode,
            label: data.label.trim(),
            review_notes: data.reviewNotes.trim() || null,
          };

          // If marking as reviewed, update the timestamp and clear needs_review flag
          if (data.markAsReviewed) {
            updateData.needs_review = false;
            updateData.last_reviewed_at = new Date().toISOString();
          }

          const { error } = await supabase
            .from('config_translations')
            .upsert(updateData, {
              onConflict: 'entity_type,entity_id,language_code'
            });

          if (error) throw error;
        }
      }

      toast.success(t('settings.translations.saveSuccess'));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error(t('settings.translations.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateTranslation = (lang: string, field: keyof TranslationData, value: any) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('settings.translations.neverReviewed');
    return t('settings.translations.lastReviewed', {
      date: formatDateTime(dateString)
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('settings.translations.manageTitle')}</SheetTitle>
          <SheetDescription>
            {t('settings.translations.manageDescription', { entityKey, entityType })}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t('settings.translations.loadingTranslations')}</div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="en-US" variant="pill" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {Object.keys(translations).map((lang) => (
                  <TabsTrigger key={lang} value={lang} className="relative">
                    <span className="mr-1">{languageMetadata[lang as keyof typeof languageMetadata].flag}</span>
                    {t(`settings.translations.languageNames.${lang}`)}
                    {translations[lang].needsReview && (
                      <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">!</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(translations).map(([lang, data]) => (
                <TabsContent key={lang} value={lang} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`label-${lang}`}>
                        {t('settings.translations.translationLabel')} {lang === 'en-US' && <span className="text-destructive">*</span>}
                      </Label>
                      {data.needsReview && (
                        <Badge variant="destructive" className="text-xs">{t('settings.translations.needsReview')}</Badge>
                      )}
                    </div>
                    <Input
                      id={`label-${lang}`}
                      value={data.label}
                      onChange={(e) => updateTranslation(lang, 'label', e.target.value)}
                      placeholder={t('settings.translations.translationLabel')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatDate(data.lastReviewedAt)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`notes-${lang}`}>{t('settings.translations.reviewNotes')}</Label>
                    <Textarea
                      id={`notes-${lang}`}
                      value={data.reviewNotes}
                      onChange={(e) => updateTranslation(lang, 'reviewNotes', e.target.value)}
                      placeholder={t('settings.translations.reviewNotesPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`reviewed-${lang}`}
                      checked={data.markAsReviewed}
                      onCheckedChange={(checked) => updateTranslation(lang, 'markAsReviewed', checked)}
                    />
                    <Label
                      htmlFor={`reviewed-${lang}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t('settings.translations.markAsReviewed')}
                    </Label>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('settings.translations.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !translations["en-US"].label.trim()}
            className=""
          >
            {isSaving ? t('settings.translations.saving') : t('settings.translations.saveTranslations')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
