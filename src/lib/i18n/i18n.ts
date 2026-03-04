import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { criticalTranslations } from '@/locales/critical';
import type { Language } from '@/contexts/LocalizationContext';

/**
 * Get initial language synchronously from localStorage cache
 * Falls back to browser language detection for first-time users
 *
 * This MUST be synchronous to avoid "English flash" on first render
 */
const getInitialLanguage = (): Language => {
  try {
    // Priority 1: Read from localStorage cache (instant, synchronous)
    // Check if localStorage is available and functional (not available in Node.js/test environments)
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
      const cached = localStorage.getItem('user-preferences-cache');
      if (cached) {
        const prefs = JSON.parse(cached);
        if (prefs.language && ['pt-BR', 'en-US', 'es-ES', 'fr-FR'].includes(prefs.language)) {
          console.debug('i18next: Using cached language from localStorage:', prefs.language);
          return prefs.language as Language;
        }
      }
    }
  } catch (e) {
    console.error('i18next: Failed to read language from cache:', e);
  }

  // Priority 2: Detect browser language for first-time users
  const browserLanguage = detectBrowserLanguage();
  console.debug('i18next: Using detected browser language:', browserLanguage);
  return browserLanguage;
};

/**
 * Detect browser language and map to supported languages
 */
const detectBrowserLanguage = (): Language => {
  // Handle Node.js/test environments where navigator is not available
  let browserLang = 'en-US';
  if (typeof navigator !== 'undefined' && navigator) {
    browserLang = navigator.language || navigator.languages?.[0] || 'en-US';
  }

  // Map browser language codes to our supported languages
  const langMap: Record<string, Language> = {
    'en': 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-US',
    'pt': 'pt-BR',
    'pt-BR': 'pt-BR',
    'pt-PT': 'pt-BR',
    'es': 'es-ES',
    'es-ES': 'es-ES',
    'es-MX': 'es-ES',
    'es-AR': 'es-ES',
    'fr': 'fr-FR',
    'fr-FR': 'fr-FR',
    'fr-CA': 'fr-FR',
  };

  // Try exact match first
  if (langMap[browserLang]) {
    return langMap[browserLang];
  }

  // Try language code without region (e.g., "pt" from "pt-BR")
  const langCode = browserLang.split('-')[0];
  if (langMap[langCode]) {
    return langMap[langCode];
  }

  // Default to English if no match
  return 'en-US';
};

/**
 * Convert critical translations format to i18next resources format
 *
 * From: { 'en-US': { common: {...}, navigation: {...} } }
 * To:   { 'en-US': { common: {...}, navigation: {...} } }
 *
 * (Structure is actually the same, but we validate and type it properly)
 */
const buildResources = () => {
  const resources: Record<string, Record<string, any>> = {};

  const languages: Language[] = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

  for (const lang of languages) {
    resources[lang] = criticalTranslations[lang];
  }

  return resources;
};

// Initialize i18next and export the initialization promise
export const i18nInitPromise = i18n
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: buildResources(),

    // Language settings
    lng: getInitialLanguage(), // Initial language (synchronous)
    fallbackLng: 'en-US',
    supportedLngs: ['en-US', 'pt-BR', 'es-ES', 'fr-FR'],

    // Namespace settings
    defaultNS: 'common',
    ns: [
      'common', 
      'navigation', 
      'topBar', 
      'auth', 
      'ai', 
      'aiProviders',
      'accessibility', 
      'estimates', 
      'proposals', 
      'supervisor', 
      'dashboard', 
      'projects', 
      'clients', 
      'financial', 
      'reports', 
      'settings', 
      'projectDetail',
      'projectCalendar',
      'procurement', 
      'materials', 
      'admin', 
      'taskManagement', 
      'payments', 
      'notifications', 
      'templates', 
      'budgets', 
      'architect',
      'clientPortal',
      'clientReport',
      'customerPortal',
      'documentation',
      'maintenance',
      'obras',
      'roadmap',
      'roadmapAnalytics',
      'aiInsights',
      'analytics',
      'approvals',
      'budget',
      'campaigns',
      'clientAccess',
      'cliente',
      'constructionActivities',
      'contacts',
      'documents',
      'financialInvoice',
      'notFound',
      'overallStatus',
      'pages',
      'phases',
      'phaseTemplates',
      'projectPhases',
      'projectsTimeline',
      'timeline',
      'projectWbsTemplates',
      'purchaseRequest',
      'schedule',
      'suppliers',
      'contentHub',
      'forms',
      'annotations',
      'email',
      'logistics',
      'subscription',
      'trial'
    ],

    // Interpolation settings (match current behavior)
    interpolation: {
      escapeValue: false, // React already escapes by default
      prefix: '{{',       // Use {{variable}} format (i18next default)
      suffix: '}}',
    },

    // Missing key handling
    saveMissing: false,
    missingKeyHandler: (lngs, ns, key) => {
      console.warn(`i18next: Missing translation key: ${ns}.${key} for languages: ${lngs.join(', ')}`);
    },

    // React-specific settings
    react: {
      useSuspense: true, // Enable Suspense to wait for translations to load
    },

    // Debug mode (disable in production)
    debug: false,

    // Key separator (use dot notation like current system)
    keySeparator: '.',

    // Namespace separator (use colon for explicit namespace)
    nsSeparator: ':',
  })
  .then(() => {
    console.log('i18next: Initialized with language:', i18n.language);
    console.log('i18next: Loaded namespaces:', i18n.options.ns);
    console.log('i18next: Has resources for', i18n.language, '?', i18n.hasResourceBundle(i18n.language, 'common'));

    // Verify all critical namespaces are loaded
    const criticalNS = ['common', 'navigation', 'topBar', 'auth', 'dashboard'];
    criticalNS.forEach(ns => {
      const hasBundle = i18n.hasResourceBundle(i18n.language, ns);
      console.log(`i18next: Namespace "${ns}" loaded:`, hasBundle);
      if (hasBundle) {
        const sampleKey = ns === 'common' ? 'loading' : 'title';
        const translation = i18n.t(`${ns}:${sampleKey}`);
        console.log(`i18next: Sample translation ${ns}:${sampleKey} =`, translation);
      }
    });
  });

export default i18n;
