#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en-US','pt-BR','es-ES','fr-FR'];
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'locales');

function getAllKeys(obj, prefix = ''){
  const keys = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)){
    for (const [k,v] of Object.entries(obj)){
      const full = prefix ? `${prefix}.${k}` : k;
      keys.push(full);
      keys.push(...getAllKeys(v, full));
    }
  }
  return keys;
}

function getTypeScriptFiles(dir, list = []){
  const files = fs.readdirSync(dir);
  for (const file of files){
    const fp = path.join(dir, file);
    const st = fs.statSync(fp);
    if (st.isDirectory()){
      if (['node_modules','dist','.git','coverage'].includes(file)) continue;
      getTypeScriptFiles(fp, list);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')){
      list.push(fp);
    }
  }
  return list;
}

function extractKeysFromFile(fp){
  const content = fs.readFileSync(fp,'utf8');
  const keys = new Set();
  const patterns = [/\bt\(\s*['"`]([^'"`]+)['"`]\s*\)/g,/\bt\(\s*['"`]([^'"`]+)['"`]\s*,/g];
  for (const pat of patterns){
    let m;
    while ((m = pat.exec(content)) !== null){
      const k = m[1];
      if (!k.includes('${')) keys.add(k.replace(/:/g, '.'));
    }
  }
  return keys;
}

function loadLanguageDir(language){
  const languagePath = path.join(LOCALES, language);
  const translations = new Map();
  if (!fs.existsSync(languagePath)) return translations;
  const files = fs.readdirSync(languagePath).filter(f => f.endsWith('.json'));
  for (const file of files){
    const namespace = file.replace('.json','');
    const filePath = path.join(languagePath, file);
    const content = JSON.parse(fs.readFileSync(filePath,'utf8'));
    const namespacedKeys = getAllKeys(content).map(k => `${namespace}.${k}`);
    const bareKeys = getAllKeys(content).map(k => `${k}`);
    translations.set(namespace, new Set([...namespacedKeys, ...bareKeys]));
  }
  return translations;
}

function keyExistsInLanguage(key, languageTranslations){
  for (const [, keys] of languageTranslations) if (keys.has(key)) return true;
  for (const [namespace, keys] of languageTranslations){ const namespacedKey = `${namespace}.${key}`; if (keys.has(namespacedKey)) return true; }
  for (const [, keys] of languageTranslations){ for (const definedKey of keys){ if (definedKey === key) return true; if (definedKey.endsWith(`.${key}`)) return true; const parts = definedKey.split('.'); if (parts[parts.length-1] === key) return true; } }
  if (key.includes('${')){
    const escapeForRegex = s => s.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');
    const escaped = escapeForRegex(key);
    const wildcarded = escaped.replace(/\\\$\{[^}]+\\\}/g,'([^\\.]+)');
    const pattern = new RegExp(`^${wildcarded}$`);
    for (const [, keys] of languageTranslations){ for (const definedKey of keys){ if (pattern.test(definedKey)) return true; const idx = definedKey.indexOf('.'); const rest = idx !== -1 ? definedKey.slice(idx+1): definedKey; if (pattern.test(rest)) return true; } }
  }
  return false;
}

function setNested(obj, pathSegments, value){
  let cur = obj;
  for (let i=0;i<pathSegments.length;i++){
    const seg = pathSegments[i];
    if (i === pathSegments.length - 1){
      if (cur[seg] === undefined) cur[seg] = value;
      return;
    }
    if (cur[seg] === undefined || typeof cur[seg] !== 'object') cur[seg] = {};
    cur = cur[seg];
  }
}

function applyPlaceholders(missingReport){
  for (const lang of Object.keys(missingReport)){
    const langDir = path.join(LOCALES, lang);
    if (!fs.existsSync(langDir)) continue;
    const jsonFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    const nsObjects = {};
    for (const jf of jsonFiles){
      const ns = jf.replace('.json','');
      const fp = path.join(langDir, jf);
      nsObjects[ns] = JSON.parse(fs.readFileSync(fp,'utf8'));
    }

    const missing = missingReport[lang];
    for (const key of missing){
      const parts = key.split('.');
      let ns = parts[0];
      let rest = parts.slice(1);
      let targetObj = nsObjects[ns];
      if (!targetObj){
        let found = false;
        for (const candidate of Object.keys(nsObjects)){
          const candidateKeys = getAllKeys(nsObjects[candidate]);
          if (candidateKeys.some(k => k.endsWith(`.${parts[parts.length-1]}`) || k === parts[parts.length-1])){ ns = candidate; rest = parts; targetObj = nsObjects[ns]; found = true; break; }
        }
        if (!found){
          ns = Object.keys(nsObjects)[0];
          targetObj = nsObjects[ns];
          rest = parts;
        }
      }
      setNested(targetObj, rest, `__MISSING__ ${key}`);
    }

    for (const ns of Object.keys(nsObjects)){
      const fp = path.join(langDir, `${ns}.json`);
      const content = JSON.stringify(nsObjects[ns], null, 2) + '\n';
      fs.writeFileSync(fp, content, 'utf8');
    }
  }
}

function main(){
  const tsFiles = getTypeScriptFiles(SRC);
  const usedKeys = new Set();
  for (const f of tsFiles){
    const ks = extractKeysFromFile(f);
    ks.forEach(k => usedKeys.add(k));
  }

  const translations = {};
  for (const lang of LANGUAGES){ translations[lang] = loadLanguageDir(lang); }

  const missing = {};
  for (const key of usedKeys){
    for (const lang of LANGUAGES){
      if (!keyExistsInLanguage(key, translations[lang])){
        if (!missing[lang]) missing[lang] = [];
        missing[lang].push(key);
      }
    }
  }

  const outDir = path.join(ROOT,'tmp'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir,'missing-translations-report.json'), JSON.stringify(missing, null, 2), 'utf8');
  console.log('Missing translations report written to tmp/missing-translations-report.json');

  if (Object.keys(missing).length === 0){ console.log('No missing translations found.'); return; }
  applyPlaceholders(missing);
  console.log('Applied placeholders to locale JSON files for missing keys.');
}

main();
