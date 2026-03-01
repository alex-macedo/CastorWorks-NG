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
import { toast } from "sonner";
import { languageMetadata, type Language } from "@/contexts/LocalizationContext";
import { Loader2, Save, Download, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useLocalization } from "@/contexts/LocalizationContext";
interface TranslationEntry {
  namespace: string;
  key: string;
  fullKey: string;
  sourceText: string;
  targetText: string;
}

const TRANSLATION_NAMESPACES = [
  'common',
  'settings',
  'navigation',
  'dashboard',
  'projects',
  'projectDetail',
  'projectPhases',
  'clients',
  'clientPortal',
  'clientReport',
  'budget',
  'financial',
  'materials',
  'procurement',
  'schedule',
  'constructionActivities',
  'reports',
  'roadmap',
  'topBar'
];

export const UITranslationEditor = () => {
  const { t } = useLocalization();
  const [targetLanguage, setTargetLanguage] = useState<Language>('pt-BR');
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const flattenObject = useCallback((obj: any, prefix = ''): Record<string, any> => {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }, []);

  const loadTranslations = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries: TranslationEntry[] = [];

      // Load all translation files
      for (const namespace of TRANSLATION_NAMESPACES) {
        try {
          // Import source (en-US)
          const sourceModule = await import(`../../locales/en-US/${namespace}.json`);
          const sourceData = sourceModule.default || sourceModule;

          // Import target language
          const targetModule = await import(`../../locales/${targetLanguage}/${namespace}.json`);
          const targetData = targetModule.default || targetModule;

          // Flatten and combine
          const flatSource = flattenObject(sourceData);
          const flatTarget = flattenObject(targetData);

          // Create entries
          for (const [key, sourceValue] of Object.entries(flatSource)) {
            entries.push({
              namespace,
              key,
              fullKey: `${namespace}.${key}`,
              sourceText: String(sourceValue),
              targetText: String(flatTarget[key] || ''),
            });
          }
        } catch (error) {
          console.error(`Error loading ${namespace}:`, error);
        }
      }

      console.log('✅ Loaded', entries.length, 'translation entries');
      setTranslations(entries);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast.error(t('settings.translationEditor.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage, flattenObject, t]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const unflattenObject = (flat: Record<string, any>): any => {
    const result: any = {};

    for (const [key, value] of Object.entries(flat)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = value;
    }

    return result;
  };

  const updateTranslation = (index: number, newText: string) => {
    const updated = [...translations];
    updated[index].targetText = newText;
    setTranslations(updated);
    setHasChanges(true);
  };

  const generateUpdatedFiles = () => {
    // Group translations by namespace
    const byNamespace: Record<string, Record<string, string>> = {};

    translations.forEach(entry => {
      if (!byNamespace[entry.namespace]) {
        byNamespace[entry.namespace] = {};
      }
      byNamespace[entry.namespace][entry.key] = entry.targetText;
    });

    // Unflatten each namespace
    const updatedFiles: Record<string, any> = {};
    for (const [namespace, flatData] of Object.entries(byNamespace)) {
      updatedFiles[namespace] = unflattenObject(flatData);
    }

    return updatedFiles;
  };

  const handleDownloadAll = () => {
    const updatedFiles = generateUpdatedFiles();

    // Create a zip-like structure (download each file separately)
    for (const [namespace, data] of Object.entries(updatedFiles)) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${namespace}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast.success(t('settings.translations.saveSuccess'));
  };

  const filteredTranslations = translations.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.key.toLowerCase().includes(search) ||
      entry.namespace.toLowerCase().includes(search) ||
      entry.sourceText.toLowerCase().includes(search) ||
      entry.targetText.toLowerCase().includes(search)
    );
  });

  const missingCount = filteredTranslations.filter(t => !t.targetText.trim()).length;
  const completedCount = filteredTranslations.length - missingCount;
  const completionPercentage = filteredTranslations.length > 0
    ? Math.round((completedCount / filteredTranslations.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('settings.translationEditor.title')}</CardTitle>
            <CardDescription>
              {t('settings.translationEditor.description')}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {completedCount} / {filteredTranslations.length} {t('settings.translations.translationLabel').toLowerCase()}
            </div>
            <div className="text-xs text-muted-foreground">
              {completionPercentage}% {t('settings.translationDashboard.completion').toLowerCase()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="target-language">{t('settings.translationEditor.targetLanguage')}</Label>
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

          <div className="flex-1 space-y-2">
            <Label htmlFor="search">{t('settings.translationEditor.search')}</Label>
            <Input
              id="search"
              placeholder={t("additionalPlaceholders.searchByKeyNamespaceText")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            onClick={handleDownloadAll}
            disabled={!hasChanges || isLoading}
            className=""
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('settings.translationEditor.downloadAll')}
          </Button>
        </div>

        {/* Info Box */}
        {hasChanges && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('settings.translationEditor.unsavedChanges')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.translationEditor.unsavedChangesDescription', { lang: targetLanguage })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Translations Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTranslations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{t('settings.translationEditor.noTranslations')}</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? t('settings.translationEditor.tryAdjustingSearch') : t('settings.translationEditor.loadError')}
              </p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">{t('settings.translationEditor.namespace')}</TableHead>
                    <TableHead className="w-[200px]">{t('settings.translationEditor.key')}</TableHead>
                    <TableHead className="w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{languageMetadata['en-US'].flag}</span>
                        {t('settings.translationEditor.sourceEnglish')}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{languageMetadata[targetLanguage].flag}</span>
                        {t('settings.translationEditor.targetLanguageLabel', { lang: languageMetadata[targetLanguage].nativeName })}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranslations.map((entry, index) => (
                    <TableRow key={entry.fullKey}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.namespace}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.key}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.sourceText}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.targetText}
                          onChange={(e) => updateTranslation(translations.indexOf(entry), e.target.value)}
                          placeholder={t('settings.translationEditor.placeholder', { lang: languageMetadata[targetLanguage].nativeName })}
                          className={!entry.targetText.trim() ? 'border-warning' : ''}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {missingCount > 0 && (
              <span className="text-warning font-medium">
                {t('settings.translationEditor.translationsMissing', { count: missingCount })}
              </span>
            )}
            {missingCount === 0 && filteredTranslations.length > 0 && (
              <span className="text-success font-medium">
                {t('settings.translationEditor.allComplete')}
              </span>
            )}
            {searchTerm && (
              <span className="ml-2">
                • {t('settings.translationEditor.showingCount', { filtered: filteredTranslations.length, total: translations.length })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
