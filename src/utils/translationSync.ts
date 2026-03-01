/**
 * Browser-compatible translation synchronization
 * This version works in the browser by using dynamic imports
 */

const LANGUAGES = ['pt-BR', 'es-ES', 'fr-FR'];
const BASELINE_LANG = 'en-US';

interface SyncResult {
  namespace: string;
  synced: boolean;
  changes: { [lang: string]: string[] };
  errors?: string[];
}

interface SyncSummary {
  totalNamespaces: number;
  syncedNamespaces: number;
  totalKeysAdded: number;
  details: SyncResult[];
}

/**
 * Recursively get all keys from an object
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
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Generate updated JSON content for a language file
 */
export async function generateSyncedContent(
  namespace: string,
  lang: string
): Promise<{ content: string; addedKeys: string[] } | null> {
  try {
    // Load baseline
    const baselineModule = await import(`@/locales/${BASELINE_LANG}/${namespace}.json`);
    const baselineData = baselineModule.default || baselineModule;
    const baselineKeys = getAllKeys(baselineData);

    // Load target (or create empty object if doesn't exist)
    let targetData: any = {};
    try {
      const targetModule = await import(`@/locales/${lang}/${namespace}.json`);
      targetData = targetModule.default || targetModule;
    } catch (error) {
      // File doesn't exist, start with empty object
      console.log(`Creating new file for ${lang}/${namespace}.json`);
    }

    const targetKeys = getAllKeys(targetData);
    const addedKeys: string[] = [];

    // Add missing keys
    for (const key of baselineKeys) {
      if (!targetKeys.includes(key)) {
        const baselineValue = getNestedValue(baselineData, key);
        const placeholderValue = typeof baselineValue === 'string' 
          ? `[EN] ${baselineValue}`
          : baselineValue;
        
        setNestedValue(targetData, key, placeholderValue);
        addedKeys.push(key);
      }
    }

    if (addedKeys.length === 0) {
      return null; // No changes needed
    }

    // Generate formatted JSON
    const content = JSON.stringify(targetData, null, 2);
    
    return { content, addedKeys };
  } catch (error) {
    console.error(`Error syncing ${lang}/${namespace}:`, error);
    return null;
  }
}

/**
 * Analyze what would be synced without making changes
 */
export async function analyzeSyncNeeds(
  namespaces: string[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const namespace of namespaces) {
    const result: SyncResult = {
      namespace,
      synced: false,
      changes: {},
      errors: [],
    };

    try {
      // Load baseline
      const baselineModule = await import(`@/locales/${BASELINE_LANG}/${namespace}.json`);
      const baselineData = baselineModule.default || baselineModule;
      const baselineKeys = getAllKeys(baselineData);

      // Check each language
      for (const lang of LANGUAGES) {
        try {
          const targetModule = await import(`@/locales/${lang}/${namespace}.json`);
          const targetData = targetModule.default || targetModule;
          const targetKeys = getAllKeys(targetData);

          const missingKeys = baselineKeys.filter(key => !targetKeys.includes(key));
          
          if (missingKeys.length > 0) {
            result.changes[lang] = missingKeys;
            result.synced = true;
          }
        } catch (error) {
          // File doesn't exist - all keys are missing
          result.changes[lang] = baselineKeys;
          result.synced = true;
        }
      }
    } catch (error) {
      result.errors?.push(`Failed to load baseline: ${error}`);
    }

    results.push(result);
  }

  return results;
}

/**
 * Get list of available namespaces
 */
export function getKnownNamespaces(): string[] {
  return [
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
}
