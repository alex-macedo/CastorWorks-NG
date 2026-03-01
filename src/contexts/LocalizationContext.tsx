import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ROUTE_NAMESPACE_MAP, FEATURE_NAMESPACES, type FeatureNamespace } from '@/locales/critical';
import { trackMissingKey } from '@/utils/translationGenerator';

export type Language = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
export type Currency = 'BRL' | 'USD' | 'EUR';
export type TimeZone = 'America/Sao_Paulo' | 'America/New_York' | 'Europe/London' | 'Asia/Tokyo';
export type TemperatureUnit = 'C' | 'F';
export type NumberFormat = 'compact' | 'full';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';

export const languageMetadata = {
  'en-US': { flag: '🇺🇸', nativeName: 'English (US)' },
  'pt-BR': { flag: '🇧🇷', nativeName: 'Português (BR)' },
  'es-ES': { flag: '🇪🇸', nativeName: 'Español (ES)' },
  'fr-FR': { flag: '🇫🇷', nativeName: 'Français (FR)' },
};

interface LocalizationSettings {
  language: Language;
  currency: Currency;
  timeZone: TimeZone;
  weatherLocation: string;
  temperatureUnit: TemperatureUnit;
  numberFormat: NumberFormat;
  dateFormat: DateFormat;
}

type TranslationVariables = Record<string, string | number>;

interface LocalizationContextType {
  language: Language;
  currency: Currency;
  timeZone: TimeZone;
  weatherLocation: string;
  temperatureUnit: TemperatureUnit;
  numberFormat: NumberFormat;
  dateFormat: DateFormat;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  setTimeZone: (timezone: TimeZone) => void;
  setWeatherLocation: (location: string) => void;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setNumberFormat: (format: NumberFormat) => void;
  setDateFormat: (dateFormat: DateFormat) => void;
  updateSettings: (settings: Partial<LocalizationSettings>) => void;
  t: (key: string, defaultValueOrVariables?: string | TranslationVariables, variables?: TranslationVariables) => string;
  loadTranslationsForRoute: (route: string) => void;
}

const defaultSettings: LocalizationSettings = {
  language: (i18n.language as Language) || 'en-US',
  currency: 'USD',
  timeZone: 'America/New_York',
  weatherLocation: 'New York, USA',
  temperatureUnit: 'F',
  numberFormat: 'compact',
  dateFormat: 'DD/MM/YYYY', // Use DD/MM/YYYY as default to match system preferences
};

const createDefaultContext = (): LocalizationContextType => ({
  language: (i18n.language as Language) || 'en-US',
  currency: 'USD',
  timeZone: 'America/New_York',
  weatherLocation: 'New York, USA',
  temperatureUnit: 'F',
  numberFormat: 'compact',
  dateFormat: 'DD/MM/YYYY', // Use DD/MM/YYYY as default to match system preferences
  setLanguage: () => {},
  setCurrency: () => {},
  setTimeZone: () => {},
  setWeatherLocation: () => {},
  setTemperatureUnit: () => {},
  setNumberFormat: () => {},
  setDateFormat: () => {},
  updateSettings: () => {},
  t: (key: string, def?: string | TranslationVariables) => typeof def === 'string' ? def : key,
  loadTranslationsForRoute: () => {},
});

export const LocalizationContext = createContext<LocalizationContextType>(createDefaultContext());

