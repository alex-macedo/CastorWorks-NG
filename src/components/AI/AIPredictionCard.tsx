/**
 * AIPredictionCard - Generic AI Prediction Display Component
 *
 * Reusable component for displaying AI predictions with:
 * - Predicted value with confidence indicator
 * - Comparison chart (predicted vs. historical)
 * - Trend indicator
 * - Expandable details section
 * - Color-coded confidence levels
 * - Flexible for cost, duration, risk, or other predictions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useLocalization } from "@/contexts/LocalizationContext";

export interface Comparison {
  label: string;
  value: number;
  description?: string;
}

export interface Factor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface AIPredictionCardProps {
  title: string;
  description?: string;
  predictionType: 'cost' | 'duration' | 'risk' | 'custom';
  predictedValue: number;
  confidenceLevel: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  comparisons?: Comparison[];
  factors?: Factor[];
  details?: React.ReactNode;
  onViewDetails?: () => void;
  formatValue?: (value: number) => string;
  className?: string;
}

export const AIPredictionCard: React.FC<AIPredictionCardProps> = ({
  title,
  description,
  predictionType,
  predictedValue,
  confidenceLevel,
  unit,
  trend = 'stable',
  comparisons = [],
  factors = [],
  details,
  onViewDetails,
  formatValue,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLocalization();

  const getConfidenceColor = (level: number) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getConfidenceBadge = (level: number) => {
    if (level >= 80) return { variant: 'default' as const, text: t('aiComponent.highConfidence') };
    if (level >= 60) return { variant: 'secondary' as const, text: t('aiComponent.mediumConfidence') };
    return { variant: 'outline' as const, text: t('aiComponent.lowConfidence') };
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = () => {
    switch (trend) {
      case 'up':
        return { variant: 'default' as const, text: t('aiComponent.increasing') };
      case 'down':
        return { variant: 'destructive' as const, text: t('aiComponent.decreasing') };
      default:
        return { variant: 'secondary' as const, text: t('aiComponent.stable') };
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDisplayValue = (value: number): string => {
    if (formatValue) {
      return formatValue(value);
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  const getPredictionIcon = () => {
    return <Sparkles className="h-5 w-5 text-primary" />;
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {getPredictionIcon()}
              {title}
            </CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          <Badge variant={getConfidenceBadge(confidenceLevel).variant}>
            {getConfidenceBadge(confidenceLevel).text} {t('aiComponent.confidence')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Prediction Value */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{t('aiComponent.predicted')} {title}</p>
              <p className="text-3xl font-bold text-primary">
                {formatDisplayValue(predictedValue)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Trend Badge */}
              <Badge variant={getTrendBadge().variant} className="gap-1">
                {getTrendIcon()}
                {getTrendBadge().text}
              </Badge>

              {/* Confidence Progress */}
              <div className="w-32">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t("ui.confidence")}</span>
                  <span>{confidenceLevel}%</span>
                </div>
                <Progress value={confidenceLevel} className="h-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        {comparisons.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">{t("aiComponent.comparisons")}</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {comparisons.map((comparison, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">
                              {comparison.label}
                            </span>
                            {comparison.description && (
                              <Info className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {comparison.description && (
                          <TooltipContent>
                            <p className="text-xs">{comparison.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <span className="font-medium">{formatDisplayValue(comparison.value)}</span>
                  </div>
                  {/* Variance */}
                  {comparison.value !== predictedValue && (
                    <div className="mt-1 flex items-center gap-1">
                      {comparison.value < predictedValue ? (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-green-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {Math.abs(
                          Math.round(((predictedValue - comparison.value) / comparison.value) * 100)
                        )}
                        % {comparison.value < predictedValue ? t('aiComponent.higher') : t('aiComponent.lower')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Factors */}
        {factors.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">{t("aiComponent.keyFactors")}</h4>
            <div className="space-y-2">
              {factors.map((factor, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{factor.name}</span>
                    <Badge variant={getImpactColor(factor.impact)} className="text-xs">
                      {factor.impact} {t('aiComponent.impact')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        {details && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  {t('aiComponent.hideDetails')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  {t('aiComponent.showDetails')}
                </>
              )}
            </Button>
            {isExpanded && <div className="mt-3 rounded-lg border p-4">{details}</div>}
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <Button onClick={onViewDetails} variant="outline" className="w-full gap-2">
            <Info className="h-4 w-4" />
            {t('aiComponent.viewFullAnalysis')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
