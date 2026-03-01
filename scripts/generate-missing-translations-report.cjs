const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'src', 'locales');
const refLocale = 'en-US';
const outDir = path.join(__dirname, '..', 'reports');
const jsonSnippetsDir = path.join(outDir, 'json-snippets');
const date = new Date().toISOString().slice(0,10).replace(/-/g,'-');
const reportFile = path.join(outDir, `missing-translations-${date}.md`);

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); }
  catch(e) { console.error('JSON parse error', p, e.message); return null; }
}

function flatten(obj, prefix=[]) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    Object.keys(obj).forEach(k => {
      const val = obj[k];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(out, flatten(val, prefix.concat(k)));
      } else {
        out[prefix.concat(k).join('.')] = val;
      }
    });
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  Object.keys(flat).forEach(k => {
    const parts = k.split('.');
    let cur = out;
    parts.forEach((p,i) => {
      if (i === parts.length -1) cur[p] = flat[k];
      else { cur[p] = cur[p] || {}; cur = cur[p]; }
    });
  });
  return out;
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(jsonSnippetsDir)) fs.mkdirSync(jsonSnippetsDir, { recursive: true });

const locales = fs.readdirSync(base).filter(f => fs.statSync(path.join(base,f)).isDirectory());
if (!locales.includes(refLocale)) {
  console.error('Reference locale', refLocale, 'not found in', base);
  process.exit(1);
}

const refDir = path.join(base, refLocale);
const files = fs.readdirSync(refDir).filter(f => f.endsWith('.json'));
let reportLines = [];
reportLines.push('# Missing Translations Report');
reportLines.push('');
reportLines.push(`Date: ${new Date().toISOString()}`);
reportLines.push('');

files.forEach(file => {
  reportLines.push(`## ${file}`);
  reportLines.push('');
  const refPath = path.join(refDir, file);
  const refJson = readJson(refPath);
  if (!refJson) { reportLines.push('*Error parsing reference file*'); return; }

  const refFlat = flatten(refJson);
  locales.forEach(locale => {
    if (locale === refLocale) return;
    const localePath = path.join(base, locale, file);
    const locJson = fs.existsSync(localePath) ? readJson(localePath) : {};
    const locFlat = locJson ? flatten(locJson) : {};

    const missing = [];
    Object.keys(refFlat).forEach(k => {
      if (!(k in locFlat)) missing.push(k);
    });

    reportLines.push(`### ${locale}`);
    if (missing.length === 0) {
      reportLines.push('- All keys present.');
      reportLines.push('');
      return;
    }

    reportLines.push(`- Missing keys: ${missing.length}`);
    reportLines.push('');
    missing.forEach(k => {
      const suggested = refFlat[k];
      // build line using string concatenation to avoid nested template/backtick escaping
      const safe = String(suggested).replace(/\n/g, ' ');
      reportLines.push('  - `' + k + '`: suggested placeholder: `' + safe + '`');
    });
    reportLines.push('');

    // write JSON snippet for this locale+file
    const snippetFlat = {};
    missing.forEach(k => { snippetFlat[k] = refFlat[k]; });
    const snippetJson = unflatten(snippetFlat);
    const snippetPath = path.join(jsonSnippetsDir, `${locale}__${file}`);
    fs.writeFileSync(snippetPath, JSON.stringify(snippetJson, null, 2)+'\n', 'utf8');
  });

});

fs.writeFileSync(reportFile, reportLines.join('\n'), 'utf8');
console.log('Report generated at', reportFile);
console.log('JSON snippets in', jsonSnippetsDir);
