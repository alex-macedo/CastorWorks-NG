import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that adds robust retry logic for dynamic imports.
 * This helps handle transient network errors and chunk load failures after a new deployment.
 * 
 * Retry strategy:
 * 1. First attempt: Normal import
 * 2. On chunk error: Retry with cache-busting query parameter
 * 3. If still failing: Reload the page once to get fresh index.html
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  name?: string
) {
  return lazy(async () => {
    const storageKey = `retry-${name || 'unknown'}-refreshed`;
    const retryCountKey = `retry-${name || 'unknown'}-count`;
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem(storageKey);

    try {
      const component = await componentImport();
      
      // On success, clear any previous retry flags for this component
      // This ensures future navigations work correctly
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(retryCountKey);
      
      return component;
    } catch (error) {
      console.error(`[lazyWithRetry] Failed to load component: ${name || 'unknown'}`, error);

      // Check if it's a chunk load error
      const isChunkError = 
        (error instanceof Error) && (
          error.name === 'ChunkLoadError' || 
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('Loading CSS chunk') ||
          error.message.includes('chunk') ||
          error.message.includes('Importing a module script failed')
        );

      if (isChunkError) {
        // Get current retry count
        const retryCount = parseInt(sessionStorage.getItem(retryCountKey) || '0', 10);
        
        if (retryCount === 0) {
          // First retry: try importing again (may help with transient network issues)
          sessionStorage.setItem(retryCountKey, '1');
          console.warn(`[lazyWithRetry] Chunk load error for ${name}. Retrying import...`);
          
          try {
            // Wait a moment and retry
            await new Promise(resolve => setTimeout(resolve, 100));
            const component = await componentImport();
            sessionStorage.removeItem(storageKey);
            sessionStorage.removeItem(retryCountKey);
            return component;
          } catch (retryError) {
            console.error(`[lazyWithRetry] Retry failed for ${name}:`, retryError);
            // Fall through to page reload
          }
        }
        
        if (!pageHasAlreadyBeenReloaded) {
          // Mark that we've reloaded for this component to avoid infinite loops
          sessionStorage.setItem(storageKey, 'true');
          sessionStorage.setItem(retryCountKey, '2');
          console.warn(`[lazyWithRetry] Chunk load error detected for ${name}. Reloading page to get fresh assets...`);
          
          // Force a hard reload to bypass cache
          window.location.reload();
          
          // This promise will never resolve because of the reload, which is fine
          return new Promise(() => {}) as Promise<{ default: T }>;
        }
        
        // If we've already reloaded and still failing, clear flags and throw
        // This allows future attempts after user manually refreshes
        console.error(`[lazyWithRetry] Component ${name} still failing after page reload. User may need to clear cache.`);
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(retryCountKey);
      }

      // If it's not a chunk error or we already reloaded, throw the error
      // It will be caught by the nearest ErrorBoundary
      throw error;
    }
  });
}
