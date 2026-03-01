#!/usr/bin/env node

/**
 * Translation Completeness Checker
 * 
 * This script validates that all translation keys exist across all supported languages
 * and reports missing translations. It can fail CI if translations are incomplete.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const FAIL_ON_MISSING = process.argv.includes('--fail') || process.env.CI;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      keys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  
  return keys.sort();
}

/**
 * Load all translation files for a language
 */
function loadLanguageTranslations(language) {
  const translations = {};
  const pattern = path.join(LOCALES_DIR, language, '*.json');
  const files = glob.sync(pattern);
  
  for (const file of files) {
    const namespace = path.basename(file, '.json');
    try {
      const content = fs.readFileSync(file, 'utf8');
      translations[namespace] = JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not parse ${file}: ${error.message}`);
    }
  }
  
  return translations;
}

/**
 * Compare translations across all languages
 */
function checkTranslations() {
  colorLog('cyan', '🔍 Checking translation completeness...\n');
  
  // Load all translations
  const allTranslations = {};
  for (const lang of LANGUAGES) {
    allTranslations[lang] = loadLanguageTranslations(lang);
  }
  
  // Get all namespaces across all languages
  const allNamespaces = new Set();
  for (const lang of LANGUAGES) {
    Object.keys(allTranslations[lang]).forEach(ns => allNamespaces.add(ns));
  }
  
  let hasErrors = false;
  const missingByLanguage = {};
  const totalMissing = { total: 0 };
  
  // Check each language
  for (const lang of LANGUAGES) {
    const translations = allTranslations[lang];
    const missingKeys = [];
    
    // Check each namespace
    for (const namespace of allNamespaces) {
      const referenceTranslations = allTranslations['en-US'][namespace] || {};
      const currentTranslations = translations[namespace] || {};
      
      // Get all keys from reference (en-US)
      const referenceKeys = getAllKeys(referenceTranslations);
      const currentKeys = getAllKeys(currentTranslations);
      
      // Find missing keys
      for (const key of referenceKeys) {
        if (!currentKeys.includes(key)) {
          missingKeys.push({ namespace, key });
        }
      }
    }
    
    missingByLanguage[lang] = missingKeys;
    totalMissing[lang] = missingKeys.length;
    totalMissing.total += missingKeys.length;
    
    if (missingKeys.length > 0) {
      hasErrors = true;
    }
  }
  
  // Generate report
  if (totalMissing.total === 0) {
    colorLog('green', '✅ All translations are complete!');
    return { success: true, missingByLanguage, totalMissing };
  }
  
  colorLog('yellow', `❌ Found ${totalMissing.total} missing translations:\n`);
  
  for (const lang of LANGUAGES) {
    const missing = missingByLanguage[lang];
    if (missing.length === 0) {
      colorLog('green', `✅ ${lang}: Complete`);
      continue;
    }
    
    colorLog('red', `❌ ${lang}: ${missing.length} missing translations`);
    
    // Group by namespace
    const byNamespace = {};
    for (const { namespace, key } of missing) {
      if (!byNamespace[namespace]) byNamespace[namespace] = [];
      byNamespace[namespace].push(key);
    }
    
    for (const [namespace, keys] of Object.entries(byNamespace)) {
      colorLog('yellow', `   📁 ${namespace}:`);
      for (const key of keys) {
        console.log(`      - ${key}`);
      }
    }
    console.log('');
  }
  
  return { success: !hasErrors, missingByLanguage, totalMissing };
}

/**
 * Generate detailed report file
 */
function generateReport(results) {
  const reportPath = path.join(__dirname, '../translation-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalMissing: results.totalMissing.total,
      languages: LANGUAGES.map(lang => ({
        code: lang,
        missing: results.totalMissing[lang],
        complete: results.totalMissing[lang] === 0
      }))
    },
    details: results.missingByLanguage
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  colorLog('blue', `📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Check for unused translation keys
 */
function checkUnusedKeys() {
  if (!process.argv.includes('--check-unused')) {
    return;
  }
  
  colorLog('cyan', '\n🔍 Checking for unused translation keys...');
  
  // This is a simplified check - in a real implementation you'd
  // want to parse the codebase and track which keys are actually used
  const usedKeys = new Set();
  const allKeys = new Set();
  
  // For now, just report that this feature exists but needs implementation
  colorLog('yellow', '⚠️  Unused key checking not yet implemented');
}

/**
 * Main execution
 */
function main() {
  const results = checkTranslations();
  generateReport(results);
  checkUnusedKeys();
  
  // Exit with error code if there are missing translations and we're in CI
  if (!results.success && FAIL_ON_MISSING) {
    colorLog('red', '\n❌ Translation check failed! Please add missing translations before committing.');
    process.exit(1);
  }
  
  if (results.success) {
    colorLog('green', '\n✅ Translation check passed!');
  } else {
    colorLog('yellow', '\n⚠️  Translation issues found. Run with -- --fail to enforce in CI.');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkTranslations, generateReport };
