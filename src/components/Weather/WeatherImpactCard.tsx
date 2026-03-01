import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, CloudRain, Sun, Wind, Thermometer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';

interface OperationalImpact {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  alertLevel: 'normal' | 'warning' | 'critical';
  recommendations: string[];
  affectedActivities: string[];
  workSuitabilityScore: number;
}

interface DailyWorkSuitability {
  date: string;
  score: number;
  bestFor: string[];
  avoid: string[];
  alerts: string[];
}

interface ActivityRecommendation {
  safe: boolean;
  reason: string;
}

interface WeatherImpactCardProps {
  operationalImpact: OperationalImpact;
  dailyWorkSuitability: DailyWorkSuitability[];
  activityRecommendations: Record<string, ActivityRecommendation>;
}

export const WeatherImpactCard: React.FC<WeatherImpactCardProps> = ({
  operationalImpact,
  dailyWorkSuitability,
  activityRecommendations,
}) => {
  const { t } = useLocalization();
  const { formatShortDate } = useDateFormat();
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Translate activity names
  const translateActivityName = (name: string): string => {
    const normalizedName = name.toLowerCase().replace(/_/g, ' ');
    const translationKey = `weather.workSafetyAnalysis.activities.${name}`;
    const translated = t(translationKey);
    
    // If translation exists and is different from key, use it
    if (translated && translated !== translationKey) {
      return translated;
    }
    
    // Fallback: try normalized name
    const normalizedKey = `weather.workSafetyAnalysis.activities.${normalizedName}`;
    const normalizedTranslated = t(normalizedKey);
    if (normalizedTranslated && normalizedTranslated !== normalizedKey) {
      return normalizedTranslated;
    }
    
    // Final fallback: format the name
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Translate risk level
  const translateRiskLevel = (risk: string): string => {
    return t(`weather.workSafetyAnalysis.riskLevels.${risk}`) || risk.toUpperCase();
  };

  // Translate recommendation text
  const translateRecommendation = (rec: string): string => {
    // Check for "Delay" prefix
    if (rec.startsWith('Delay ')) {
      const activities = rec.replace('Delay ', '').split(' and ');
      const translatedActivities = activities.map(act => translateActivityName(act.trim()));
      return `${t('weather.workSafetyAnalysis.recommendations.delay')} ${translatedActivities.join(', ')}`;
    }
    
    // Check for "Safe for" prefix
    if (rec.startsWith('Safe for ')) {
      const activities = rec.replace('Safe for ', '').split(' and ');
      const translatedActivities = activities.map(act => translateActivityName(act.trim()));
      return `${t('weather.workSafetyAnalysis.recommendations.safeFor')} ${translatedActivities.join(', ')}`;
    }
    
    // Check for "Consider indoor work alternatives"
    if (rec.includes('Consider indoor work alternatives') || rec.includes('indoor work alternatives')) {
      return t('weather.workSafetyAnalysis.recommendations.considerIndoorWork');
    }
    
    return rec;
  };

  // Translate reason text while preserving dynamic values
  const translateReason = (reason: string): string => {
    // Handle multiple reasons separated by semicolons
    if (reason.includes('; ')) {
      return reason.split('; ').map(r => translateReason(r.trim())).join('; ');
    }
    
    // Map common reason patterns to translation keys, preserving values
    if (reason.includes('Temperature too low')) {
      // Extract the value part (e.g., "(25°C < 5°C)")
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.temperatureTooLow')} ${valuePart}`.trim();
    }
    if (reason.includes('Temperature too high')) {
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.temperatureTooHigh')} ${valuePart}`.trim();
    }
    if (reason.includes('Precipitation risk too high')) {
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.precipitationTooHigh')} ${valuePart}`.trim();
    }
    if (reason.includes('Wind too strong')) {
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.windTooStrong')} ${valuePart}`.trim();
    }
    if (reason.includes('Humidity too low')) {
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.humidityTooLow')} ${valuePart}`.trim();
    }
    if (reason.includes('Humidity too high')) {
      const valueMatch = reason.match(/\([^)]+\)/);
      const valuePart = valueMatch ? valueMatch[0] : '';
      return `${t('weather.workSafetyAnalysis.reasons.humidityTooHigh')} ${valuePart}`.trim();
    }
    if (reason.includes('All conditions within safe limits')) {
      return t('weather.workSafetyAnalysis.reasons.allConditionsSafe');
    }
    
    return reason;
  };

  // Translate alert messages
  const translateAlert = (alert: string): string => {
    if (alert.includes('High precipitation risk')) {
      return t('weather.workSafetyAnalysis.alerts.highPrecipitationRisk');
    }
    if (alert.includes('Strong winds expected')) {
      return t('weather.workSafetyAnalysis.alerts.strongWindsExpected');
    }
    if (alert.includes('Frost risk')) {
      return t('weather.workSafetyAnalysis.alerts.frostRisk');
    }
    if (alert.includes('Extreme heat')) {
      return t('weather.workSafetyAnalysis.alerts.extremeHeat');
    }
    
    return alert;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          {t('weather.workSafetyAnalysis.title')}
        </CardTitle>
        <CardDescription>
          {t('weather.workSafetyAnalysis.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Risk Summary */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('weather.workSafetyAnalysis.workSuitabilityScore')}</p>
              <p className={`text-3xl font-bold ${getScoreColor(operationalImpact.workSuitabilityScore)}`}>
                {operationalImpact.workSuitabilityScore}/100
              </p>
            </div>
            <div className="text-right">
              <Badge variant={getRiskBadgeVariant(operationalImpact.overallRisk)} className="text-sm">
                {translateRiskLevel(operationalImpact.overallRisk)} {t('weather.workSafetyAnalysis.risk')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {operationalImpact.recommendations.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold">{t('weather.workSafetyAnalysis.recommendationsLabel')}</h4>
            <ul className="space-y-2">
              {operationalImpact.recommendations.map((rec, index) => {
                const translatedRec = translateRecommendation(rec);
                const isSafe = rec.toLowerCase().includes('safe for') || rec.toLowerCase().includes('safe');
                return (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    {isSafe ? (
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
                    )}
                    <span>{translatedRec}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Activity Safety Matrix */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t('weather.workSafetyAnalysis.activitySafetyStatus')}</h4>
          <div className="grid gap-2">
            <TooltipProvider>
              {Object.entries(activityRecommendations).map(([activity, result]) => (
                <Tooltip key={activity}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between rounded-lg border p-3 cursor-help">
                      <span className="text-sm font-medium">{translateActivityName(activity)}</span>
                      <Badge variant={result.safe ? 'default' : 'destructive'}>
                        {result.safe ? t('weather.workSafetyAnalysis.safe') : t('weather.workSafetyAnalysis.delay')}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">{translateReason(result.reason)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>

        {/* 7-Day Forecast Summary */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t('weather.workSafetyAnalysis.sevenDayWorkSuitability')}</h4>
          <div className="grid grid-cols-7 gap-1">
            {dailyWorkSuitability.slice(0, 7).map((day) => {
              const dayName = formatShortDate(day.date).split(' ')[0]; // Extract day abbreviation
              return (
                <TooltipProvider key={day.date}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center p-2 rounded border cursor-help">
                        <span className="text-xs text-muted-foreground">{dayName}</span>
                        <div className={`w-full h-2 rounded mt-1 ${
                          day.score >= 80 ? 'bg-green-500' :
                          day.score >= 60 ? 'bg-yellow-500' :
                          day.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs font-medium mt-1">{day.score}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">{t('weather.workSafetyAnalysis.score')}: {day.score}/100</p>
                        {day.bestFor.length > 0 && (
                          <p>{t('weather.workSafetyAnalysis.bestFor')}: {day.bestFor.map(act => translateActivityName(act)).join(', ')}</p>
                        )}
                        {day.avoid.length > 0 && (
                          <p className="text-red-400">{t('weather.workSafetyAnalysis.avoid')}: {day.avoid.map(act => translateActivityName(act)).join(', ')}</p>
                        )}
                        {day.alerts.map((alert, i) => (
                          <p key={i} className="text-yellow-400">{translateAlert(alert)}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
