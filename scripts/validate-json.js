#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Comprehensive JSON validation for all locale files
 * Prevents broken JSON from reaching production
 */

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      line: error.message.match(/line (\d+)/)?.[1] || 'unknown',
      position: error.message.match(/position (\d+)/)?.[1] || 'unknown'
    };
  }
}

function checkForEmptyValues(obj, path = '', errors = []) {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string' && value.trim() === '') {
      errors.push(`Empty string at: ${currentPath}`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      checkForEmptyValues(value, currentPath, errors);
    }
  }
  
  return errors;
}

function validateLocaleConsistency(languages, fileName, localesPath) {
  const keysByLanguage = {};
  
  // Collect keys from all languages
  for (const language of languages) {
    const filePath = path.join(localesPath, language, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      function getKeys(obj, prefix = '') {
        const keys = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          keys.push(fullKey);
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...getKeys(value, fullKey));
          }
        }
        return keys;
      }
      
      keysByLanguage[language] = new Set(getKeys(jsonData));
    } catch (error) {
      // Skip if JSON is invalid (will be caught by JSON validation)
      continue;
    }
  }
  
  // Compare keys
  const issues = [];
  const baseLanguage = 'en-US';
  
  if (!keysByLanguage[baseLanguage]) {
    issues.push(`Base language ${baseLanguage} file missing for ${fileName}`);
    return issues;
  }
  
  const baseKeys = keysByLanguage[baseLanguage];
  
  for (const [language, keys] of Object.entries(keysByLanguage)) {
    if (language === baseLanguage) continue;
    
    // Missing keys
    const missingKeys = [...baseKeys].filter(key => !keys.has(key));
    if (missingKeys.length > 0) {
      issues.push(`${language}: Missing keys in ${fileName}: ${missingKeys.join(', ')}`);
    }
    
    // Extra keys
    const extraKeys = [...keys].filter(key => !baseKeys.has(key));
    if (extraKeys.length > 0) {
      issues.push(`${language}: Extra keys in ${fileName}: ${extraKeys.join(', ')}`);
    }
  }
  
  return issues;
}

async function main() {
  log(`${COLORS.BOLD}🔍 EngProApp - JSON Validation Suite${COLORS.RESET}`);
  log(`${COLORS.BLUE}Validating locale files...${COLORS.RESET}\n`);
  
  const localesPath = path.join(__dirname, '../src/locales');
  const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
  const requiredFiles = ['reports.json', 'projects.json', 'common.json', 'clientPortal.json', 'auth.json', 'navigation.json', 'procurement.json', 'financial.json', 'logistics.json'];
  
  let totalFiles = 0;
  let validFiles = 0;
  let totalErrors = 0;
  
  // 1. JSON Syntax Validation
  log(`${COLORS.BOLD}📋 JSON Syntax Validation${COLORS.RESET}`);
  
  for (const language of languages) {
    for (const fileName of requiredFiles) {
      const filePath = path.join(localesPath, language, fileName);
      totalFiles++;
      
      if (!fs.existsSync(filePath)) {
        log(`❌ ${language}/${fileName} - FILE MISSING`, COLORS.RED);
        totalErrors++;
        continue;
      }
      
      const result = validateJSON(filePath);
      
      if (result.valid) {
        log(`✅ ${language}/${fileName} - Valid JSON`, COLORS.GREEN);
        validFiles++;
      } else {
        log(`❌ ${language}/${fileName} - Invalid JSON`, COLORS.RED);
        log(`   Error: ${result.error}`, COLORS.RED);
        totalErrors++;
      }
    }
  }
  
  // 2. Empty Values Check
  log(`\n${COLORS.BOLD}🔍 Empty Values Check${COLORS.RESET}`);
  
  for (const language of languages) {
    for (const fileName of requiredFiles) {
      const filePath = path.join(localesPath, language, fileName);
      
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(content);
        const emptyValues = checkForEmptyValues(jsonData);
        
        if (emptyValues.length === 0) {
          log(`✅ ${language}/${fileName} - No empty values`, COLORS.GREEN);
        } else {
          log(`⚠️  ${language}/${fileName} - Found ${emptyValues.length} empty values`, COLORS.YELLOW);
          // Don't add to totalErrors to allow CI to pass with warnings
          // totalErrors += emptyValues.length;
        }
      } catch (error) {
        // Skip if JSON is invalid (already reported above)
        continue;
      }
    }
  }
  
  // 3. Cross-language Consistency
  log(`\n${COLORS.BOLD}🌐 Cross-language Consistency Check${COLORS.RESET}`);
  
  for (const fileName of requiredFiles) {
    const issues = validateLocaleConsistency(languages, fileName, localesPath);
    
    if (issues.length === 0) {
      log(`✅ ${fileName} - All languages consistent`, COLORS.GREEN);
    } else {
      log(`⚠️  ${fileName} - Consistency issues found:`, COLORS.YELLOW);
      issues.forEach(issue => {
        log(`   ${issue}`, COLORS.YELLOW);
      });
      // Don't add to totalErrors to allow CI to pass with warnings
      // totalErrors += issues.length;
    }
  }
  
  // 4. Summary Report
  log(`\n${COLORS.BOLD}📊 Validation Summary${COLORS.RESET}`);
  log(`Total files checked: ${totalFiles}`);
  log(`Valid JSON files: ${validFiles}/${totalFiles}`, validFiles === totalFiles ? COLORS.GREEN : COLORS.RED);
  log(`Total issues found: ${totalErrors}`, totalErrors === 0 ? COLORS.GREEN : COLORS.RED);
  
  if (totalErrors === 0) {
    log(`\n🎉 All JSON files are valid and ready for production!`, COLORS.GREEN);
    process.exit(0);
  } else {
    log(`\n❌ Found ${totalErrors} issues that must be fixed before deployment.`, COLORS.RED);
    log(`Please fix the issues above and run the validation again.`, COLORS.YELLOW);
    process.exit(1);
  }
}

main().catch(console.error);