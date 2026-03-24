#!/usr/bin/env node
/**
 * i18n:add-namespace
 *
 * Scaffolds a new i18n namespace across all 4 locales and wires it into
 * critical.ts and i18n.ts automatically.
 *
 * Usage:
 *   node scripts/i18n-add-namespace.mjs <namespace>
 *   npm run i18n:add-namespace -- <namespace>
 *
 * What it does:
 *   1. Creates src/locales/{en-US,pt-BR,es-ES,fr-FR}/<namespace>.json
 *      (skips any that already exist)
 *   2. Adds the import + registration to src/locales/critical.ts
 *   3. Adds the namespace to the `ns` array in src/lib/i18n/i18n.ts
 *
 * After running this script:
 *   - Add your English keys to src/locales/en-US/<namespace>.json
 *   - Run `npm run i18n:check` to see what's missing in other languages
 *   - Fill in the other language files with real translations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
const LANGS = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const LOCALES_DIR = path.join(REPO, 'src/locales');
const CRITICAL_TS = path.join(LOCALES_DIR, 'critical.ts');
const I18N_TS = path.join(REPO, 'src/lib/i18n/i18n.ts');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const log = (color, msg) => console.log(`${colors[color]}${msg}${colors.reset}`);

// ─── Args ────────────────────────────────────────────────────────────────────

const namespace = process.argv[2];
if (!namespace) {
  log('red', 'Usage: node scripts/i18n-add-namespace.mjs <namespace>');
  log('red', 'Example: node scripts/i18n-add-namespace.mjs myFeature');
  process.exit(1);
}

if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(namespace)) {
  log('red', `Invalid namespace "${namespace}". Use camelCase alphanumeric only.`);
  process.exit(1);
}

log('cyan', `\n📦 Adding namespace: "${namespace}"\n`);

// ─── Step 1: Create JSON files ───────────────────────────────────────────────

let filesCreated = 0;
for (const lang of LANGS) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  if (fs.existsSync(filePath)) {
    log('yellow', `  ⚠  ${lang}/${namespace}.json already exists — skipping`);
    continue;
  }
  fs.writeFileSync(filePath, '{}\n', 'utf-8');
  log('green', `  ✓  Created ${lang}/${namespace}.json`);
  filesCreated++;
}

// ─── Step 2: Wire into critical.ts ───────────────────────────────────────────

let criticalContent = fs.readFileSync(CRITICAL_TS, 'utf-8');

// Check if already imported
const importAlreadyExists = criticalContent.includes(`'./en-US/${namespace}.json'`);
if (importAlreadyExists) {
  log('yellow', `  ⚠  critical.ts already imports "${namespace}" — skipping`);
} else {
  // Build import block for all 4 languages
  const importLines = LANGS.map(lang => {
    const varName = `${namespace}${lang.replace('-', '')}`;
    return `import ${varName} from './${lang}/${namespace}.json';`;
  }).join('\n');

  // Insert imports before the export const criticalTranslations line
  criticalContent = criticalContent.replace(
    '\nexport const criticalTranslations',
    `\n${importLines}\n\nexport const criticalTranslations`
  );

  // Add to each language's object in criticalTranslations
  for (const lang of LANGS) {
    const varName = `${namespace}${lang.replace('-', '')}`;
    const langKey = `'${lang}'`;

    // Find the closing brace for this language's object
    // Pattern: find "  }," or "  }," after the language key
    const langPattern = new RegExp(
      `(${langKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*\\{[\\s\\S]*?)(\\s+timeline: timeline${lang.replace('-', '')}[,]?)`,
      'm'
    );

    if (langPattern.test(criticalContent)) {
      criticalContent = criticalContent.replace(
        langPattern,
        `$1$2\n    ${namespace}: ${varName},`
      );
    } else {
      // Fallback: find the end of the language block and insert before it
      log('yellow', `  ⚠  Could not auto-insert "${namespace}" for ${lang} in criticalTranslations — add manually`);
    }
  }

  fs.writeFileSync(CRITICAL_TS, criticalContent, 'utf-8');
  log('green', `  ✓  Updated critical.ts with "${namespace}" imports and registrations`);
}

// ─── Step 3: Register in i18n.ts ns array ────────────────────────────────────

let i18nContent = fs.readFileSync(I18N_TS, 'utf-8');
const nsAlreadyRegistered = i18nContent.includes(`'${namespace}'`);

if (nsAlreadyRegistered) {
  log('yellow', `  ⚠  i18n.ts already registers "${namespace}" — skipping`);
} else {
  // Find the ns array and append before the closing bracket
  // Pattern: find 'trial' (last entry) and add after it
  i18nContent = i18nContent.replace(
    /('trial'\s*\])/,
    `'trial',\n      '${namespace}'\n    ]`
  );

  if (i18nContent.includes(`'${namespace}'`)) {
    fs.writeFileSync(I18N_TS, i18nContent, 'utf-8');
    log('green', `  ✓  Registered "${namespace}" in i18n.ts ns array`);
  } else {
    log('yellow', `  ⚠  Could not auto-register "${namespace}" in i18n.ts — add it manually to the ns array`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log();
log('cyan', '─'.repeat(60));
log('green', `✅ Namespace "${namespace}" scaffolded successfully!`);
console.log();
console.log('Next steps:');
console.log(`  1. Add your English strings to:`);
console.log(`       src/locales/en-US/${namespace}.json`);
console.log(`  2. Add translations for the other 3 languages:`);
for (const lang of LANGS.slice(1)) {
  console.log(`       src/locales/${lang}/${namespace}.json`);
}
console.log(`  3. Run: npm run i18n:check`);
console.log(`     to verify all languages are complete.`);
log('cyan', '─'.repeat(60));
console.log();
