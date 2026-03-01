#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const LOCALES_DIR = join(__dirname, '../src/locales');
const SRC_DIR = join(__dirname, '../src');

/**
 * Get all translation files grouped by language
 */
function getTranslationFiles() {
  const languages = readdirSync(LOCALES_DIR).filter(name => {
    const stat = statSync(join(LOCALES_DIR, name));
    return stat.isDirectory();
  });

  const translationFiles = {};
  
  languages.forEach(lang => {
    const langDir = join(LOCALES_DIR, lang);
    const files = readdirSync(langDir).filter(f => f.endsWith('.json'));
    translationFiles[lang] = files.map(f => ({
      namespace: f.replace('.json', ''),
      path: join(langDir, f)
    }));
  });

  return translationFiles;
}

/**
 * Load all translations for a language
 */
function loadTranslations(translationFiles) {
  const translations = {};
  
  Object.entries(translationFiles).forEach(([lang, files]) => {
    translations[lang] = {};
    files.forEach(({ namespace, path }) => {
      try {
        const content = JSON.parse(readFileSync(path, 'utf-8'));
        translations[lang][namespace] = content;
      } catch (error) {
        console.error(`${colors.red}Error loading ${path}:${colors.reset}`, error.message);
      }
    });
  });

  return translations;
}

/**
 * Get all nested keys from a translation object
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  
  return keys;
}

/**
 * Recursively get all TypeScript/TSX files
 */
function getTypeScriptFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, build, etc.
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extract translation keys from TypeScript file
 */
function extractTranslationKeys(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const keys = new Set();
  
  // Match t('key'), t("key"), t(`key`)
  const patterns = [
    /t\(['"]([^'"]+)['"]\)/g,
    /t\(`([^`]+)`\)/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      // Skip dynamic keys with ${} interpolation
      if (!key.includes('${')) {
        keys.add(key);
      }
    }
  });
  
  return Array.from(keys);
}

/**
 * Check if a key exists in translations
 */
function keyExists(key, namespace, translations) {
  const parts = key.split('.');
  let current = translations[namespace];
  
  if (!current) return false;
  
  for (const part of parts) {
    if (current[part] === undefined) return false;
    current = current[part];
  }
  
  return true;
}

/**
 * Main validation function
 */
function validateTranslationCoverage() {
  console.log(`\n${colors.bright}${colors.cyan}🔍 Translation Coverage Validation${colors.reset}\n`);
  
  // Load all translations
  const translationFiles = getTranslationFiles();
  const languages = Object.keys(translationFiles);
  const translations = loadTranslations(translationFiles);
  
  console.log(`${colors.blue}📚 Found ${languages.length} languages: ${languages.join(', ')}${colors.reset}\n`);
  
  // Get all TypeScript files
  const tsFiles = getTypeScriptFiles(SRC_DIR);
  console.log(`${colors.blue}📄 Scanning ${tsFiles.length} TypeScript files...${colors.reset}\n`);
  
  // Extract all used keys
  const usedKeys = new Map(); // key -> [files using it]
  
  tsFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    keys.forEach(key => {
      if (!usedKeys.has(key)) {
        usedKeys.set(key, []);
      }
      usedKeys.get(key).push(file.replace(SRC_DIR, 'src'));
    });
  });
  
  console.log(`${colors.blue}🔑 Found ${usedKeys.size} unique translation keys in code${colors.reset}\n`);
  
  // Get all defined keys per language
  const definedKeys = {};
  languages.forEach(lang => {
    const allKeys = new Set();
    Object.entries(translations[lang]).forEach(([namespace, content]) => {
      const keys = getAllKeys(content, namespace);
      keys.forEach(k => allKeys.add(k));
    });
    definedKeys[lang] = allKeys;
  });
  
  // Validate coverage
  const issues = {
    missingKeys: {}, // lang -> [keys]
    unusedKeys: {}, // lang -> [keys]
  };
  
  // Check for missing keys
  usedKeys.forEach((files, key) => {
    languages.forEach(lang => {
      if (!definedKeys[lang].has(key)) {
        if (!issues.missingKeys[lang]) issues.missingKeys[lang] = [];
        issues.missingKeys[lang].push({ key, files });
      }
    });
  });
  
  // Check for unused keys
  languages.forEach(lang => {
    const unused = [];
    definedKeys[lang].forEach(key => {
      if (!usedKeys.has(key)) {
        unused.push(key);
      }
    });
    if (unused.length > 0) {
      issues.unusedKeys[lang] = unused;
    }
  });
  
  // Report results
  let hasErrors = false;
  
  // Report missing keys
  Object.entries(issues.missingKeys).forEach(([lang, keys]) => {
    if (keys.length > 0) {
      hasErrors = true;
      console.log(`${colors.red}❌ Missing translations in ${lang}:${colors.reset}`);
      keys.forEach(({ key, files }) => {
        console.log(`   ${colors.yellow}${key}${colors.reset}`);
        console.log(`      Used in: ${files[0]}${files.length > 1 ? ` (+${files.length - 1} more)` : ''}`);
      });
      console.log();
    }
  });
  
  // Report unused keys (warning, not error)
  Object.entries(issues.unusedKeys).forEach(([lang, keys]) => {
    if (keys.length > 0) {
      console.log(`${colors.yellow}⚠️  Unused translations in ${lang} (${keys.length} keys):${colors.reset}`);
      keys.slice(0, 10).forEach(key => {
        console.log(`   ${colors.cyan}${key}${colors.reset}`);
      });
      if (keys.length > 10) {
        console.log(`   ${colors.cyan}... and ${keys.length - 10} more${colors.reset}`);
      }
      console.log();
    }
  });
  
  // Summary
  if (!hasErrors) {
    const totalMissingCount = Object.values(issues.missingKeys).flat().length;
    const totalUnusedCount = Object.values(issues.unusedKeys).flat().length;
    
    console.log(`${colors.green}✅ Translation Coverage: 100%${colors.reset}`);
    console.log(`${colors.green}   All ${usedKeys.size} translation keys are defined in all languages${colors.reset}`);
    
    if (totalUnusedCount > 0) {
      console.log(`${colors.yellow}   Note: ${totalUnusedCount} unused keys found (not an error)${colors.reset}`);
    }
    console.log();
    return true;
  } else {
    const totalMissing = Object.values(issues.missingKeys).reduce((sum, keys) => sum + keys.length, 0);
    console.log(`${colors.red}❌ Translation Coverage Failed${colors.reset}`);
    console.log(`${colors.red}   ${totalMissing} missing translation(s) found${colors.reset}\n`);
    return false;
  }
}

// Run validation
const success = validateTranslationCoverage();
process.exit(success ? 0 : 1);
