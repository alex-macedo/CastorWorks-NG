/**
 * AIInsightPanel - Configurable AI Insight Display Component
 *
 * Reusable component for displaying AI-generated insights with:
 * - Formatted markdown content
 * - Confidence level indicator
 * - Refresh button
 * - User feedback collection
 * - Collapsible design
 * - Auto-refresh support
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/useDateFormat';

import { useLocalization } from "@/contexts/LocalizationContext";
export interface AIInsightPanelProps {
  title: string;
  description?: string;
  insight?: {
    content: any; // Can be markdown string or structured data
    confidenceLevel?: number;
    generatedAt?: string;
    domain?: string;
    insightType?: string;
  } | null;
  isLoading: boolean;
  error?: string | null;
  onGenerate?: () => void;
  onClear?: () => void;
  onFeedback?: (helpful: boolean, comment?: string) => void;
  refreshInterval?: number; // Auto-refresh in seconds (0 = disabled)
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showFeedback?: boolean;
  className?: string;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  title,
  description,
  insight,
  isLoading,
  error,
  onGenerate,
  onClear,
  onFeedback,
  refreshInterval = 0,
  collapsible = false,
  defaultCollapsed = false,
  showFeedback = true,
  className,
}) => {
  const { formatDateTime } = useDateFormat();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Auto-refresh logic
  useEffect(() => {
    if (refreshInterval > 0 && onGenerate && !isLoading) {
      const interval = setInterval(() => {
        console.log(`Auto-refreshing insight: ${title}`);
        onGenerate();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, onGenerate, isLoading, title]);

  const handleFeedback = (helpful: boolean) => {
    if (onFeedback) {
      onFeedback(helpful);
      setFeedbackGiven(true);
      setTimeout(() => setFeedbackGiven(false), 3000); // Reset after 3s
    }
  };

  const getConfidenceColor = (level: number) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceBadge = (level: number) => {
    if (level >= 80) return { variant: 'default' as const, text: '{t("aiComponent.highConfidence")}' };
    if (level >= 60) return { variant: 'secondary' as const, text: '{t("aiComponent.mediumConfidence")}' };
    return { variant: 'outline' as const, text: '{t("aiComponent.lowConfidence")}' };
  };

  // Render insight content (supports markdown or structured data)
  const renderContent = () => {
    if (typeof insight?.content === 'string') {
      return (
        <div className="prose prose-sm max-w-none prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-em:text-card-foreground prose-li:text-card-foreground dark:prose-invert">
          <ReactMarkdown>{insight.content}</ReactMarkdown>
        </div>
      );
    } else if (insight?.content) {
      // Structured data - render as JSON or custom format
      return (
        <div className="space-y-2">
          {Object.entries(insight.content).map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3">
              <p className="text-sm font-medium capitalize">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-muted-foreground">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {title}
              {insight?.confidenceLevel && (
                <Badge variant={getConfidenceBadge(insight.confidenceLevel).variant}>
                  {getConfidenceBadge(insight.confidenceLevel).text}
                </Badge>
              )}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
            {insight?.generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {formatDateTime(insight.generatedAt)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {collapsible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
            {insight && onClear && (
              <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Confidence Progress Bar */}
        {insight?.confidenceLevel !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("ui.confidenceLevel")}</span>
              <span>{insight.confidenceLevel}%</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${getConfidenceColor(
                  insight.confidenceLevel
                )}`}
                style={{ width: `${insight.confidenceLevel}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Insight Content */}
          {insight && !isLoading && !error && <div className="mb-4">{renderContent()}</div>}

          {/* Empty State */}
          {!insight && !isLoading && !error && onGenerate && (
            <p className="text-sm text-muted-foreground">
              Click the button below to generate AI-powered insights.
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {onGenerate && (
              <Button onClick={onGenerate} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {insight ? 'Regenerate' : 'Generate Insights'}
                  </>
                )}
              </Button>
            )}

            {/* Feedback Buttons */}
            {showFeedback && insight && !feedbackGiven && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("aiComponent.wasThisHelpful")}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(true)}
                  className="gap-1"
                >
                  👍 Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(false)}
                  className="gap-1"
                >
                  👎 No
                </Button>
              </div>
            )}

            {/* Feedback Confirmation */}
            {feedbackGiven && (
              <Badge variant="secondary" className="gap-1">
                ✓ Thank you for your feedback!
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
