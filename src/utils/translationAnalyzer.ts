interface TranslationStats {
  namespace: string;
  languages: {
    [lang: string]: {
      totalKeys: number;
      translatedKeys: number;
      missingKeys: string[];
      emptyKeys: string[];
      completionPercentage: number;
    };
  };
}

interface NamespaceComparison {
  namespace: string;
  baselineKeys: number;
  languageStats: {
    [lang: string]: {
      present: number;
      missing: number;
      missingKeys: string[];
    };
  };
}

const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const BASELINE_LANG = 'en-US';

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a value is empty or placeholder
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed.startsWith('[EN]');
  }
  return false;
}

/**
 * Analyze a single namespace across all languages
 */
export async function analyzeNamespace(namespace: string): Promise<TranslationStats> {
  const stats: TranslationStats = {
    namespace,
    languages: {},
  };

  let baselineData: any = null;
  let baselineKeys: string[] = [];

  // Load all language files for this namespace
  for (const lang of LANGUAGES) {
    try {
      const data = await import(`@/locales/${lang}/${namespace}.json`);
      const allKeys = getAllKeys(data.default || data);
      
      // Store baseline for comparison
      if (lang === BASELINE_LANG) {
        baselineData = data.default || data;
        baselineKeys = allKeys;
      }

      const missingKeys: string[] = [];
      const emptyKeys: string[] = [];

      // Check each key
      allKeys.forEach(key => {
        const value = getNestedValue(data.default || data, key);
        if (isEmpty(value)) {
          emptyKeys.push(key);
        }
      });

      // Compare with baseline
      if (lang !== BASELINE_LANG && baselineKeys.length > 0) {
        baselineKeys.forEach(key => {
          if (!allKeys.includes(key)) {
            missingKeys.push(key);
          }
        });
      }

      const translatedKeys = allKeys.length - emptyKeys.length - missingKeys.length;
      const totalPossible = lang === BASELINE_LANG ? allKeys.length : baselineKeys.length;

      stats.languages[lang] = {
        totalKeys: allKeys.length,
        translatedKeys,
        missingKeys,
        emptyKeys,
        completionPercentage: totalPossible > 0 ? (translatedKeys / totalPossible) * 100 : 0,
      };
    } catch (error) {
      // Namespace doesn't exist for this language
      stats.languages[lang] = {
        totalKeys: 0,
        translatedKeys: 0,
        missingKeys: baselineKeys,
        emptyKeys: [],
        completionPercentage: 0,
      };
    }
  }

  return stats;
}

/**
 * Get all available namespaces by scanning the en-US directory
 */
export async function getAvailableNamespaces(): Promise<string[]> {
  // We need to manually list these since dynamic imports don't allow directory scanning
  const knownNamespaces = [
    'analytics',
    'approvals',
    'budget',
    'common',
    'contractors',
    'dashboard',
    'documents',
    'financial',
    'materials',
    'navigation',
    'notFound',
    'notifications',
    'overallStatus',
    'phaseTemplates',
    'procurement',
    'projectPhases',
    'projects',
    'roadmapAnalytics',
    'schedule',
    'settings',
  ];

  return knownNamespaces;
}

/**
 * Analyze all namespaces
 */
export async function analyzeAllTranslations(): Promise<TranslationStats[]> {
  const namespaces = await getAvailableNamespaces();
  const results: TranslationStats[] = [];

  for (const namespace of namespaces) {
    try {
      const stats = await analyzeNamespace(namespace);
      results.push(stats);
    } catch (error) {
      console.error(`Failed to analyze namespace ${namespace}:`, error);
    }
  }

  return results;
}

/**
 * Get overall statistics across all namespaces
 */
export function getOverallStats(allStats: TranslationStats[]) {
  const overall: {
    [lang: string]: {
      totalKeys: number;
      translatedKeys: number;
      completionPercentage: number;
    };
  } = {};

  LANGUAGES.forEach(lang => {
    overall[lang] = {
      totalKeys: 0,
      translatedKeys: 0,
      completionPercentage: 0,
    };
  });

  allStats.forEach(stats => {
    LANGUAGES.forEach(lang => {
      const langStats = stats.languages[lang];
      if (langStats) {
        overall[lang].totalKeys += langStats.totalKeys;
        overall[lang].translatedKeys += langStats.translatedKeys;
      }
    });
  });

  LANGUAGES.forEach(lang => {
    const total = overall[lang].totalKeys;
    overall[lang].completionPercentage = total > 0 
      ? (overall[lang].translatedKeys / total) * 100 
      : 0;
  });

  return overall;
}
