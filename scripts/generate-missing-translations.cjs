const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = ''){
  const res = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)){
    for (const k of Object.keys(obj)){
      const val = obj[k];
      const key = prefix ? `${prefix}.${k}` : k;
      if (val && typeof val === 'object' && !Array.isArray(val)){
        res.push(...flatten(val, key));
      } else {
        res.push(key);
      }
    }
  }
  return res;
}

function readJsonSafe(filepath){
  try{
    const s = fs.readFileSync(filepath,'utf8');
    return JSON.parse(s);
  } catch(e){
    return null;
  }
}

function main(){
  const localesDir = path.resolve(__dirname, '..', 'src', 'locales');
  const outDir = path.resolve(__dirname, '..', 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'missing-translations-report.json');
  const langs = fs.readdirSync(localesDir).filter(f=>fs.statSync(path.join(localesDir,f)).isDirectory());
  const en = 'en-US';
  if (!langs.includes(en)){
    console.error('en-US locale not found under src/locales');
    process.exit(1);
  }
  const domains = fs.readdirSync(path.join(localesDir,en)).filter(f=>f.endsWith('.json'));
  const report = { generatedAt: new Date().toISOString(), domains: {}, summary: {} };
  for (const domain of domains){
    const enPath = path.join(localesDir, en, domain);
    const enJson = readJsonSafe(enPath) || {};
    const enKeys = flatten(enJson);
    report.domains[domain] = { canonicalCount: enKeys.length, canonical: enKeys, locales: {} };
    for (const lang of langs){
      if (lang === en) continue;
      const localePath = path.join(localesDir, lang, domain);
      const localeJson = readJsonSafe(localePath);
      const localeKeys = localeJson ? flatten(localeJson) : [];
      const missing = enKeys.filter(k => !localeKeys.includes(k));
      const extra = localeKeys.filter(k => !enKeys.includes(k));
      report.domains[domain].locales[lang] = { present: localeKeys.length, missing, extra };
    }
  }
  // summary totals
  const totals = {};
  for (const lang of langs){
    if (lang === en) continue;
    totals[lang] = { missing: 0, extra: 0 };
  }
  for (const domain of Object.keys(report.domains)){
    for (const lang of Object.keys(report.domains[domain].locales)){
      totals[lang].missing += report.domains[domain].locales[lang].missing.length;
      totals[lang].extra += report.domains[domain].locales[lang].extra.length;
    }
  }
  report.summary = totals;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Wrote report to', reportPath);
}

main();
