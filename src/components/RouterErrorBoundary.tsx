import { Component, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'router' | 'chunk' | 'unknown';
}

/**
 * Check if an error is a chunk/module load error (happens after deployments with stale cache)
 */
function isChunkLoadError(error: Error): boolean {
  const message = error.message || '';
  return (
    error.name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('Importing a module script failed') ||
    message.includes('Failed to load module script')
  );
}

/**
 * Check if an error is a Router context error
 */
function isRouterContextError(error: Error): boolean {
  const message = error.message || '';
  return (
    message.includes('useContext') ||
    message.includes('Router') ||
    message.includes('navigate')
  );
}

/**
 * Error boundary for catching Router context errors and chunk load failures.
 * 
 * Handles:
 * 1. Router context errors - when components try to use Router hooks before context is available
 * 2. Chunk load errors - when a new deployment has invalidated old chunk filenames
 */
class RouterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a chunk load error
    if (isChunkLoadError(error)) {
      return { hasError: true, error, errorType: 'chunk' };
    }
    
    // Check if this is a Router context error
    if (isRouterContextError(error)) {
      return { hasError: true, error, errorType: 'router' };
    }
    
    // Re-throw other errors to be caught by parent error boundaries
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorType = this.state.errorType;
    console.error('[RouterErrorBoundary] Caught error:', {
      type: errorType,
      error,
      errorInfo
    });
    
    // Log to server
    logger.error(`[RouterErrorBoundary] Caught ${errorType} error: ${error.message}`, {
      errorType,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // For router errors, attempt auto-recovery by reloading
    if (this.state.errorType === 'router') {
      setTimeout(() => {
        console.log('[RouterErrorBoundary] Attempting recovery by reloading page...');
        window.location.reload();
      }, 1000);
    }
    
    // For chunk errors, we let the user decide to refresh manually
    // This prevents infinite reload loops
  }

  handleRefresh = () => {
    // Clear any stale sessionStorage flags
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('retry-')) {
        sessionStorage.removeItem(key);
      }
    });
    // Hard reload to bypass cache
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Chunk load error UI - more informative with manual refresh
      if (this.state.errorType === 'chunk') {
        return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6 text-center px-4 max-w-md">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-amber-600 dark:text-amber-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Update Available
                </h2>
                <p className="text-sm text-muted-foreground">
                  A new version of CastorWorks has been deployed. Please refresh the page to load the latest version.
                </p>
              </div>
              
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Refresh Page
              </button>
              
              <p className="text-xs text-muted-foreground">
                If this keeps happening, try clearing your browser cache.
              </p>
            </div>
          </div>
        );
      }
      
      // Router error UI - with auto-reload spinner
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Loading application...
            </p>
            <p className="text-xs text-muted-foreground">
              If this persists, please clear your browser cache
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that validates Router context is available
 */
export const RouterContextGuard = ({ children }: { children: ReactNode }) => {
  // This will throw if Router context is not available
  try {
    useNavigate();
    useLocation();
  } catch (error) {
    console.error('[RouterContextGuard] Router context not available:', error);
    throw error;
  }

  return <>{children}</>;
};

export default RouterErrorBoundary;
