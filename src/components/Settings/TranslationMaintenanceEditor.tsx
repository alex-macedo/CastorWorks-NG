import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocalization, languageMetadata, type Language } from "@/contexts/LocalizationContext";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranslationItem {
  entityType: 'category' | 'value';
  entityId: string;
  entityKey: string;
  sourceText: string;
  targetText: string;
  translationId: string | null;
}

export const TranslationMaintenanceEditor = () => {
  const { t } = useLocalization();
  const [targetLanguage, setTargetLanguage] = useState<Language>('pt-BR');
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadTranslations = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('config_categories')
        .select('id, key')
        .order('sort_order');

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
        throw categoriesError;
      }
      console.log('✅ Categories loaded:', categoriesData?.length || 0, 'items');

      // Fetch all active values
      const { data: valuesData, error: valuesError } = await supabase
        .from('config_values')
        .select('id, key, category_id')
        .eq('is_active', true)
        .order('sort_order');

      if (valuesError) {
        console.error('❌ Error fetching values:', valuesError);
        throw valuesError;
      }
      console.log('✅ Values loaded:', valuesData?.length || 0, 'items');

      // Fetch source translations (en-US)
      const { data: sourceTranslations, error: sourceError } = await supabase
        .from('config_translations')
        .select('entity_type, entity_id, label')
        .eq('language_code', 'en-US');

      if (sourceError) {
        console.error('❌ Error fetching source translations:', sourceError);
        throw sourceError;
      }
      console.log('✅ Source (en-US) translations loaded:', sourceTranslations?.length || 0, 'items');

      // Fetch target translations
      const { data: targetTranslations, error: targetError } = await supabase
        .from('config_translations')
        .select('id, entity_type, entity_id, label')
        .eq('language_code', targetLanguage);

      if (targetError) {
        console.error('❌ Error fetching target translations:', targetError);
        throw targetError;
      }
      console.log(`✅ Target (${targetLanguage}) translations loaded:`, targetTranslations?.length || 0, 'items');

      // Build translation items array
      const items: TranslationItem[] = [];

      // Add categories
      categoriesData?.forEach((cat) => {
        const sourceText = sourceTranslations?.find(
          t => t.entity_type === 'category' && t.entity_id === cat.id
        )?.label || '';

        const targetTranslation = targetTranslations?.find(
          t => t.entity_type === 'category' && t.entity_id === cat.id
        );

        items.push({
          entityType: 'category',
          entityId: cat.id,
          entityKey: cat.key,
          sourceText,
          targetText: targetTranslation?.label || '',
          translationId: targetTranslation?.id || null,
        });
      });

      // Add values
      valuesData?.forEach((val) => {
        const sourceText = sourceTranslations?.find(
          t => t.entity_type === 'value' && t.entity_id === val.id
        )?.label || '';

        const targetTranslation = targetTranslations?.find(
          t => t.entity_type === 'value' && t.entity_id === val.id
        );

        items.push({
          entityType: 'value',
          entityId: val.id,
          entityKey: val.key,
          sourceText,
          targetText: targetTranslation?.label || '',
          translationId: targetTranslation?.id || null,
        });
      });

      console.log('✅ Total translation items built:', items.length);
      console.log('📊 Breakdown - Categories:', categoriesData?.length || 0, '+ Values:', valuesData?.length || 0);
      setTranslations(items);
      setHasChanges(false);
    } catch (error) {
      console.error('❌ Error loading translations:', error);
      toast.error(t('settings.translationMaintenance.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const updateTranslation = (index: number, newText: string) => {
    const updated = [...translations];
    updated[index].targetText = newText;
    setTranslations(updated);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Prepare upsert data
      const upsertData = translations
        .filter(item => item.targetText.trim() !== '') // Only save non-empty translations
        .map(item => ({
          entity_type: item.entityType,
          entity_id: item.entityId,
          language_code: targetLanguage,
          label: item.targetText.trim(),
        }));

      if (upsertData.length === 0) {
        toast.warning(t('settings.translationMaintenance.noTranslationsToSave'));
        return;
      }

      // Upsert all translations
      const { error } = await supabase
        .from('config_translations')
        .upsert(upsertData, {
          onConflict: 'entity_type,entity_id,language_code',
        });

      if (error) throw error;

      toast.success(t('settings.translationMaintenance.saveSuccess', { count: upsertData.length, language: languageMetadata[targetLanguage].nativeName }));
      setHasChanges(false);

      // Reload to get fresh data with IDs
      await loadTranslations();
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error(t('settings.translationMaintenance.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const missingCount = translations.filter(t => !t.targetText.trim()).length;
  const completedCount = translations.length - missingCount;
  const completionPercentage = translations.length > 0
    ? Math.round((completedCount / translations.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('settings.translationMaintenance.title')}</CardTitle>
            <CardDescription>
              {t('settings.translationMaintenance.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">
                {t('settings.translationMaintenance.translated', { completed: completedCount, total: translations.length })}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('settings.translationMaintenance.percentComplete', { percent: completionPercentage })}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selector */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="target-language">Target Language</Label>
            <Select value={targetLanguage} onValueChange={(value: Language) => setTargetLanguage(value)}>
              <SelectTrigger id="target-language">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span>{languageMetadata[targetLanguage].flag}</span>
                    <span>{languageMetadata[targetLanguage].nativeName}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">
                  <div className="flex items-center gap-2">
                    <span>{languageMetadata['pt-BR'].flag}</span>
                    <span>{languageMetadata['pt-BR'].nativeName}</span>
                  </div>
                </SelectItem>
                <SelectItem value="es-ES">
                  <div className="flex items-center gap-2">
                    <span>{languageMetadata['es-ES'].flag}</span>
                    <span>{languageMetadata['es-ES'].nativeName}</span>
                  </div>
                </SelectItem>
                <SelectItem value="fr-FR">
                  <div className="flex items-center gap-2">
                    <span>{languageMetadata['fr-FR'].flag}</span>
                    <span>{languageMetadata['fr-FR'].nativeName}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={!hasChanges || isSaving || isLoading}
            className=""
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All
              </>
            )}
          </Button>
        </div>

        {/* Translations Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : translations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{t("messages.noTranslationDataFound")}</p>
              <p className="text-sm text-muted-foreground max-w-md">
                The database tables (config_categories, config_values, config_translations)
                may not be populated yet. Please apply the database migration to seed the initial data.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Check the browser console (F12) for detailed error messages.
              </p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[200px]">Key</TableHead>
                    <TableHead className="w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{languageMetadata['en-US'].flag}</span>
                        Source (English)
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{languageMetadata[targetLanguage].flag}</span>
                        Target ({languageMetadata[targetLanguage].nativeName})
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {translations.map((item, index) => (
                    <TableRow key={`${item.entityType}-${item.entityId}`}>
                      <TableCell>
                        <Badge variant={item.entityType === 'category' ? 'default' : 'outline'}>
                          {item.entityType === 'category' ? t('settings.translationMaintenance.category') : t('settings.translationMaintenance.value')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.entityKey}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {item.sourceText || <em className="text-destructive">{t('settings.translationMaintenance.noSourceText')}</em>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.targetText}
                          onChange={(e) => updateTranslation(index, e.target.value)}
                          placeholder={t('settings.translationMaintenance.placeholder', { language: languageMetadata[targetLanguage].nativeName })}
                          className={!item.targetText.trim() ? 'border-warning' : ''}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Footer with stats */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {missingCount > 0 && (
              <span className="text-warning font-medium">
                {t('settings.translationMaintenance.missing', { count: missingCount })}
              </span>
            )}
            {missingCount === 0 && (
              <span className="text-success font-medium">
                {t('settings.translationMaintenance.allComplete')}
              </span>
            )}
          </div>
          {hasChanges && (
            <div className="text-sm text-muted-foreground">
              {t('settings.translationMaintenance.unsavedChanges')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
