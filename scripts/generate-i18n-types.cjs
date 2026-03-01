#!/usr/bin/env node

/**
 * Generate TypeScript type definitions from translation JSON files
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const OUTPUT_FILE = path.join(__dirname, '../src/types/i18n.d.ts');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

/**
 * Recursively generate TypeScript type from object
 */
function generateType(obj, prefix = '') {
  let type = '';
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const nestedType = generateType(obj[key], prefix ? `${prefix}${key}.` : `${key}.`);
      type += nestedType;
    } else {
      const fullKey = prefix ? `${prefix}${key}` : key;
      const escapedKey = fullKey.replace(/'/g, "\\'");
      type += `  '${escapedKey}': string;\n`;
    }
  }
  
  return type;
}

/**
 * Load all translation files for a language
 */
function loadLanguageTranslations(language) {
  const translations = {};
  const pattern = path.join(LOCALES_DIR, language, '*.json');
  const files = require('glob').sync(pattern);
  
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
 * Generate TypeScript definitions
 */
function generateTypes() {
  console.log('🔍 Generating TypeScript i18n types...');
  
  // Load English translations as reference
  const translations = loadLanguageTranslations('en-US');
  
  // Generate type definitions
  let typeDefinitions = '// Auto-generated i18n type definitions\n';
  typeDefinitions += '// Do not edit manually - run "npm run i18n:types" to regenerate\n\n';
  
  typeDefinitions += 'declare namespace CastorWorksI18n {\n';
  
  // Generate namespace types
  for (const [namespace, namespaceTranslations] of Object.entries(translations)) {
    if (typeof namespaceTranslations === 'object' && namespaceTranslations !== null) {
      const interfaceName = namespace.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      typeDefinitions += `  interface ${interfaceName} {\n`;
      typeDefinitions += generateType(namespaceTranslations);
      typeDefinitions += '  }\n\n';
    }
  }
  
  typeDefinitions += '  // All translation keys across all namespaces\n';
  typeDefinitions += '  type TranslationKey =\n';
  
  const allKeys = [];
  for (const [namespace, namespaceTranslations] of Object.entries(translations)) {
    if (typeof namespaceTranslations === 'object' && namespaceTranslations !== null) {
      const keys = getAllKeys(namespaceTranslations, namespace);
      allKeys.push(...keys);
    }
  }
  
  // Add all keys as union type
  allKeys.forEach((key, index) => {
    const escapedKey = key.replace(/'/g, "\\'");
    typeDefinitions += `    | '${escapedKey}'`;
    if (index < allKeys.length - 1) typeDefinitions += '\n';
  });
  
  typeDefinitions += ';\n\n';
  
  // Language type
  typeDefinitions += '  type Language = \'en-US\' | \'pt-BR\' | \'es-ES\' | \'fr-FR\';\n\n';
  
  // Namespace type
  const namespaces = Object.keys(translations);
  typeDefinitions += '  type Namespace =\n';
  namespaces.forEach((ns, index) => {
    typeDefinitions += `    | '${ns}'`;
    if (index < namespaces.length - 1) typeDefinitions += '\n';
  });
  typeDefinitions += ';\n';
  
  typeDefinitions += '}\n\n';
  
  // Global t() function augmentation
  typeDefinitions += '// Augment global t() function\n';
  typeDefinitions += 'declare global {\n';
  typeDefinitions += '  function t(key: CastorWorksI18n.TranslationKey, options?: any): string;\n';
  typeDefinitions += '}\n\n';
  
  // Export types
  typeDefinitions += 'export type TranslationKey = CastorWorksI18n.TranslationKey;\n';
  typeDefinitions += 'export type Language = CastorWorksI18n.Language;\n';
  typeDefinitions += 'export type Namespace = CastorWorksI18n.Namespace;\n';
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, typeDefinitions);
  console.log(`✅ TypeScript types generated: ${OUTPUT_FILE}`);
  
  // Print statistics
  console.log(`📊 Statistics:`);
  console.log(`   - Namespaces: ${namespaces.length}`);
  console.log(`   - Translation keys: ${allKeys.length}`);
  console.log(`   - Languages: ${LANGUAGES.length}`);
}

/**
 * Get all translation keys recursively
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

// Run if called directly
if (require.main === module) {
  generateTypes();
}

module.exports = { generateTypes };
