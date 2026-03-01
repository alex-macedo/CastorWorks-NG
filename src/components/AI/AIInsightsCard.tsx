import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { AIInsightsTable, parseMarkdownTable } from './AIInsightsTable';
import { AICacheHeader } from './AICacheHeader';
import { useLocalization } from '@/contexts/LocalizationContext';

interface AIInsightsCardProps {
  title: string;
  description: string;
  insights: string | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  onClear?: () => void;
  /** When data exists, show Last Updated + Cached + Refresh */
  cached?: boolean;
  generatedAt?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  title,
  description,
  insights,
  isLoading,
  error,
  onGenerate,
  onClear,
  cached,
  generatedAt,
  onRefresh,
  isRefreshing = false,
}) => {
  const { t } = useLocalization();
  const showCacheHeader = Boolean(insights && onRefresh);

  // Custom renderer for markdown that replaces tables with AIInsightsTable
  const renderInsights = (content: string) => {
    // Split content by code blocks and tables
    const parts: React.ReactNode[] = [];
    let currentText = '';
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this is the start of a table (contains |)
      if (line.includes('|') && !line.trim().startsWith('```')) {
        // Save any accumulated text
        if (currentText.trim()) {
          parts.push(
            <div key={`text-${parts.length}`} className="prose prose-sm max-w-none prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-em:text-card-foreground prose-li:text-card-foreground dark:prose-invert mb-4">
              <ReactMarkdown>{currentText}</ReactMarkdown>
            </div>
          );
          currentText = '';
        }

        // Collect table lines
        const tableLines: string[] = [];
        while (i < lines.length && (lines[i].includes('|') || lines[i].trim() === '')) {
          if (lines[i].trim()) {
            tableLines.push(lines[i]);
          }
          i++;
        }

        // Parse and render table
        const tableData = parseMarkdownTable(tableLines.join('\n'));
        if (tableData) {
          parts.push(
            <AIInsightsTable key={`table-${parts.length}`} rows={tableData} className="mb-4" />
          );
        }
        continue;
      }

      currentText += line + '\n';
      i++;
    }

    // Add any remaining text
    if (currentText.trim()) {
      parts.push(
        <div key={`text-${parts.length}`} className="prose prose-sm max-w-none prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-em:text-card-foreground prose-li:text-card-foreground dark:prose-invert">
          <ReactMarkdown>{currentText}</ReactMarkdown>
        </div>
      );
    }

    return parts.length > 0 ? <>{parts}</> : null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showCacheHeader && onRefresh && (
              <AICacheHeader
                lastUpdated={generatedAt}
                cached={cached}
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
              />
            )}
            {insights && onClear && (
              <Button
                variant="glass-style-dark"
                size="icon"
                onClick={onClear}
                className="h-8 w-8 !rounded-full"
                aria-label={t('common.clear') || 'Clear'}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {insights && !isLoading && (
          <div>
            {renderInsights(insights)}
          </div>
        )}

        {!insights && !isLoading && !error && (
          <p className="text-sm text-muted-foreground">
            {t('ai.insights.emptyState') || 'Click the button below to generate AI-powered insights.'}
          </p>
        )}

        {(!insights || !showCacheHeader) && (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => onGenerate(false)}
              disabled={isLoading}
              variant="glass-style-dark"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t('ai.insights.generating') || 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {insights
                    ? (t('ai.insights.regenerate') || 'Regenerate Insights')
                    : (t('ai.insights.generate') || 'Generate Insights')}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
