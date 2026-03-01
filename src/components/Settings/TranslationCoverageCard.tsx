import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfig, TranslationCoverage, MissingTranslation, TranslationNeedsReview } from "@/contexts/ConfigContext";
import { languageMetadata } from "@/contexts/LocalizationContext";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { AddTranslationDialog } from "./AddTranslationDialog";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useLocalization } from "@/contexts/LocalizationContext";

export const TranslationCoverageCard = () => {
  const { getTranslationCoverage, getMissingTranslations, getTranslationsNeedingReview } = useConfig();
  const { formatDate: formatDateHook } = useDateFormat();
  const { t } = useLocalization();
  const [coverage, setCoverage] = useState<TranslationCoverage[]>([]);
  const [missing, setMissing] = useState<MissingTranslation[]>([]);
  const [needsReview, setNeedsReview] = useState<TranslationNeedsReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    entityType: 'category' | 'value';
    entityId: string;
    entityKey: string;
  }>({
    isOpen: false,
    entityType: 'value',
    entityId: '',
    entityKey: '',
  });

  const loadCoverageData = useCallback(async () => {
    setIsLoading(true);
    const [coverageData, missingData, reviewData] = await Promise.all([
      getTranslationCoverage(),
      getMissingTranslations(),
      getTranslationsNeedingReview(),
    ]);
    setCoverage(coverageData);
    setMissing(missingData);
    setNeedsReview(reviewData);
    setIsLoading(false);
  }, [getTranslationCoverage, getMissingTranslations, getTranslationsNeedingReview]);

  useEffect(() => {
    loadCoverageData();
  }, [loadCoverageData]);

  const openTranslationDialog = (entityType: 'category' | 'value', entityId: string, entityKey: string) => {
    setDialogState({
      isOpen: true,
      entityType,
      entityId,
      entityKey,
    });
  };

  const closeTranslationDialog = () => {
    setDialogState({
      isOpen: false,
      entityType: 'value',
      entityId: '',
      entityKey: '',
    });
  };

  const handleTranslationSaved = () => {
    loadCoverageData();
  };

  const getTotalCoverage = () => {
    if (coverage.length === 0) return { translated: 0, total: 0, percentage: 0 };
    const totalTranslated = coverage.reduce((sum, c) => sum + c.translated, 0);
    const totalPossible = coverage.reduce((sum, c) => sum + c.total, 0);
    const percentage = totalPossible > 0 ? Math.round((totalTranslated / totalPossible) * 100) : 0;
    return { translated: totalTranslated, total: totalPossible, percentage };
  };

  const total = getTotalCoverage();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">{t('settings.translationCoverage.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('settings.translationCoverage.never');
    return formatDateHook(dateString);
  };

  return (
    <>
      <div className="space-y-6 w-full">
        <Card>
        <CardHeader>
          <CardTitle>{t('settings.translationCoverage.title')}</CardTitle>
          <CardDescription>
            {t('settings.translationCoverage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Coverage */}
          <div className="space-y-2 pb-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('settings.translationCoverage.overallCoverage')}</span>
              <span className="text-sm font-bold text-primary">{total.percentage}%</span>
            </div>
            <Progress value={total.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {t('settings.translationCoverage.stringsTranslated', { translated: total.translated, total: total.total })}
            </p>
          </div>

          {/* Per-Language Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('settings.translations.languageNames.title')}</h4>
            {coverage.map((lang) => (
              <div key={lang.language} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{languageMetadata[lang.language].flag}</span>
                    <span className="text-sm font-medium">
                      {languageMetadata[lang.language].nativeName}
                    </span>
                    {lang.percentage === 100 && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">{lang.percentage}%</span>
                </div>
                <Progress value={lang.percentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {lang.translated} of {lang.total} strings
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Missing Translations */}
      {missing.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle>{t('settings.translationCoverage.missing.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.translationCoverage.missing.description', { count: missing.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.translationCoverage.missing.type')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.missing.key')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.missing.missingLanguages')}</TableHead>
                  <TableHead className="text-right">{t('settings.translationCoverage.missing.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missing.map((item, idx) => (
                  <TableRow key={`${item.entityType}-${item.entityId}-${idx}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {item.entityType === 'category' ? t('settings.translationCoverage.missing.category') || 'Category' : t('settings.translationCoverage.missing.value') || 'Value'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.entityKey}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.missingLanguages.map((lang) => (
                          <span key={lang} className="text-lg" title={languageMetadata[lang].nativeName}>
                            {languageMetadata[lang].flag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTranslationDialog(item.entityType, item.entityId, item.entityKey)}
                      >
                        {t('settings.translationCoverage.missing.addTranslation')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Translations Needing Review */}
      {needsReview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>{t('settings.translationCoverage.review.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.translationCoverage.review.description', { count: needsReview.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.translationCoverage.missing.type')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.missing.key')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.review.language')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.review.currentTranslation')}</TableHead>
                  <TableHead>{t('settings.translationCoverage.review.lastReviewed')}</TableHead>
                  <TableHead className="text-right">{t('settings.translationCoverage.review.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsReview.map((item, idx) => (
                  <TableRow key={`${item.entityType}-${item.entityId}-${item.language}-${idx}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {item.entityType === 'category' ? t('settings.translationCoverage.missing.category') || 'Category' : t('settings.translationCoverage.missing.value') || 'Value'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.entityKey}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg" title={languageMetadata[item.language as keyof typeof languageMetadata]?.nativeName}>
                          {languageMetadata[item.language as keyof typeof languageMetadata]?.flag}
                        </span>
                        <span className="text-sm">
                          {languageMetadata[item.language as keyof typeof languageMetadata]?.nativeName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.currentLabel}>
                      {item.currentLabel}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(item.lastReviewedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTranslationDialog(item.entityType, item.entityId, item.entityKey)}
                      >
                        {t('settings.translationCoverage.review.reviewButton')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>

      <AddTranslationDialog
        isOpen={dialogState.isOpen}
        onClose={closeTranslationDialog}
        entityType={dialogState.entityType}
        entityId={dialogState.entityId}
        entityKey={dialogState.entityKey}
        onSuccess={handleTranslationSaved}
      />
    </>
  );
};
