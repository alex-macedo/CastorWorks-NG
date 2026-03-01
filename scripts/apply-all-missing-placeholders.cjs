#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const reportPath = path.resolve(__dirname, 'translation-coverage-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('Coverage report not found at', reportPath);
  process.exit(1);
}

const baseLocales = path.resolve(__dirname, '..', 'src', 'locales');

function setDeep(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function applyPlaceholdersOnce(report) {
  let totalAdded = 0;
  for (const [lang, info] of Object.entries(report.languages || {})) {
    // Prefer the full missingKeys list if available; fall back to sampleMissing
    const missing = Array.isArray(info.missingKeys) && info.missingKeys.length > 0 ? info.missingKeys.slice() : (info.sampleMissing || []).slice();
    if (!missing || missing.length === 0) {
      console.log(`No explicit missing keys listed for ${lang}, skipping.`);
      continue;
    }

    const langDir = path.join(baseLocales, lang);
    if (!fs.existsSync(langDir)) {
      console.warn(`Locale dir not found for ${lang}: ${langDir}, creating.`);
      fs.mkdirSync(langDir, { recursive: true });
    }

    // Group missing keys by namespace (first segment)
    const byNs = {};
    for (const key of missing) {
      if (typeof key !== 'string') continue;
      const idx = key.indexOf('.');
      if (idx === -1) continue; // skip malformed
      const ns = key.slice(0, idx);
      const tail = key.slice(idx + 1);
      byNs[ns] = byNs[ns] || [];
      byNs[ns].push(tail);
    }

    for (const [ns, tails] of Object.entries(byNs)) {
      const filePath = path.join(langDir, `${ns}.json`);
      let data = {};
      if (fs.existsSync(filePath)) {
        try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { console.warn('Invalid JSON in', filePath, e); }
      } else {
        // initialize empty file to ensure writeable
        try { fs.writeFileSync(filePath, JSON.stringify({}, null, 2) + '\n', 'utf8'); } catch (e) { /* ignore */ }
      }

      let addedForNs = 0;
      for (const t of tails) {
        const parts = t.split('.');
        if (parts.length === 0) continue;
        // check existence via traversal; create missing nested objects as needed
        let cur = data;
        let exists = true;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          const isLast = i === parts.length - 1;
          if (isLast) {
            if (Object.prototype.hasOwnProperty.call(cur, p)) {
              // already present
            } else {
              exists = false;
              // set placeholder
              cur[p] = `TODO: ${ns}.${t}`;
            }
          } else {
            if (typeof cur[p] === 'object' && cur[p] !== null) {
              cur = cur[p];
            } else {
              // create nested object
              cur[p] = {};
              cur = cur[p];
              exists = false; // newly created branch
            }
          }
        }
        if (!exists) {
          addedForNs++;
          totalAdded++;
        }
      }

      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Updated ${lang}/${ns}.json with ${addedForNs} placeholders (if missing).`);
      } catch (e) {
        console.error('Failed writing', filePath, e);
      }
    }
  }
  return totalAdded;
}

// Loop option: if --loop provided, re-run translation coverage and re-apply until no missing keys or max iterations
const argv = process.argv.slice(2);
const doLoop = argv.includes('--loop');
let report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let iterations = 0;
const maxIterations = 6;
let totalAddedAll = 0;
do {
  iterations++;
  const added = applyPlaceholdersOnce(report);
  totalAddedAll += added;
  console.log(`Iteration ${iterations}: added ${added} placeholders.`);
  if (!doLoop) break;
  // re-run coverage report
  console.log('Re-running translation coverage report to evaluate remaining missing keys...');
  const runner = spawnSync('node', [path.join(__dirname, 'translation-coverage-report.cjs')], { stdio: 'inherit' });
  if (runner.error) {
    console.error('Failed to re-run coverage report:', runner.error);
    break;
  }
  if (!fs.existsSync(reportPath)) {
    console.error('Coverage report missing after regeneration. Aborting loop.');
    break;
  }
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const anyMissing = Object.values(report.languages || {}).some(l => (l.missingCount || 0) > 0 || (Array.isArray(l.missingKeys) && l.missingKeys.length > 0));
  if (!anyMissing) {
    console.log('No missing keys left after iteration', iterations);
    break;
  }
  if (iterations >= maxIterations) {
    console.log('Reached max iterations; stopping.');
    break;
  }
} while (true);

console.log(`Placeholder application done. Total placeholders added: ${totalAddedAll}`);
