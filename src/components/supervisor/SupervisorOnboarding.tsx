import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Truck, 
  PlusCircle, 
  CheckSquare, 
  Camera,
  TrendingUp,
  Zap,
  User,
  ChevronRight,
  ChevronLeft,
  X
} from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  description: string;
  icon: any;
  highlightSelector?: string;
  position?: 'top' | 'bottom' | 'center';
}

interface SupervisorOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function SupervisorOnboarding({ onComplete, onSkip }: SupervisorOnboardingProps) {
  const { t } = useLocalization();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      title: t("supervisor.onboarding.welcome"),
      description: t("supervisor.onboarding.welcomeDesc"),
      icon: Home,
      position: 'center'
    },
    {
      title: t("supervisor.onboarding.statsCarousel"),
      description: t("supervisor.onboarding.statsCarouselDesc"),
      icon: TrendingUp,
      position: 'top'
    },
    {
      title: t("supervisor.onboarding.quickActions"),
      description: t("supervisor.onboarding.quickActionsDesc"),
      icon: Zap,
      position: 'center'
    },
    {
      title: t("supervisor.onboarding.bottomNav"),
      description: t("supervisor.onboarding.bottomNavDesc"),
      icon: Home,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.bottomNavHub"),
      description: t("supervisor.onboarding.bottomNavHubDesc"),
      icon: Home,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.bottomNavDeliveries"),
      description: t("supervisor.onboarding.bottomNavDeliveriesDesc"),
      icon: Truck,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.bottomNavReport"),
      description: t("supervisor.onboarding.bottomNavReportDesc"),
      icon: PlusCircle,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.bottomNavInspect"),
      description: t("supervisor.onboarding.bottomNavInspectDesc"),
      icon: CheckSquare,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.bottomNavPhotos"),
      description: t("supervisor.onboarding.bottomNavPhotosDesc"),
      icon: Camera,
      position: 'bottom'
    },
    {
      title: t("supervisor.onboarding.profileMenu"),
      description: t("supervisor.onboarding.profileMenuDesc"),
      icon: User,
      position: 'top'
    },
    {
      title: t("supervisor.onboarding.complete"),
      description: t("supervisor.onboarding.completeDesc"),
      icon: CheckSquare,
      position: 'center'
    }
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  if (!isVisible) return null;

  const Icon = currentStepData.icon;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[100] animate-fade-in"
        onClick={handleSkip}
      />

      {/* Onboarding Card */}
      <div
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-[101] w-[90%] max-w-md animate-scale-in",
          currentStepData.position === 'top' && "top-24",
          currentStepData.position === 'center' && "top-1/2 -translate-y-1/2",
          currentStepData.position === 'bottom' && "bottom-28"
        )}
      >
        <Card className="border-2 border-primary shadow-2xl shadow-primary/20">
          <CardContent className="p-6 space-y-4">
            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("ariaLabels.closeOnboarding")}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">{currentStepData.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 pt-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === currentStep 
                      ? "w-8 bg-primary" 
                      : "w-2 bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 h-12"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  {t("supervisor.onboarding.previous")}
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="flex-1 h-12"
              >
                {isLastStep ? (
                  <>
                    {t("supervisor.onboarding.getStarted")}
                    <CheckSquare className="h-5 w-5 ml-2" />
                  </>
                ) : (
                  <>
                    {t("supervisor.onboarding.next")}
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip Button */}
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
              >
                {t("supervisor.onboarding.skip")}
              </button>
            )}

            {/* Step Counter */}
            <p className="text-center text-xs text-muted-foreground">
              {t("supervisor.onboarding.step")} {currentStep + 1} {t("supervisor.onboarding.of")} {steps.length}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
