import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, DollarSign, Package, Users, Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

interface CostPredictionCardProps {
  prediction: any;
  isLoading: boolean;
  error: string | null;
  onPredict: () => void;
}

export const CostPredictionCard: React.FC<CostPredictionCardProps> = ({
  prediction,
  isLoading,
  error,
  onPredict,
}) => {
  const { currency } = useLocalization();
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getConfidenceColor = (level: number) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Cost Prediction
        </CardTitle>
        <CardDescription>
          AI-powered cost estimation based on similar projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {prediction && !isLoading && (
          <div className="space-y-6">
            {/* Predicted Cost */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Predicted Total Cost</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(prediction.predictedCost, currency)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-xs text-muted-foreground">{t("aiComponent.confidence")}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${getConfidenceColor(prediction.confidenceLevel)}`}
                        style={{ width: `${prediction.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{prediction.confidenceLevel}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            {prediction.costBreakdown && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="h-4 w-4" />
                  Cost Breakdown
                </h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("commonUI.materials") }</span>
                    </div>
                    <span className="font-medium">{formatCurrency(prediction.costBreakdown.materials, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("aiComponent.labor")}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(prediction.costBreakdown.labor, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t("aiComponent.overhead")}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(prediction.costBreakdown.overhead, currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Key Factors */}
            {prediction.factors && prediction.factors.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">{t("aiComponent.keyCostFactors")}</h4>
                <div className="space-y-2">
                  {prediction.factors.map((factor: any, index: number) => (
                    <div key={index} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{factor.factor}</span>
                            <Badge variant={getImpactColor(factor.impact)} className="text-xs">
                              {factor.impact} impact
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Projects */}
            {prediction.similarProjects && prediction.similarProjects.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">{t("aiComponent.similarProjects")}</h4>
                <div className="space-y-2">
                  {prediction.similarProjects.slice(0, 3).map((project: any, index: number) => (
                    <div key={index} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.type} • {project.totalArea}m²</p>
                          <p className="mt-1 text-xs text-muted-foreground">{project.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(project.budgetTotal, currency)}</p>
                          <p className="text-xs text-muted-foreground">{project.similarity}% match</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4" />
                  AI Recommendations
                </h4>
                <ul className="space-y-2">
                  {prediction.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!prediction && !isLoading && !error && (
          <p className="text-sm text-muted-foreground">
            Generate AI-powered cost predictions based on historical project data.
          </p>
        )}

        <div className="mt-4">
          <Button onClick={onPredict} disabled={isLoading} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {prediction ? 'Regenerate Prediction' : 'Predict Cost'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
