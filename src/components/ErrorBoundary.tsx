import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalizationContext } from "@/contexts/LocalizationContext";
import { logger } from "@/lib/logger";

type State = { hasError: boolean; error?: Error };
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// ErrorDisplay component that uses hooks for translations with fallback
const FALLBACK_TRANSLATIONS: Record<string, string> = {
  'common.error.somethingWentWrong': 'Something Went Wrong',
  'common.error.unexpectedError': 'An unexpected error occurred. Please try refreshing the page or return to the home page.',
  'common.error.refreshPage': 'Refresh Page',
  'common.error.goToHome': 'Go to Home',
  'common.error.technicalDetails': 'Technical Details',
  'common.errorTitle': 'Error',
  'common.error': 'Error',
  'common.error.unknownError': 'Unknown error occurred',
  'common.error.noStackTrace': 'No stack trace available',
};

const ErrorDisplay: React.FC<{ error?: Error }> = ({ error }) => {
  // Avoid reading LocalizationContext here because ErrorBoundary is mounted
  // above the application provider tree and attempting to consume the
  // context could result in usage before the provider is available.
  // Use a local fallback map to render user-facing strings reliably.
  const t = (key: string) => FALLBACK_TRANSLATIONS[key] || key;

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t('common.error.somethingWentWrong')}</CardTitle>
          <CardDescription className="text-base">
            {t('common.error.unexpectedError')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleReload}
              className="gap-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.error.refreshPage')}
            </Button>
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <Home className="h-4 w-4" />
              {t('common.error.goToHome')}
            </Button>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('common.error.technicalDetails')}
            </summary>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold text-foreground mb-2">
                {error?.name || t('common.errorTitle')}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {error?.message || t('common.error.unknownError')}
              </p>
              <pre className="text-xs text-muted-foreground bg-background p-3 rounded overflow-auto max-h-60 border border-border">
                {error?.stack || t('common.error.noStackTrace')}
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    console.log("[ErrorBoundary] Initialized");
  }

  static getDerivedStateFromError(error: Error) {
    console.error("[ErrorBoundary] Error caught:", error);
    
    // Check if this is a chunk load error (dynamic import failure)
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('chunk') ||
      error.message?.includes('dynamic import');

    if (isChunkError) {
      console.warn("[ErrorBoundary] Chunk load error detected. Attempting automatic reload...");
      // Check if we've already tried to reload to avoid infinite loops
      const hasReloaded = sessionStorage.getItem('last-chunk-error-reload');
      const now = Date.now();
      
      // Only reload if we haven't reloaded in the last 10 seconds
      if (!hasReloaded || now - parseInt(hasReloaded) > 10000) {
        sessionStorage.setItem('last-chunk-error-reload', now.toString());
        window.location.reload();
        return { hasError: false }; // Prevent rendering error UI while reloading
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
    console.error("[ErrorBoundary] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    logger.error(`[ErrorBoundary] ${error.name}: ${error.message}`, {
      stack: error.stack,
      componentStack: info.componentStack,
      name: error.name
    });
  }

  render() {
    if (this.state.hasError) {
      console.error("[ErrorBoundary] Rendering error UI");
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
