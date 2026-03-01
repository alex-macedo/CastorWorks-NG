#!/usr/bin/env node

/**
 * Standalone translation validation script
 * Can be run in any CI/CD environment or locally
 * 
 * Usage: node scripts/validate-translations.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_PATH = path.join(__dirname, '../src/locales');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const REQUIRED_FILES = ['reports.json', 'projects.json', 'procurement.json'];

let hasErrors = false;

console.log('🔍 Starting translation validation...\n');

// Validate JSON syntax and empty values
LANGUAGES.forEach(language => {
  console.log(`Checking ${language}...`);
  
  REQUIRED_FILES.forEach(fileName => {
    const filePath = path.join(LOCALES_PATH, language, fileName);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ Missing file: ${filePath}`);
      hasErrors = true;
      return;
    }
    
    try {
      // Validate JSON syntax
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Check for empty values
      const emptyKeys = findEmptyValues(data);
      if (emptyKeys.length > 0) {
        console.error(`  ❌ ${fileName} has empty values:`);
        emptyKeys.forEach(key => console.error(`     - ${key}`));
        hasErrors = true;
      } else {
        console.log(`  ✅ ${fileName} - Valid`);
      }
    } catch (error) {
      console.error(`  ❌ ${fileName} - Invalid JSON: ${error.message}`);
      hasErrors = true;
    }
  });
  
  console.log('');
});

// Check key consistency across languages
console.log('Checking key consistency across languages...\n');

REQUIRED_FILES.forEach(fileName => {
  const keysByLanguage = {};
  
  LANGUAGES.forEach(language => {
    const filePath = path.join(LOCALES_PATH, language, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      keysByLanguage[language] = new Set(getAllKeys(data));
    }
  });
  
  const baseLanguage = 'en-US';
  const baseKeys = keysByLanguage[baseLanguage];
  
  if (!baseKeys) {
    console.error(`❌ ${fileName}: Base language (${baseLanguage}) is missing`);
    hasErrors = true;
    return;
  }
  
  let fileHasErrors = false;
  
  LANGUAGES.forEach(language => {
    if (language === baseLanguage) return;
    
    const currentKeys = keysByLanguage[language];
    if (!currentKeys) return;
    
    // Check for missing keys
    const missingKeys = [...baseKeys].filter(key => !currentKeys.has(key));
    if (missingKeys.length > 0) {
      console.error(`❌ ${fileName} (${language}): Missing keys:`);
      missingKeys.forEach(key => console.error(`   - ${key}`));
      fileHasErrors = true;
      hasErrors = true;
    }
    
    // Check for extra keys
    const extraKeys = [...currentKeys].filter(key => !baseKeys.has(key));
    if (extraKeys.length > 0) {
      console.error(`❌ ${fileName} (${language}): Extra keys not in ${baseLanguage}:`);
      extraKeys.forEach(key => console.error(`   - ${key}`));
      fileHasErrors = true;
      hasErrors = true;
    }
  });
  
  if (!fileHasErrors) {
    console.log(`✅ ${fileName} - All languages have consistent keys`);
  }
  console.log('');
});

// Summary
if (hasErrors) {
  console.error('\n❌ Translation validation FAILED\n');
  console.error('Please fix the errors above before committing.\n');
  process.exit(1);
} else {
  console.log('\n✅ All translation files are valid!\n');
  process.exit(0);
}

// Helper functions
function findEmptyValues(obj, prefix = '') {
  const emptyKeys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string' && value.trim() === '') {
      emptyKeys.push(currentPath);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      emptyKeys.push(...findEmptyValues(value, currentPath));
    }
  }
  
  return emptyKeys;
}

function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    }
  }
  
  return keys;
}
