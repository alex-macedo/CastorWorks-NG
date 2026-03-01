import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization, type Language } from '@/contexts/LocalizationContext';

export interface ConfigValue {
  id: string;
  key: string;
  label: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

interface ConfigCategory {
  id: string;
  key: string;
  label: string;
  values: ConfigValue[];
}

export interface TranslationCoverage {
  language: string;
  total: number;
  translated: number;
  percentage: number;
}

export interface MissingTranslation {
  entityType: 'category' | 'value';
  entityId: string;
  entityKey: string;
  missingLanguages: string[];
}

export interface TranslationNeedsReview {
  entityType: 'category' | 'value';
  entityId: string;
  entityKey: string;
  language: string;
  currentLabel: string;
  lastReviewedAt: string | null;
  reviewNotes: string | null;
}

interface ConfigContextType {
  categories: ConfigCategory[];
  getConfigValues: (categoryKey: string) => ConfigValue[];
  getConfigLabel: (categoryKey: string, valueKey: string) => string;
  refreshConfig: () => Promise<void>;
  getTranslationCoverage: () => Promise<TranslationCoverage[]>;
  getMissingTranslations: () => Promise<MissingTranslation[]>;
  getTranslationsNeedingReview: () => Promise<TranslationNeedsReview[]>;
  isLoading: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// PHASE 4: localStorage cache for config data
const CONFIG_CACHE_KEY = 'config-data-cache';
const CONFIG_CACHE_TIMESTAMP_KEY = 'config-data-cache-timestamp';
const CONFIG_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

const getCachedConfig = (language: string): ConfigCategory[] | null => {
  try {
    const cached = localStorage.getItem(`${CONFIG_CACHE_KEY}-${language}`);
    const timestamp = localStorage.getItem(`${CONFIG_CACHE_TIMESTAMP_KEY}-${language}`);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CONFIG_CACHE_MAX_AGE) {
      // Cache expired
      localStorage.removeItem(`${CONFIG_CACHE_KEY}-${language}`);
      localStorage.removeItem(`${CONFIG_CACHE_TIMESTAMP_KEY}-${language}`);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to read cached config:', e);
    return null;
  }
};

const setCachedConfig = (language: string, categories: ConfigCategory[]) => {
  try {
    localStorage.setItem(`${CONFIG_CACHE_KEY}-${language}`, JSON.stringify(categories));
    localStorage.setItem(`${CONFIG_CACHE_TIMESTAMP_KEY}-${language}`, Date.now().toString());
  } catch (e) {
    console.error('Failed to cache config:', e);
  }
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<ConfigCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLocalization();
  
  // PHASE 4: Initialize with cached data if available
  const [isInitialized, setIsInitialized] = React.useState(false);

  const getLanguage = (): Language => {
    try {
      const saved = localStorage.getItem('localization-settings');
      return saved ? JSON.parse(saved).language || 'pt-BR' : 'pt-BR';
    } catch {
      return 'pt-BR';
    }
  };

  const fetchConfig = useCallback(async (languageOverride?: Language) => {
    try {
      setIsLoading(true);
      setError(null);

      const currentLanguage = languageOverride ?? language ?? getLanguage();

      // PHASE 3: Parallelize all database queries for faster loading
      const [
        { data: categoriesData, error: categoriesError },
        { data: valuesData, error: valuesError },
        { data: translationsData, error: translationsError }
      ] = await Promise.all([
        supabase
          .from('config_categories')
          .select('id, key, name_key, sort_order')
          .order('sort_order'),
        supabase
          .from('config_values')
          .select('id, category_id, key, value_key, icon, color, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('config_translations')
          .select('entity_type, entity_id, label')
          .eq('language_code', currentLanguage)
      ]);

      // If there are errors, log them but don't throw - use cached data instead
      if (categoriesError || valuesError || translationsError) {
        const errorMessages = [
          categoriesError && `Categories: ${categoriesError.message}`,
          valuesError && `Values: ${valuesError.message}`,
          translationsError && `Translations: ${translationsError.message}`,
        ].filter(Boolean);

        console.warn('Config fetch encountered errors, using cached data:', errorMessages.join('; '));
        // Don't throw - let the component use cached data
        setError('Using cached configuration data due to connection issues');
        setIsLoading(false);
        return;
      }

      // Create a map for quick translation lookup
      const translationMap = new Map<string, string>();
      translationsData?.forEach(t => {
        translationMap.set(`${t.entity_type}-${t.entity_id}`, t.label);
      });

      // Build the categories with their values
      const enrichedCategories: ConfigCategory[] = (categoriesData || []).map(cat => {
        const categoryValues = (valuesData || [])
          .filter(v => v.category_id === cat.id)
          .map(v => ({
            id: v.id,
            key: v.key,
            label: translationMap.get(`value-${v.id}`) || v.key,
            icon: v.icon,
            color: v.color,
            sortOrder: v.sort_order,
          }));

        return {
          id: cat.id,
          key: cat.key,
          label: translationMap.get(`category-${cat.id}`) || cat.name_key,
          values: categoryValues,
        };
      });

      // PHASE 4: Cache the fetched config
      setCachedConfig(currentLanguage, enrichedCategories);
      setCategories(enrichedCategories);
      setError(null);
    } catch (err) {
      console.error('Unexpected error fetching config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  // PHASE 4: Load cached data immediately on mount
  useEffect(() => {
    if (!isInitialized) {
      const currentLanguage = language ?? getLanguage();
      const cached = getCachedConfig(currentLanguage);
      if (cached && cached.length > 0) {
        console.log('[ConfigProvider] Loading cached config for instant display');
        setCategories(cached);
        setIsLoading(false);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, language]);

  useEffect(() => {
    fetchConfig();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'localization-settings') fetchConfig(getLanguage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchConfig]);

  useEffect(() => {
    if (language) {
      fetchConfig(language);
    }
  }, [language, fetchConfig]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('config-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config_categories' },
        () => fetchConfig()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config_values' },
        () => fetchConfig()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config_translations' },
        () => fetchConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig]);

  const getConfigValues = (categoryKey: string): ConfigValue[] => {
    const category = categories.find(c => c.key === categoryKey);
    return category?.values || [];
  };

  const getConfigLabel = (categoryKey: string, valueKey: string): string => {
    const values = getConfigValues(categoryKey);
    const value = values.find(v => v.key === valueKey);
    return value?.label || valueKey;
  };

  const refreshConfig = async () => {
    await fetchConfig(language);
  };

  const getTranslationCoverage = async (): Promise<TranslationCoverage[]> => {
    try {
      const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
      
      // Get total entities (categories + values)
      const { data: categoriesData } = await supabase
        .from('config_categories')
        .select('id');
      
      const { data: valuesData } = await supabase
        .from('config_values')
        .select('id')
        .eq('is_active', true);
      
      const totalEntities = (categoriesData?.length || 0) + (valuesData?.length || 0);
      
      // Get translations per language
      const coverage: TranslationCoverage[] = await Promise.all(
        languages.map(async (lang) => {
          const { data: translations } = await supabase
            .from('config_translations')
            .select('id')
            .eq('language_code', lang);
          
          const translated = translations?.length || 0;
          const percentage = totalEntities > 0 ? Math.round((translated / totalEntities) * 100) : 0;
          
          return {
            language: lang,
            total: totalEntities,
            translated,
            percentage,
          };
        })
      );
      
      return coverage;
    } catch (err) {
      console.error('Error calculating translation coverage:', err);
      return [];
    }
  };

  const getMissingTranslations = async (): Promise<MissingTranslation[]> => {
    try {
      const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

      // Get all categories and values
      const { data: categoriesData } = await supabase
        .from('config_categories')
        .select('id, key');

      const { data: valuesData } = await supabase
        .from('config_values')
        .select('id, key')
        .eq('is_active', true);

      // Get all translations
      const { data: translationsData } = await supabase
        .from('config_translations')
        .select('entity_type, entity_id, language_code');

      const missing: MissingTranslation[] = [];

      // Check categories
      categoriesData?.forEach((cat) => {
        const missingLangs = languages.filter(lang =>
          !translationsData?.some(t =>
            t.entity_type === 'category' && t.entity_id === cat.id && t.language_code === lang
          )
        );

        if (missingLangs.length > 0) {
          missing.push({
            entityType: 'category',
            entityId: cat.id,
            entityKey: cat.key,
            missingLanguages: missingLangs,
          });
        }
      });

      // Check values
      valuesData?.forEach((val) => {
        const missingLangs = languages.filter(lang =>
          !translationsData?.some(t =>
            t.entity_type === 'value' && t.entity_id === val.id && t.language_code === lang
          )
        );

        if (missingLangs.length > 0) {
          missing.push({
            entityType: 'value',
            entityId: val.id,
            entityKey: val.key,
            missingLanguages: missingLangs,
          });
        }
      });

      return missing;
    } catch (err) {
      console.error('Error finding missing translations:', err);
      return [];
    }
  };

  const getTranslationsNeedingReview = async (): Promise<TranslationNeedsReview[]> => {
    try {
      // Get all translations that need review
      const { data: reviewData, error } = await supabase
        .from('config_translations')
        .select('entity_type, entity_id, language_code, label, last_reviewed_at, review_notes')
        .eq('needs_review', true);

      if (error) throw error;

      if (!reviewData || reviewData.length === 0) {
        return [];
      }

      // Get entity keys for categories
      const categoryIds = reviewData
        .filter(t => t.entity_type === 'category')
        .map(t => t.entity_id);

      const { data: categoriesData } = categoryIds.length > 0
        ? await supabase
            .from('config_categories')
            .select('id, key')
            .in('id', categoryIds)
        : { data: [] };

      // Get entity keys for values
      const valueIds = reviewData
        .filter(t => t.entity_type === 'value')
        .map(t => t.entity_id);

      const { data: valuesData } = valueIds.length > 0
        ? await supabase
            .from('config_values')
            .select('id, key')
            .in('id', valueIds)
        : { data: [] };

      // Build the result
      const needsReview: TranslationNeedsReview[] = reviewData.map(item => {
        let entityKey = '';

        if (item.entity_type === 'category') {
          entityKey = categoriesData?.find(c => c.id === item.entity_id)?.key || '';
        } else {
          entityKey = valuesData?.find(v => v.id === item.entity_id)?.key || '';
        }

        return {
          entityType: item.entity_type as 'category' | 'value',
          entityId: item.entity_id,
          entityKey,
          language: item.language_code,
          currentLabel: item.label,
          lastReviewedAt: item.last_reviewed_at,
          reviewNotes: item.review_notes,
        };
      });

      return needsReview;
    } catch (err) {
      console.error('Error finding translations needing review:', err);
      return [];
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        categories,
        getConfigValues,
        getConfigLabel,
        refreshConfig,
        getTranslationCoverage,
        getMissingTranslations,
        getTranslationsNeedingReview,
        isLoading,
        error,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    // Return a safe default instead of throwing during development/HMR
    console.warn('useConfig called outside ConfigProvider - returning default values');
    return {
      categories: [],
      getConfigValues: () => [],
      getConfigLabel: (categoryKey: string, valueKey: string) => valueKey,
      refreshConfig: async () => {},
      getTranslationCoverage: async () => [],
      getMissingTranslations: async () => [],
      getTranslationsNeedingReview: async () => [],
      isLoading: false,
      error: null,
    };
  }
  return context;
};
