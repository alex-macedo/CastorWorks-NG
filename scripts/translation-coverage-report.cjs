#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const REPO_ROOT = path.join(__dirname, '..');
const LOCALES_PATH = path.join(REPO_ROOT, 'src', 'locales');
const SRC_PATH = path.join(REPO_ROOT, 'src');

function getAllKeys(obj, prefix = '') {
  const keys = [];
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value, fullKey));
      }
    }
  }
  return keys;
}

function getTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'coverage', '__tests__'].includes(file)) {
        getTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  const patterns = [ /\bt\(\s*['"`"]([^'"`]+)['"`"]\s*\)/g, /\bt\(\s*['"`"]([^'"`]+)['"`"]\s*,/g ];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });
  return keys;
}

function loadLanguageTranslations(language) {
  const languagePath = path.join(LOCALES_PATH, language);
  const translations = new Map();
  if (!fs.existsSync(languagePath)) return translations;
  const files = fs.readdirSync(languagePath).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    const namespace = file.replace('.json', '');
    const filePath = path.join(languagePath, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const keys = getAllKeys(content);
      // Prefix keys with namespace so they match usage like 'namespace.key.path'
      const prefixed = keys.map(k => `${namespace}.${k}`);
      translations.set(namespace, new Set(prefixed));
    } catch (err) {
      console.error(`Failed to parse ${filePath}: ${err.message}`);
    }
  });
  return translations;
}

function keyExistsInLanguage(key, languageTranslations) {
  for (const [, keys] of languageTranslations) {
    if (keys.has(key)) return true;
  }
  return false;
}

function main() {
  console.log('Scanning source files to extract used translation keys...');
  const tsFiles = getTypeScriptFiles(SRC_PATH);
  const usedKeys = new Set();
  tsFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    keys.forEach(k => {
      // Normalize namespace separators: accept both 'namespace:key' and 'namespace.key'
      const normalized = k.replace(/:/g, '.');
      usedKeys.add(normalized);
    });
  });

  console.log(`Found ${usedKeys.size} unique translation keys used in source.`);

  const translations = {};
  LANGUAGES.forEach(lang => {
    translations[lang] = loadLanguageTranslations(lang);
  });

  const missingKeys = {};
  for (const key of usedKeys) {
    LANGUAGES.forEach(lang => {
      if (!keyExistsInLanguage(key, translations[lang])) {
        if (!missingKeys[lang]) missingKeys[lang] = [];
        missingKeys[lang].push(key);
      }
    });
  }

  const report = {
    usedKeysCount: usedKeys.size,
    usedKeys: Array.from(usedKeys),
    languages: {}
  };

  LANGUAGES.forEach(lang => {
    const langTranslations = translations[lang];
    const defined = [];
    for (const [ns, keys] of langTranslations) {
      defined.push({ namespace: ns, definedKeys: keys.size });
    }
    report.languages[lang] = {
      namespaces: defined,
      missingCount: missingKeys[lang] ? missingKeys[lang].length : 0,
      missingKeys: missingKeys[lang] ? Array.from(missingKeys[lang]) : [],
      sampleMissing: missingKeys[lang] ? missingKeys[lang].slice(0, 200) : []
    };
  });

  console.log('\nTranslation coverage summary:');
  LANGUAGES.forEach(lang => {
    const info = report.languages[lang];
    console.log(`\n- ${lang}: ${info.missingCount} missing keys`);
    if (info.namespaces.length > 0) {
      console.log(`  Namespaces (${info.namespaces.length}): ${info.namespaces.map(n => `${n.namespace}(${n.definedKeys})`).join(', ')}`);
    } else {
      console.log('  No locale files found for this language.');
    }
    if (info.missingCount > 0) {
      console.log('  Sample missing keys:');
      info.sampleMissing.forEach(k => console.log(`    - ${k}`));
      if (info.missingCount > info.sampleMissing.length) {
        console.log(`    ... and ${info.missingCount - info.sampleMissing.length} more`);
      }
    }
  });

  const outPath = path.join(__dirname, 'translation-coverage-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nWrote full report to ${outPath}`);
}

main();
