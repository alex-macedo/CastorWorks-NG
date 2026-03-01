/**
 * Translation Statistics CLI Tool
 * Displays completion percentages and missing keys for all languages
 * 
 * Usage: npm run translation-stats
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, '../src/locales');
const BASELINE_LANG = 'en-US';
const TARGET_LANGS = ['pt-BR', 'es-ES', 'fr-FR'];

interface NamespaceStats {
  namespace: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  placeholderKeys: number;
  completion: number;
}

interface LanguageStats {
  language: string;
  namespaces: NamespaceStats[];
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  placeholderKeys: number;
  overallCompletion: number;
}

// Get all keys from nested object with dot notation
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

// Count placeholder values (prefixed with [EN])
function countPlaceholders(obj: any): number {
  let count = 0;
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countPlaceholders(obj[key]);
    } else if (typeof obj[key] === 'string' && obj[key].startsWith('[EN]')) {
      count++;
    }
  }
  
  return count;
}

// Analyze a single namespace for a language
function analyzeNamespace(namespace: string, lang: string): NamespaceStats | null {
  const baselinePath = join(LOCALES_DIR, BASELINE_LANG, `${namespace}.json`);
  const targetPath = join(LOCALES_DIR, lang, `${namespace}.json`);
  
  if (!existsSync(baselinePath)) {
    return null;
  }
  
  try {
    const baselineContent = JSON.parse(readFileSync(baselinePath, 'utf-8'));
    const baselineKeys = getAllKeys(baselineContent);
    const totalKeys = baselineKeys.length;
    
    if (!existsSync(targetPath)) {
      return {
        namespace,
        totalKeys,
        translatedKeys: 0,
        missingKeys: totalKeys,
        placeholderKeys: 0,
        completion: 0
      };
    }
    
    const targetContent = JSON.parse(readFileSync(targetPath, 'utf-8'));
    const targetKeys = getAllKeys(targetContent);
    const placeholderKeys = countPlaceholders(targetContent);
    
    const missingKeys = totalKeys - targetKeys.length;
    const translatedKeys = targetKeys.length - placeholderKeys;
    const completion = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;
    
    return {
      namespace,
      totalKeys,
      translatedKeys,
      missingKeys,
      placeholderKeys,
      completion
    };
  } catch (error) {
    console.error(`Error analyzing ${namespace} for ${lang}:`, error);
    return null;
  }
}

// Analyze all namespaces for a language
function analyzeLanguage(lang: string): LanguageStats {
  const baselineDir = join(LOCALES_DIR, BASELINE_LANG);
  const namespaceFiles = readdirSync(baselineDir).filter(f => f.endsWith('.json'));
  
  const namespaces: NamespaceStats[] = [];
  let totalKeys = 0;
  let translatedKeys = 0;
  let missingKeys = 0;
  let placeholderKeys = 0;
  
  for (const file of namespaceFiles) {
    const namespace = file.replace('.json', '');
    const stats = analyzeNamespace(namespace, lang);
    
    if (stats) {
      namespaces.push(stats);
      totalKeys += stats.totalKeys;
      translatedKeys += stats.translatedKeys;
      missingKeys += stats.missingKeys;
      placeholderKeys += stats.placeholderKeys;
    }
  }
  
  const overallCompletion = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;
  
  return {
    language: lang,
    namespaces: namespaces.sort((a, b) => a.completion - b.completion),
    totalKeys,
    translatedKeys,
    missingKeys,
    placeholderKeys,
    overallCompletion
  };
}

// Format progress bar
function getProgressBar(percentage: number, width: number = 30): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let color = '\x1b[31m'; // Red
  if (percentage >= 90) color = '\x1b[32m'; // Green
  else if (percentage >= 70) color = '\x1b[33m'; // Yellow
  
  return `${color}${'█'.repeat(filled)}${'\x1b[90m'}${'░'.repeat(empty)}\x1b[0m`;
}

// Display statistics
function displayStats() {
  console.log('\n' + '='.repeat(80));
  console.log('📊  TRANSLATION STATISTICS');
  console.log('='.repeat(80) + '\n');
  
  const allStats: LanguageStats[] = [];
  
  for (const lang of TARGET_LANGS) {
    const stats = analyzeLanguage(lang);
    allStats.push(stats);
  }
  
  // Overall summary
  console.log('📈  OVERALL COMPLETION BY LANGUAGE\n');
  
  for (const stats of allStats) {
    const flagMap: Record<string, string> = {
      'pt-BR': '🇧🇷',
      'es-ES': '🇪🇸',
      'fr-FR': '🇫🇷'
    };
    
    const flag = flagMap[stats.language] || '🌍';
    const percentage = stats.overallCompletion.toFixed(1);
    const bar = getProgressBar(stats.overallCompletion);
    
    console.log(`${flag}  ${stats.language.padEnd(10)} ${bar} ${percentage}%`);
    console.log(`   Total Keys: ${stats.totalKeys} | Translated: ${stats.translatedKeys} | Missing: ${stats.missingKeys} | Placeholders: ${stats.placeholderKeys}\n`);
  }
  
  // Detailed breakdown
  console.log('\n' + '-'.repeat(80));
  console.log('📋  DETAILED BREAKDOWN BY NAMESPACE\n');
  
  for (const stats of allStats) {
    const flagMap: Record<string, string> = {
      'pt-BR': '🇧🇷',
      'es-ES': '🇪🇸',
      'fr-FR': '🇫🇷'
    };
    
    const flag = flagMap[stats.language] || '🌍';
    console.log(`\n${flag}  ${stats.language.toUpperCase()}\n`);
    
    // Show namespaces with < 100% completion first
    const incomplete = stats.namespaces.filter(n => n.completion < 100);
    const complete = stats.namespaces.filter(n => n.completion === 100);
    
    if (incomplete.length > 0) {
      console.log('   ⚠️  Incomplete Namespaces:\n');
      
      for (const ns of incomplete) {
        const percentage = ns.completion.toFixed(1);
        const bar = getProgressBar(ns.completion, 20);
        console.log(`   ${ns.namespace.padEnd(25)} ${bar} ${percentage.padStart(5)}%  (${ns.missingKeys} missing, ${ns.placeholderKeys} placeholders)`);
      }
    }
    
    if (complete.length > 0) {
      console.log(`\n   ✅  Complete Namespaces: ${complete.length} (${complete.map(n => n.namespace).join(', ')})`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡  Tips:');
  console.log('   • Run "npm run sync-translations" to add missing keys');
  console.log('   • Check /admin/translations dashboard for detailed view');
  console.log('   • Replace [EN] placeholders with proper translations\n');
}

// Run the analysis
displayStats();