const defer = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
};

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const { preferences, isLoading: prefsLoading, updatePreferences } = useUserPreferences();
  const { settings: appSettings, isLoading: appSettingsLoading } = useAppSettings();
  const updatePreferencesMutate = updatePreferences.mutate;
  const updatePreferencesMutateRef = useRef(updatePreferencesMutate);
  const hasInitializedLanguage = useRef(false);
  const isManualLanguageChange = useRef(false); // Track manual language changes

  // Use react-i18next's useTranslation hook
  const { t: i18nextT, i18n: i18nInstance } = useTranslation();
  const i18nInstanceRef = useRef(i18nInstance);

  const [settings, setSettings] = useState<LocalizationSettings>(defaultSettings);
  const [loadedNamespaces, setLoadedNamespaces] = useState<Set<string>>(new Set());
  const [loadingNamespaces, setLoadingNamespaces] = useState<Set<string>>(new Set());

  const loadedNamespacesRef = useRef<Set<string>>(new Set());
  const loadingNamespacesRef = useRef<Set<string>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    updatePreferencesMutateRef.current = updatePreferences.mutate;
    i18nInstanceRef.current = i18nInstance;
  }, [updatePreferences.mutate, i18nInstance]);

  // Sync refs with state
  useEffect(() => {
    loadedNamespacesRef.current = loadedNamespaces;
  }, [loadedNamespaces]);

  useEffect(() => {
    loadingNamespacesRef.current = loadingNamespaces;
  }, [loadingNamespaces]);

  // Ref to track settings for use in callbacks without creating dependencies
  const settingsRef = useRef<LocalizationSettings>(defaultSettings);

  // Keep settingsRef in sync with settings state
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Listen for i18next language changes and update local state
  // CRITICAL: Only update settings if this was NOT a manual change we initiated
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // Skip updating settings if this language change was triggered by our own setLanguage call
      // The settingsRef will be updated via the useEffect that syncs settings state below
      if (!isManualLanguageChange.current) {
        console.log('⚙️ [LocalizationContext] languageChanged event (external):', lng);
        setSettings(prev => ({
          ...prev,
          language: lng as Language,
        }));
      } else {
        console.log('⚙️ [LocalizationContext] languageChanged event (IGNORED - manual change):', lng);
      }
    };

    const instance = i18nInstanceRef.current;
    instance.on('languageChanged', handleLanguageChange);

    return () => {
      instance.off('languageChanged', handleLanguageChange);
    };
  }, []);

  // Sync settings from database preferences (only on initial load or when preferences change)
  useEffect(() => {
    // Skip if this is a manual language change in progress
    if (isManualLanguageChange.current) {
      console.log('🔄 [LocalizationContext] Skipping sync - manual language change in progress');
      return;
    }

    if (preferences && !prefsLoading && !appSettingsLoading && appSettings) {
      hasInitializedLanguage.current = true;
      const newLanguage = (preferences.language as Language) || defaultSettings.language;

      console.log('🔄 [LocalizationContext] Syncing from database preferences:', {
        dbLanguage: preferences.language,
        newLanguage,
        currentState: settingsRef.current.language,
        manualChangeFlag: isManualLanguageChange.current,
      });

       const newSettings = {
         language: newLanguage,
         currency: (preferences.currency as Currency)
           || (appSettings.system_currency as Currency)
           || defaultSettings.currency,
         timeZone: (preferences.time_zone as TimeZone)
           || (appSettings.system_time_zone as TimeZone)
           || defaultSettings.timeZone,
         weatherLocation: preferences.weather_location || appSettings.system_weather_location || defaultSettings.weatherLocation,
         temperatureUnit: (preferences.temperature_unit as TemperatureUnit)
           || (appSettings.system_temperature_unit as TemperatureUnit)
           || defaultSettings.temperatureUnit,
         numberFormat: (preferences.number_format as NumberFormat)
           || (appSettings.system_number_format as NumberFormat)
           || defaultSettings.numberFormat,
          dateFormat: (preferences.date_format as DateFormat)
            || (appSettings.system_date_format as DateFormat)
            || defaultSettings.dateFormat,
       };

      setSettings(newSettings);

      // Sync language to i18next if it's different
      if (i18nInstanceRef.current.language !== newLanguage) {
        console.log('🔄 [LocalizationContext] Changing i18next language to:', newLanguage);
        i18nInstanceRef.current.changeLanguage(newLanguage);
      }

      // Sync preferences to localStorage cache
      try {
        localStorage.setItem('user-preferences-cache', JSON.stringify(preferences));
        localStorage.setItem('user-preferences-cache-timestamp', Date.now().toString());
      } catch (e) {
        console.error('Failed to sync preferences to cache:', e);
      }
    } else if (!preferences && !prefsLoading && !hasInitializedLanguage.current) {
      hasInitializedLanguage.current = true;
      const initialLanguage = (i18nInstanceRef.current.language as Language) || defaultSettings.language;
      updatePreferencesMutateRef.current({ language: initialLanguage });
    }
  }, [preferences, prefsLoading, appSettings, appSettingsLoading]);

  // Mark feature translations as loaded (bundled in critical translations)
  const loadFeatureTranslations = useCallback(async (language: Language, namespaces: FeatureNamespace[]) => {
    const namespacesToLoad: FeatureNamespace[] = [];

    for (const namespace of namespaces) {
      if (loadedNamespacesRef.current.has(namespace) || loadingNamespacesRef.current.has(namespace)) continue;

      if (i18nInstanceRef.current.hasResourceBundle(language, namespace)) {
        namespacesToLoad.push(namespace);
      } else {
        console.warn(`Missing translation namespace ${namespace} for ${language}`);
        namespacesToLoad.push(namespace);
      }
    }

    if (namespacesToLoad.length === 0) return;

    setLoadingNamespaces(prev => new Set([...prev, ...namespacesToLoad]));

    namespacesToLoad.forEach((namespace) => {
      loadedNamespacesRef.current.add(namespace);
    });

    setLoadedNamespaces(prev => new Set([...prev, ...namespacesToLoad]));
    console.debug('i18next: translations already bundled', namespacesToLoad, 'for', language);

    setLoadingNamespaces(prev => {
      const next = new Set(prev);
      namespacesToLoad.forEach(ns => next.delete(ns));
      return next;
    });
  }, []);

  // Expose method for route-based translation loading
  const loadTranslationsForRoute = useCallback((route: string) => {
    let namespaces: FeatureNamespace[] = [];

    for (const [pattern, ns] of Object.entries(ROUTE_NAMESPACE_MAP)) {
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
      if (new RegExp(`^${regexPattern}$`).test(route)) {
        namespaces = ns;
        break;
      }
    }

    if (namespaces.length > 0) {
      loadFeatureTranslations(settingsRef.current.language, namespaces);
    }
  }, [loadFeatureTranslations]);

  // Helper function to update both local and database
  const updateSetting = useCallback((updates: Partial<LocalizationSettings>) => {
    console.log('⚙️ [LocalizationContext] updateSetting called with:', updates);

    // Set flag to prevent preferences sync from overriding manual changes
    if (updates.language !== undefined) {
      isManualLanguageChange.current = true;
      console.log('⚙️ [LocalizationContext] Setting manual language change flag to true');
    }

    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      console.log('⚙️ [LocalizationContext] Updated local settings to:', newSettings);
      return newSettings;
    });

    // Map to database field names
    const dbUpdates: any = {};
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.timeZone !== undefined) dbUpdates.time_zone = updates.timeZone;
    if (updates.weatherLocation !== undefined) dbUpdates.weather_location = updates.weatherLocation;
    if (updates.temperatureUnit !== undefined) dbUpdates.temperature_unit = updates.temperatureUnit;

    // Update i18next language if it changed
    if (updates.language !== undefined && i18nInstance.language !== updates.language) {
      console.log('⚙️ [LocalizationContext] Calling i18next.changeLanguage to:', updates.language);
      i18nInstance.changeLanguage(updates.language).then(() => {
        console.log('⚙️ [LocalizationContext] i18next.changeLanguage completed, clearing flag in 2s');
        // Clear the flag after a delay to allow database to update
        setTimeout(() => {
          isManualLanguageChange.current = false;
          console.log('⚙️ [LocalizationContext] Cleared manual language change flag');
        }, 2000);
      });
    }

    // Update localStorage cache
    if (updates.language !== undefined) {
      try {
        const cached = localStorage.getItem('user-preferences-cache') || '{}';
        const prefs = JSON.parse(cached);
        prefs.language = updates.language;
        localStorage.setItem('user-preferences-cache', JSON.stringify(prefs));
        localStorage.setItem('user-preferences-cache-timestamp', Date.now().toString());
        console.log('⚙️ [LocalizationContext] Updated localStorage cache to language:', updates.language);
      } catch (e) {
        console.error('Failed to update language cache:', e);
      }
    }

    if (Object.keys(dbUpdates).length > 0) {
      console.log('⚙️ [LocalizationContext] Calling updatePreferencesMutate with:', dbUpdates);
      updatePreferencesMutate(dbUpdates);
    }
  }, [updatePreferencesMutate, i18nInstance]);

  /**
   * Wrapper around i18next's t() function to maintain compatibility with existing code
   * Supports both namespace:key and namespace.key formats
   */
  const t = useCallback((key: string, defaultValueOrVariables?: string | TranslationVariables, variables?: TranslationVariables): string => {
    try {
      // Parse arguments
      let defaultValue: string | undefined;
      let options: any = { interpolation: { escapeValue: false } };

      if (typeof defaultValueOrVariables === 'string') {
        defaultValue = defaultValueOrVariables;
        if (variables) {
          options = { ...options, ...variables };
        }
      } else if (defaultValueOrVariables) {
        options = { ...options, ...defaultValueOrVariables };
      }

      // Handle different key formats:
      // 1. "namespace:key.path" - explicit namespace (i18next standard)
      // 2. "namespace.key.path" - implicit namespace (our current convention)
      // 3. "key" - use default namespace (common)

      let namespace: string;
      let translationKey: string;

      if (!key || typeof key !== 'string') {
        // Invalid key - use default namespace
        namespace = 'common';
        translationKey = '';
      } else if (key.includes(':')) {
        // Explicit namespace separator
        [namespace, translationKey] = key.split(':', 2);
      } else if (key.includes('.')) {
        // Implicit namespace (first segment before dot)
        const [firstPart, ...rest] = key.split('.');
        namespace = firstPart;
        translationKey = rest.join('.');
      } else {
        // No namespace specified - use default namespace (common)
        namespace = 'common';
        translationKey = key;
      }

      // Try to get translation from i18next
      const fullKey = translationKey ? `${namespace}:${translationKey}` : namespace;
      
      const result = i18nextT(fullKey, options);

      // If i18next returns the key itself (with colon), it means translation is missing
      const isMissing = typeof result !== 'string' || result === fullKey || (translationKey && result === `${namespace}:${translationKey}`);
      // Fall back to default when translation exists but is empty (fixes blank buttons from empty locale entries)
      const isEmpty = typeof result === 'string' && result.trim() === '';

      if (isEmpty) {
        // Use provided default, or fallback for well-known keys that cause blank buttons
        const lastKey = translationKey?.split('.').pop() || '';
        const fallbacks: Record<string, string> = {
          cancel: 'Cancel',
          create: 'Create',
          update: 'Update',
          creating: 'Creating...',
          updating: 'Updating...',
          uploading: 'Uploading...',
          saving: 'Saving...',
          loading: 'Loading...',
        };
        return defaultValue || fallbacks[lastKey] || key;
      }
      if (isMissing) {
        // Try to lazy-load the namespace if it's a feature namespace
        if ((FEATURE_NAMESPACES as readonly string[]).includes(namespace) &&
            !loadedNamespacesRef.current.has(namespace) &&
            !loadingNamespacesRef.current.has(namespace)) {
          defer(() => {
            loadFeatureTranslations(settingsRef.current.language, [namespace as FeatureNamespace]).catch(() => {});
          });
        }

        // Track missing key
        try {
          trackMissingKey(key, settingsRef.current.language);
        } catch (err) {
          // ignore
        }

        return defaultValue || key;
      }

      return result as string;
    } catch (error) {
      console.error('Translation error:', error);
      return key;
    }
  }, [i18nextT, loadFeatureTranslations]);

  const setLanguage = useCallback((language: Language) => {
    updateSetting({ language });
  }, [updateSetting]);

  const setCurrency = useCallback((currency: Currency) => {
    updateSetting({ currency });
  }, [updateSetting]);

  const setTimeZone = useCallback((timeZone: TimeZone) => {
    updateSetting({ timeZone });
  }, [updateSetting]);

  const setWeatherLocation = useCallback((weatherLocation: string) => {
    updateSetting({ weatherLocation });
  }, [updateSetting]);

  const setTemperatureUnit = useCallback((temperatureUnit: TemperatureUnit) => {
    updateSetting({ temperatureUnit });
  }, [updateSetting]);

  const setNumberFormat = useCallback((numberFormat: NumberFormat) => {
    updateSetting({ numberFormat });
  }, [updateSetting]);

  const setDateFormat = useCallback((dateFormat: DateFormat) => {
    updateSetting({ dateFormat });
  }, [updateSetting]);

  const updateSettingsBatch = useCallback((newSettings: Partial<LocalizationSettings>) => {
    updateSetting(newSettings);
  }, [updateSetting]);

  return (
    <LocalizationContext.Provider
      value={{
        ...settings,
        setLanguage,
        setCurrency,
        setTimeZone,
        setWeatherLocation,
        setTemperatureUnit,
        setNumberFormat,
        setDateFormat,
        updateSettings: updateSettingsBatch,
        t,
        loadTranslationsForRoute,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  return context;
};
