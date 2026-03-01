#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, 'translation-coverage-report.json');
const REPO_ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(REPO_ROOT, 'src', 'locales');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

// Namespaces to apply targeted placeholders in other languages besides en-US
const TARGET_NAMESPACES = new Set(['common', 'documents', 'financial']);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse JSON ${p}: ${e.message}`);
    return {};
  }
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function setNested(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (i === pathParts.length - 1) {
      if (cur[part] === undefined) cur[part] = value;
    } else {
      if (typeof cur[part] !== 'object' || cur[part] === null) cur[part] = {};
      cur = cur[part];
    }
  }
}

function applyPlaceholders(report) {
  const missing = report.languages || {};
  const allMissing = {};
  // Build mapping per lang -> keys
  for (const lang of LANGUAGES) {
    allMissing[lang] = (report.languages && report.languages[lang] && report.languages[lang].sampleMissing)
      ? report.languages[lang].sampleMissing.slice(0, 1000000) // sampleMissing includes up to 200, but report contains full list in scripts; fallback
      : [];
  }

  // However our earlier generator also emitted the full missingKeys in memory; if that file isn't enough, we fallback
  // Instead, try to read the original diagnostic output for full list if present in scripts/translation-coverage-report.json
  // Our report struct contains 'languages[lang].sampleMissing' only; try to read scripts/translation-coverage-report.json as source of truth.

  // Best-effort: parse the textual diagnostic file if present (the .cjs output logs) - but we'll proceed with the sampleMissing list.

  // Apply placeholders for en-US for all missing keys we have
  const enDir = path.join(LOCALES_DIR, 'en-US');
  ensureDir(enDir);

  // Build a namespace -> keys map for en-US
  const enNamespaceMap = new Map();
  const enMissing = report.languages && report.languages['en-US'] && report.languages['en-US'].sampleMissing ? report.languages['en-US'].sampleMissing : [];
  for (const key of enMissing) {
    const parts = key.split('.');
    const ns = parts[0];
    if (!enNamespaceMap.has(ns)) enNamespaceMap.set(ns, new Set());
    enNamespaceMap.get(ns).add(parts.slice(1).join('.'));
  }

  // For each namespace, load file, set nested keys where missing
  for (const [ns, keysSet] of enNamespaceMap.entries()) {
    const filePath = path.join(enDir, `${ns}.json`);
    const obj = readJson(filePath);
    for (const rest of keysSet) {
      if (!rest) {
        // key was top-level (namespace equals key)
        if (obj[ns] === undefined) obj[ns] = ns;
        continue;
      }
      const pathParts = rest.split('.');
      setNested(obj, pathParts, `${ns}.${rest}`);
    }
    writeJson(filePath, obj);
    console.log(`Updated en-US/${ns}.json with ${keysSet.size} placeholders (if missing).`);
  }

  // Targeted namespaces for other languages
  for (const lang of LANGUAGES.filter(l => l !== 'en-US')) {
    const langDir = path.join(LOCALES_DIR, lang);
    ensureDir(langDir);
    for (const ns of TARGET_NAMESPACES) {
      const filePath = path.join(langDir, `${ns}.json`);
      const obj = readJson(filePath);
      // For each key present in enNamespaceMap for this ns, apply placeholder if missing
      const enKeysForNs = enNamespaceMap.get(ns);
      if (!enKeysForNs) continue;
      for (const rest of enKeysForNs) {
        if (!rest) {
          if (obj[ns] === undefined) obj[ns] = `${ns}`;
          continue;
        }
        const pathParts = rest.split('.');
        setNested(obj, pathParts, `${ns}.${rest}`);
      }
      writeJson(filePath, obj);
      console.log(`Updated ${lang}/${ns}.json with ${enKeysForNs.size} placeholders (if missing).`);
    }
  }
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Report file not found at ${REPORT_PATH}. Run scripts/translation-coverage-report.cjs first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  applyPlaceholders(report);
  console.log('Placeholder application complete.');
}

main();
