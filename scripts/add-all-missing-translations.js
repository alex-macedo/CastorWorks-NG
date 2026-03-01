#!/usr/bin/env node

/**
 * Automatically adds all missing translation keys to all language files
 * Scans the codebase for t() calls and generates translation entries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const SRC_DIR = path.join(__dirname, '../src');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Get all TypeScript files recursively
 */
function getTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'build', 'locales'].includes(file)) {
        getTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Extract translation keys from a TypeScript file
 */
function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();
  
  // Match t('key') or t("key") or t(`key`)
  const regex = /t\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    if (key && !key.includes('${')) { // Skip template strings with variables
      keys.add(key);
    }
  }
  
  return keys;
}

/**
 * Parse a translation key into namespace and path
 */
function parseKey(key) {
  const parts = key.split('.');
  if (parts.length < 2) return null;
  
  const namespace = parts[0];
  const keyPath = parts.slice(1);
  
  return { namespace, keyPath };
}

/**
 * Check if a key exists in an object
 */
function hasKey(obj, keyPath) {
  let current = obj;
  for (const part of keyPath) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

/**
 * Set a key in an object
 */
function setKey(obj, keyPath, value) {
  let current = obj;
  for (let i = 0; i < keyPath.length - 1; i++) {
    const part = keyPath[i];
    if (!(part in current)) {
      current[part] = {};
    } else if (typeof current[part] !== 'object' || current[part] === null) {
      // If the existing value is not an object, convert it to one
      // This handles cases where we have "status": "Status" but need "status.notStarted"
      current[part] = {};
    }
    current = current[part];
  }
  current[keyPath[keyPath.length - 1]] = value;
}

/**
 * Generate a human-readable English translation from a key path
 */
function generateEnglishValue(keyPath) {
  const lastPart = keyPath[keyPath.length - 1];
  
  // Convert camelCase or snake_case to Title Case
  const words = lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  
  return words.join(' ');
}

/**
 * Add missing keys to translation files
 */
function addMissingKeys() {
  console.log(`${colors.bright}${colors.cyan}🌐 Adding Missing Translation Keys${colors.reset}\n`);
  
  // Step 1: Get all TypeScript files
  console.log(`${colors.blue}📁 Scanning TypeScript files...${colors.reset}`);
  const tsFiles = getTypeScriptFiles(SRC_DIR);
  console.log(`   Found ${tsFiles.length} TypeScript files\n`);
  
  // Step 2: Extract all translation keys
  console.log(`${colors.blue}🔍 Extracting translation keys...${colors.reset}`);
  const allKeys = new Set();
  for (const file of tsFiles) {
    const keys = extractTranslationKeys(file);
    keys.forEach(key => allKeys.add(key));
  }
  console.log(`   Found ${allKeys.size} unique translation keys\n`);
  
  // Step 3: Group keys by namespace
  const keysByNamespace = {};
  for (const key of allKeys) {
    const parsed = parseKey(key);
    if (parsed) {
      if (!keysByNamespace[parsed.namespace]) {
        keysByNamespace[parsed.namespace] = [];
      }
      keysByNamespace[parsed.namespace].push({ key, keyPath: parsed.keyPath });
    }
  }
  
  console.log(`${colors.blue}📦 Found ${Object.keys(keysByNamespace).length} namespaces${colors.reset}\n`);
  
  // Step 4: Process each language
  let totalAdded = 0;
  
  for (const language of LANGUAGES) {
    console.log(`${colors.cyan}Processing ${language}...${colors.reset}`);
    let languageAdded = 0;
    
    for (const [namespace, keys] of Object.entries(keysByNamespace)) {
      const filePath = path.join(LOCALES_DIR, language, `${namespace}.json`);
      
      // Load existing translations or create new object
      let translations = {};
      if (fs.existsSync(filePath)) {
        try {
          translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (error) {
          console.log(`   ${colors.red}⚠️  Error reading ${filePath}: ${error.message}${colors.reset}`);
          continue;
        }
      }
      
      // Check for missing keys and add them
      let added = 0;
      for (const { keyPath } of keys) {
        if (!hasKey(translations, keyPath)) {
          let value;
          if (language === 'en-US') {
            // Generate English value
            value = generateEnglishValue(keyPath);
          } else {
            // For other languages, use [EN] prefix to indicate need for translation
            value = `[EN] ${generateEnglishValue(keyPath)}`;
          }
          setKey(translations, keyPath, value);
          added++;
          languageAdded++;
          totalAdded++;
        }
      }
      
      if (added > 0) {
        // Write back to file with proper formatting
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
        console.log(`   ${colors.green}✓${colors.reset} ${namespace}.json: Added ${added} keys`);
      }
    }
    
    if (languageAdded > 0) {
      console.log(`   ${colors.bright}Total added for ${language}: ${languageAdded}${colors.reset}\n`);
    } else {
      console.log(`   ${colors.green}All keys present${colors.reset}\n`);
    }
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}✅ Summary${colors.reset}`);
  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total keys added across all languages: ${colors.bright}${totalAdded}${colors.reset}`);
  console.log(`Languages processed: ${colors.bright}${LANGUAGES.length}${colors.reset}`);
  console.log(`Namespaces processed: ${colors.bright}${Object.keys(keysByNamespace).length}${colors.reset}`);
  
  if (totalAdded > 0) {
    console.log(`\n${colors.yellow}⚠️  Non-English translations are marked with [EN] prefix${colors.reset}`);
    console.log(`${colors.yellow}   Review and translate these keys for production use${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}✅ Done!${colors.reset}\n`);
}

// Run the script
addMissingKeys();
