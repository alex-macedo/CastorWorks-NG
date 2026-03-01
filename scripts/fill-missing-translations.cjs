const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'src', 'locales');
const refLocale = 'en-US';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to parse', p, e.message);
    throw e;
  }
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function ensurePath(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const k = pathParts[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  const last = pathParts[pathParts.length - 1];
  if (typeof cur[last] === 'undefined') cur[last] = value;
}

function traverse(ref, callback, prefix=[]) {
  if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
    Object.keys(ref).forEach(k => {
      traverse(ref[k], callback, prefix.concat(k));
    });
  } else {
    callback(prefix, ref);
  }
}

function main() {
  const locales = fs.readdirSync(base).filter(f => fs.statSync(path.join(base,f)).isDirectory());
  if (!locales.includes(refLocale)) {
    console.error('Reference locale en-US not found under', base);
    process.exit(1);
  }

  const refDir = path.join(base, refLocale);
  const files = fs.readdirSync(refDir).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    const refPath = path.join(refDir, file);
    const refJson = readJson(refPath);

    locales.forEach(locale => {
      if (locale === refLocale) return;
      const localeDir = path.join(base, locale);
      const localePath = path.join(localeDir, file);
      let localeJson = {};
      if (fs.existsSync(localePath)) {
        try {
          localeJson = readJson(localePath);
        } catch (e) {
          console.error('Skipping', localePath, 'due to parse error');
          return;
        }
      } else {
        // create directory if missing
        if (!fs.existsSync(localeDir)) fs.mkdirSync(localeDir, { recursive: true });
        localeJson = {};
      }

      let added = 0;
      traverse(refJson, (pathParts, refValue) => {
        // get value at pathParts in localeJson
        let cur = localeJson;
        let exists = true;
        for (let p of pathParts) {
          if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
          else { exists = false; break; }
        }
        if (!exists) {
          // set to refValue (english) as placeholder
          ensurePath(localeJson, pathParts, refValue);
          added++;
        }
      });

      if (added > 0) {
        writeJson(localePath, localeJson);
        console.log(`Updated ${locale}/${file}: added ${added} keys`);
      } else {
        // no change
      }
    });
  });

  console.log('Done filling missing translations (placeholders from en-US).');
}

main();
