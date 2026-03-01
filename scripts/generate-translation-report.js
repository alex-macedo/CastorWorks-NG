import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const LOCALES_PATH = path.join(__dirname, '../src/locales');
const SRC_PATH = path.join(__dirname, '../src');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Helper: Get all translation keys from a nested object
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

// Helper: Get all TypeScript/TSX files recursively
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

// Helper: Extract translation keys from a file
function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  
  const patterns = [
    /\bt\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /\bt\(\s*['"`]([^'"`]+)['"`]\s*,/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });
  
  return keys;
}

// Helper: Load all translations for a language
function loadLanguageTranslations(language) {
  const languagePath = path.join(LOCALES_PATH, language);
  const translations = new Map();
  
  if (!fs.existsSync(languagePath)) {
    return translations;
  }
  
  const files = fs.readdirSync(languagePath).filter(f => f.endsWith('.json'));
  
  files.forEach(file => {
    const namespace = file.replace('.json', '');
    const filePath = path.join(languagePath, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const keys = getAllKeys(content);
      translations.set(namespace, new Set(keys));
    } catch (error) {
      console.error(`${colors.red}Error loading ${filePath}: ${error.message}${colors.reset}`);
    }
  });
  
  return translations;
}

// Helper: Determine namespace from key
function guessNamespace(key) {
  const parts = key.split('.');
  
  // Common namespace prefixes
  const namespaceMap = {
    'common': 'common',
    'navigation': 'navigation',
    'auth': 'auth',
    'projects': 'projects',
    'clients': 'clients',
    'suppliers': 'suppliers',
    'contractors': 'contractors',
    'procurement': 'procurement',
    'reports': 'reports',
    'budget': 'budgetControl',
    'financial': 'financial',
    'materials': 'materials',
    'schedule': 'schedule',
    'phaseTemplates': 'phaseTemplates',
    'constructionActivities': 'constructionActivities',
    'projectPhases': 'projectPhases',
    'weather': 'weather',
    'analytics': 'analytics',
    'roadmap': 'roadmap',
    'admin': 'admin',
    'clientAccess': 'clientAccess',
    'overallStatus': 'overallStatus',
    'notFound': 'notFound',
    'aiInsights': 'aiInsights',
  };
  
  const firstPart = parts[0];
  return namespaceMap[firstPart] || 'unknown';
}

// Helper: Check if key exists in any namespace
function keyExistsInLanguage(key, languageTranslations) {
  for (const [, keys] of languageTranslations) {
    if (keys.has(key)) {
      return true;
    }
  }
  return false;
}

function generateReport() {
  console.log(`\n${colors.bright}${colors.cyan}================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   TRANSLATION COVERAGE REPORT${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================${colors.reset}\n`);

  // Get all TypeScript files
  console.log(`${colors.blue}📁 Scanning TypeScript files...${colors.reset}`);
  const tsFiles = getTypeScriptFiles(SRC_PATH);
  console.log(`${colors.green}✓ Found ${tsFiles.length} TypeScript files${colors.reset}\n`);

  // Extract all used translation keys
  console.log(`${colors.blue}🔍 Extracting translation keys from code...${colors.reset}`);
  const usedKeys = new Set();
  const keysByFile = new Map();
  
  tsFiles.forEach(file => {
    const keys = extractTranslationKeys(file);
    keys.forEach(key => {
      usedKeys.add(key);
      if (!keysByFile.has(key)) {
        keysByFile.set(key, []);
      }
      keysByFile.get(key).push(file.replace(SRC_PATH, ''));
    });
  });
  
  console.log(`${colors.green}✓ Found ${usedKeys.size} unique translation keys used in code${colors.reset}\n`);

  // Load translations for all languages
  console.log(`${colors.blue}📚 Loading translation files...${colors.reset}`);
  const translations = {};
  LANGUAGES.forEach(lang => {
    translations[lang] = loadLanguageTranslations(lang);
    const totalKeys = Array.from(translations[lang].values())
      .reduce((sum, set) => sum + set.size, 0);
    console.log(`${colors.green}  ✓ ${lang}: ${totalKeys} keys across ${translations[lang].size} namespaces${colors.reset}`);
  });
  console.log();

  // Analyze missing keys by namespace
  console.log(`${colors.blue}🔎 Analyzing missing keys...${colors.reset}\n`);
  
  const missingByLanguage = {};
  const missingByNamespace = {};
  
  LANGUAGES.forEach(lang => {
    missingByLanguage[lang] = [];
    
    usedKeys.forEach(key => {
      if (!keyExistsInLanguage(key, translations[lang])) {
        missingByLanguage[lang].push(key);
        
        const namespace = guessNamespace(key);
        if (!missingByNamespace[namespace]) {
          missingByNamespace[namespace] = {
            keys: new Set(),
            languages: new Set(),
          };
        }
        missingByNamespace[namespace].keys.add(key);
        missingByNamespace[namespace].languages.add(lang);
      }
    });
  });

  // Print summary
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}  SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  console.log(`${colors.cyan}Total unique keys used in code:${colors.reset} ${colors.bright}${usedKeys.size}${colors.reset}`);
  console.log();
  
  console.log(`${colors.red}Missing keys by language:${colors.reset}`);
  LANGUAGES.forEach(lang => {
    const count = missingByLanguage[lang].length;
    const percentage = ((count / usedKeys.size) * 100).toFixed(1);
    console.log(`  ${lang}: ${colors.red}${count}${colors.reset} keys missing (${percentage}%)`);
  });
  console.log();

  // Sort namespaces by number of missing keys
  const sortedNamespaces = Object.entries(missingByNamespace)
    .sort((a, b) => b[1].keys.size - a[1].keys.size);

  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}  MISSING KEYS BY NAMESPACE${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  sortedNamespaces.forEach(([namespace, data], index) => {
    const count = data.keys.size;
    const langs = Array.from(data.languages).join(', ');
    
    console.log(`${colors.bright}${index + 1}. ${colors.magenta}${namespace}${colors.reset} namespace`);
    console.log(`   ${colors.red}${count} missing keys${colors.reset} in: ${langs}`);
    console.log();
    
    // Show top 20 keys for this namespace
    const keysArray = Array.from(data.keys);
    const displayLimit = Math.min(20, keysArray.length);
    
    keysArray.slice(0, displayLimit).forEach((key, i) => {
      const files = keysByFile.get(key) || [];
      const fileCount = files.length;
      console.log(`   ${colors.cyan}${i + 1}.${colors.reset} ${key}`);
      console.log(`      ${colors.yellow}Used in ${fileCount} file${fileCount > 1 ? 's' : ''}${colors.reset}`);
    });
    
    if (keysArray.length > displayLimit) {
      console.log(`   ${colors.yellow}... and ${keysArray.length - displayLimit} more keys${colors.reset}`);
    }
    console.log();
  });

  // Generate CSV report
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}  GENERATING CSV REPORT${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const csvRows = ['Namespace,Key,Missing in Languages,Usage Count,Sample Files'];
  
  sortedNamespaces.forEach(([namespace, data]) => {
    Array.from(data.keys).forEach(key => {
      const langs = Array.from(data.languages).join('; ');
      const files = keysByFile.get(key) || [];
      const usageCount = files.length;
      const sampleFiles = files.slice(0, 3).join('; ');
      csvRows.push(`"${namespace}","${key}","${langs}",${usageCount},"${sampleFiles}"`);
    });
  });
  
  const reportPath = path.join(__dirname, '../translation-report.csv');
  fs.writeFileSync(reportPath, csvRows.join('\n'), 'utf8');
  
  console.log(`${colors.green}✓ CSV report generated: ${reportPath}${colors.reset}`);
  console.log(`${colors.green}✓ Total rows: ${csvRows.length - 1}${colors.reset}\n`);

  // Recommendations
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}  RECOMMENDATIONS${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const top5Namespaces = sortedNamespaces.slice(0, 5);
  console.log(`${colors.cyan}Priority namespaces to translate (highest impact):${colors.reset}\n`);
  
  top5Namespaces.forEach(([namespace, data], index) => {
    console.log(`${colors.bright}${index + 1}.${colors.reset} ${colors.magenta}${namespace}${colors.reset} (${data.keys.size} keys)`);
  });
  
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`  1. Review the CSV report for complete details`);
  console.log(`  2. Prioritize translating the top namespaces`);
  console.log(`  3. Create translation files or add keys to existing ones`);
  console.log(`  4. Run validation: ${colors.yellow}npm test src/__tests__/translation-coverage.test.ts${colors.reset}\n`);

  console.log(`${colors.bright}${colors.cyan}================================================${colors.reset}\n`);
}

// Run the report
try {
  generateReport();
  process.exit(0);
} catch (error) {
  console.error(`${colors.red}Error generating report: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
}
