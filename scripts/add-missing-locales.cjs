#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const localesDir = path.join(repoRoot, 'src', 'locales');
const reportPath = path.join(repoRoot, 'tmp', 'missing-translations-report.json');

const keysToEnsure = [
  { key: 'settings.aiFeedback.buttons.yes', value: 'Yes' },
  { key: 'settings.aiFeedback.buttons.no', value: 'No' },
  { key: 'supervisor.fetchIssuesFailed', value: 'Failed to fetch issues' },
];

function getNested(obj, parts) {
  return parts.reduce((acc, p) => (acc && acc[p] !== undefined ? acc[p] : undefined), obj);
}

function setNested(obj, parts, val) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] === undefined || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}

function walkLocaleFiles() {
  const report = {};
  if (!fs.existsSync(localesDir)) {
    console.error('Locales dir not found:', localesDir);
    process.exit(2);
  }

  const langs = fs.readdirSync(localesDir).filter((f) => fs.statSync(path.join(localesDir, f)).isDirectory());
  langs.forEach((lang) => {
    report[lang] = { added: [], missing: [] };
    const langDir = path.join(localesDir, lang);
    const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));
    files.forEach((file) => {
      const filePath = path.join(langDir, file);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error('PARSE_ERROR', filePath, e.message);
        process.exit(2);
      }

      keysToEnsure.forEach((k) => {
        const parts = k.key.split('.');
        // Only check keys that belong to this file's top-level domain
        // e.g., settings.* -> settings.json
        const domain = parts[0] + '.json';
        if (domain !== file) return;

        const exists = getNested(data, parts);
        if (exists === undefined) {
          // If this is en-US, add canonical value; otherwise add placeholder from en-US later
          report[lang].missing.push(k.key);
          // For en-US, add the canonical directly
          if (lang === 'en-US') {
            setNested(data, parts, k.value);
            report[lang].added.push(k.key);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
          }
        }
      });
    });
  });

  // After ensuring en-US, propagate placeholders to other locales for the keys missing
  const enPath = path.join(localesDir, 'en-US');
  const enFiles = fs.readdirSync(enPath).filter((f) => f.endsWith('.json'));
  const enData = {};
  enFiles.forEach((file) => {
    enData[file] = JSON.parse(fs.readFileSync(path.join(enPath, file), 'utf8'));
  });

  // Now propagate placeholders
  langs.forEach((lang) => {
    if (lang === 'en-US') return;
    const langDir = path.join(localesDir, lang);
    const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));
    files.forEach((file) => {
      const filePath = path.join(langDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let changed = false;
      keysToEnsure.forEach((k) => {
        const parts = k.key.split('.');
        const domain = parts[0] + '.json';
        if (domain !== file) return;
        const exists = getNested(data, parts);
        if (exists === undefined) {
          // try to get en-US value
          const enVal = getNested(enData[file], parts);
          const placeholder = enVal !== undefined ? enVal : k.value;
          setNested(data, parts, placeholder);
          report[lang].added.push(k.key);
          changed = true;
        }
      });
      if (changed) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    });
  });

  // Write report
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('Report written to', reportPath);
}

walkLocaleFiles();
