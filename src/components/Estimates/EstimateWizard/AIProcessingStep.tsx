import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Props {
  isProcessing: boolean;
  error?: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

export const AIProcessingStep = ({ isProcessing, error, onRetry, onCancel }: Props) => {
  const { t } = useLocalization();
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const processingStages = [
    { message: t('estimates.processing.stages.analyzing'), progress: 15 },
    { message: t('estimates.processing.stages.researching'), progress: 35 },
    { message: t('estimates.processing.stages.calculating'), progress: 55 },
    { message: t('estimates.processing.stages.generating'), progress: 75 },
    { message: t('estimates.processing.stages.finalizing'), progress: 95 },
  ];

  useEffect(() => {
    if (!isProcessing) {
       
      setCurrentStage(0);
       
      setElapsedTime(0);
      return;
    }

    // Cycle through stages
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < processingStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    // Track elapsed time
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(timeInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Error State
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <div>
              <h3 className="font-semibold text-xl mb-2">{t('estimates.processing.error.title')}</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={onRetry} size="lg">
                {t('estimates.processing.error.tryAgain')}
              </Button>
              <Button variant="outline" onClick={onCancel} size="lg">
                {t('estimates.processing.error.goBack')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success State (if not processing and no error)
  if (!isProcessing && !error) {
    return (
      <Card className="border-green-500">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div>
              <h3 className="font-semibold text-xl mb-2">{t('estimates.processing.success.title')}</h3>
              <p className="text-muted-foreground">
                {t('estimates.processing.success.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processing State
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>

          {/* Status Message */}
          <div>
            <h3 className="font-semibold text-xl mb-2">{t('estimates.processing.title')}</h3>
            <p className="text-muted-foreground animate-pulse">
              {processingStages[currentStage].message}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md space-y-2">
            <Progress value={processingStages[currentStage].progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('estimates.processing.progressComplete', { percent: processingStages[currentStage].progress })}</span>
              <span>{t('estimates.processing.elapsedTime', { seconds: elapsedTime })}</span>
            </div>
          </div>

          {/* Processing Details */}
          <div className="bg-muted/50 p-4 rounded-lg w-full max-w-md">
            <div className="flex items-start gap-3 text-sm text-left">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStage >= 0 ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={currentStage >= 0 ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('estimates.processing.stagesList.projectAnalysis')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStage >= 1 ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={currentStage >= 1 ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('estimates.processing.stagesList.materialPricing')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStage >= 2 ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={currentStage >= 2 ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('estimates.processing.stagesList.laborCalculations')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStage >= 3 ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={currentStage >= 3 ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('estimates.processing.stagesList.lineItemGeneration')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStage >= 4 ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={currentStage >= 4 ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('estimates.processing.stagesList.finalization')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated Time */}
          <p className="text-sm text-muted-foreground">
            {t('estimates.processing.estimatedTime')}
          </p>

          {/* Cancel Button */}
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('estimates.processing.cancelButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
