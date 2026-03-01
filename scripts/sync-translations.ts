import fs from 'fs';
import path from 'path';

const LANGUAGES = ['pt-BR', 'es-ES', 'fr-FR'];
const BASELINE_LANG = 'en-US';
const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

/**
 * Validate if a filename is a valid namespace
 * Valid namespaces should only contain alphanumeric characters, hyphens, and underscores
 */
function isValidNamespace(filename: string): boolean {
  // Remove .json extension if present
  const name = filename.replace('.json', '');
  
  // Check if name matches valid pattern: alphanumeric, hyphens, underscores only
  // Must start with alphanumeric, and be at least 2 characters
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  
  return validPattern.test(name) && name.length >= 2;
}

/**
 * Get all JSON files in a directory
 */
function getJsonFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .filter(name => isValidNamespace(name)); // Only return valid namespaces
  } catch (error) {
    return [];
  }
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
 * Sync a single namespace file across all languages
 */
function syncNamespace(namespace: string): {
  namespace: string;
  synced: boolean;
  changes: { [lang: string]: number };
} {
  const changes: { [lang: string]: number } = {};
  let synced = false;

  // Load baseline file
  const baselinePath = path.join(LOCALES_DIR, BASELINE_LANG, `${namespace}.json`);
  
  if (!fs.existsSync(baselinePath)) {
    console.warn(`Baseline file not found: ${baselinePath}`);
    return { namespace, synced: false, changes };
  }

  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const baselineKeys = getAllKeys(baselineData);

  // Sync each target language
  for (const lang of LANGUAGES) {
    const targetPath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
    let targetData: any = {};
    
    // Load existing target file or create new object
    if (fs.existsSync(targetPath)) {
      targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    }

    const targetKeys = getAllKeys(targetData);
    let addedCount = 0;

    // Add missing keys with [EN] placeholder
    for (const key of baselineKeys) {
      if (!targetKeys.includes(key)) {
        const baselineValue = getNestedValue(baselineData, key);
        const placeholderValue = typeof baselineValue === 'string' 
          ? `[EN] ${baselineValue}`
          : baselineValue;
        
        setNestedValue(targetData, key, placeholderValue);
        addedCount++;
        synced = true;
      }
    }

    // Write updated file if changes were made
    if (addedCount > 0) {
      fs.writeFileSync(
        targetPath, 
        JSON.stringify(targetData, null, 2) + '\n',
        'utf-8'
      );
      changes[lang] = addedCount;
      console.log(`✓ Added ${addedCount} keys to ${lang}/${namespace}.json`);
    }
  }

  return { namespace, synced, changes };
}

/**
 * Sync all translation files
 */
export function syncAllTranslations(): {
  totalNamespaces: number;
  syncedNamespaces: number;
  totalKeysAdded: number;
  details: Array<{
    namespace: string;
    synced: boolean;
    changes: { [lang: string]: number };
  }>;
} {
  console.log('🔄 Starting translation synchronization...\n');

  // Get all namespaces from baseline language
  const baselineDir = path.join(LOCALES_DIR, BASELINE_LANG);
  const namespaces = getJsonFiles(baselineDir);

  const results = namespaces.map(namespace => syncNamespace(namespace));
  
  const syncedNamespaces = results.filter(r => r.synced).length;
  const totalKeysAdded = results.reduce((sum, r) => 
    sum + Object.values(r.changes).reduce((s, count) => s + count, 0), 
    0
  );

  console.log('\n✅ Synchronization complete!');
  console.log(`   Namespaces processed: ${namespaces.length}`);
  console.log(`   Namespaces updated: ${syncedNamespaces}`);
  console.log(`   Total keys added: ${totalKeysAdded}`);

  return {
    totalNamespaces: namespaces.length,
    syncedNamespaces,
    totalKeysAdded,
    details: results,
  };
}

// Run if called directly (ES module pattern)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    syncAllTranslations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Translation sync failed:', error);
    process.exit(1);
  }
}
