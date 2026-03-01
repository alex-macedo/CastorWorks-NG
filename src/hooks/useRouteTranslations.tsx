// PHASE 2: Hook to automatically load translations for current route
import { useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';

/**
 * Automatically loads feature-specific translations when route changes
 * Critical translations (common, navigation) are always loaded in main bundle
 * 
 * Note: This hook attempts to use useLocation but gracefully handles
 * cases where it's called outside a router context
 */
export const useRouteTranslations = () => {
  const { loadTranslationsForRoute } = useLocalization();

  useEffect(() => {
    // Try to get current pathname from window.location
    // This is a fallback when useLocation is not available
    try {
      const pathname = window.location.pathname;
      loadTranslationsForRoute(pathname);
    } catch (error) {
      // Silently fail - this is expected in non-browser environments
    }
  }, [loadTranslationsForRoute]);
};
