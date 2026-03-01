#!/usr/bin/env node

/**
 * Identify unused translation keys to optimize bundle size
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const SRC_DIR = path.join(__dirname, '../src');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

/**
 * Get all translation keys from JSON files
 */
function getAllTranslationKeys() {
  const allKeys = new Set();
  
  for (const language of LANGUAGES) {
    const pattern = path.join(LOCALES_DIR, language, '*.json');
    const files = glob.sync(pattern);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const translations = JSON.parse(content);
        extractKeys(translations, '', allKeys);
      } catch (error) {
        console.warn(`Warning: Could not parse ${file}: ${error.message}`);
      }
    }
  }
  
  return allKeys;
}

/**
 * Recursively extract keys from nested object
 */
function extractKeys(obj, prefix, keySet) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractKeys(obj[key], prefix ? `${prefix}.${key}` : key, keySet);
    } else {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keySet.add(fullKey);
    }
  }
}

/**
 * Find all translation keys used in source code
 */
function findUsedKeys() {
  const usedKeys = new Set();
  const pattern = path.join(SRC_DIR, '**/*.{js,jsx,ts,tsx}');
  const files = glob.sync(pattern);
  
  // Regex patterns to find translation keys
  const patterns = [
    // t('key') pattern
    /t\(['"`]([^'"`]+)['"`]/g,
    // t("key", {...}) pattern
    /t\(["'`]([^'"`]+)["'`](?:,\s*\{[^}]*\})?/g,
    // useTranslation().t('key') pattern
    /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
    // LocalizationContext t() patterns
    /\.t\(['"`]([^'"`]+)['"`]/g,
  ];
  
  for (const file of files) {
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          
          // Handle namespace patterns
          let cleanKey = key;
          if (key.includes(':')) {
            cleanKey = key.split(':')[1];
          }
          
          usedKeys.add(cleanKey);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${file}: ${error.message}`);
    }
  }
  
  return usedKeys;
}

/**
 * Find unused keys
 */
function findUnusedKeys() {
  console.log('🔍 Analyzing translation key usage...\n');
  
  const allKeys = getAllTranslationKeys();
  const usedKeys = findUsedKeys();
  
  const unusedKeys = [...allKeys].filter(key => !usedKeys.has(key));
  const usageStats = {
    total: allKeys.size,
    used: usedKeys.size,
    unused: unusedKeys.length,
    usagePercentage: ((usedKeys.size / allKeys.size) * 100).toFixed(1)
  };
  
  console.log('📊 Usage Statistics:');
  console.log(`   Total keys: ${usageStats.total}`);
  console.log(`   Used keys: ${usageStats.used}`);
  console.log(`   Unused keys: ${usageStats.unused}`);
  console.log(`   Usage rate: ${usageStats.usagePercentage}%\n`);
  
  if (unusedKeys.length > 0) {
    console.log('🗑️  Unused Keys:');
    
    // Group by namespace
    const byNamespace = {};
    for (const key of unusedKeys) {
      const namespace = key.split('.')[0];
      if (!byNamespace[namespace]) byNamespace[namespace] = [];
      byNamespace[namespace].push(key);
    }
    
    for (const [namespace, keys] of Object.entries(byNamespace)) {
      console.log(`\n   📁 ${namespace} (${keys.length} unused):`);
      keys.slice(0, 10).forEach(key => {
        console.log(`      - ${key}`);
      });
      if (keys.length > 10) {
        console.log(`      ... and ${keys.length - 10} more`);
      }
    }
    
    console.log('\n💡 Optimization Suggestions:');
    console.log('   1. Remove unused keys to reduce bundle size');
    console.log('   2. Consider if any unused keys should be kept for future use');
    console.log('   3. Run "npm run i18n:cleanup" to automatically remove unused keys');
    
    // Generate cleanup script
    generateCleanupScript(byNamespace);
  } else {
    console.log('✅ All translation keys are in use!');
  }
  
  return { unusedKeys, usageStats };
}

/**
 * Generate cleanup script
 */
function generateCleanupScript(byNamespace) {
  let script = '#!/bin/bash\n# Auto-generated cleanup script for unused translation keys\n# Review carefully before running!\n\n';
  
  for (const [namespace, keys] of Object.entries(byNamespace)) {
    script += `# Remove unused keys from ${namespace}\n`;
    for (const key of keys) {
      const keyPath = key.replace(/\./g, '.');
      script += `# jq 'del(.${keyPath})' src/locales/en-US/${namespace}.json > tmp.json && mv tmp.json src/locales/en-US/${namespace}.json\n`;
    }
    script += '\n';
  }
  
  script += 'echo "Cleanup completed. Please verify the changes and run tests."\n';
  
  fs.writeFileSync(path.join(__dirname, '../cleanup-unused-keys.sh'), script);
  fs.chmodSync(path.join(__dirname, '../cleanup-unused-keys.sh'), '755');
  
  console.log('\n📝 Cleanup script generated: cleanup-unused-keys.sh');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const generateCleanup = args.includes('--cleanup');
  
  if (generateCleanup) {
    console.log('🧹 Generating cleanup script for unused keys...');
    findUnusedKeys();
  } else {
    findUnusedKeys();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { findUnusedKeys };
