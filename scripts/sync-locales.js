import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesPath = path.join(__dirname, '../src/locales');
const languages = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];
const baseLanguage = 'en-US';

function syncObjects(base, target) {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return target || base;
  }

  const result = typeof target === 'object' && target !== null && !Array.isArray(target) ? { ...target } : {};
  
  // Remove extra keys from target that are not in base
  for (const key in result) {
    if (!(key in base)) {
      delete result[key];
    }
  }
  
  // Add missing keys or fill empty values
  for (const key in base) {
    const baseValue = base[key];
    const targetValue = result[key];

    if (typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
      result[key] = syncObjects(baseValue, targetValue);
    } else {
      // If missing or empty string, use base value
      if (!(key in result) || (typeof targetValue === 'string' && targetValue.trim() === '')) {
        result[key] = baseValue;
      }
    }
  }
  
  return result;
}

const baseDir = path.join(localesPath, baseLanguage);
if (!fs.existsSync(baseDir)) {
  console.error(`Base directory not found: ${baseDir}`);
  process.exit(1);
}

const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.json'));

for (const fileName of files) {
  const basePath = path.join(localesPath, baseLanguage, fileName);
  const baseContent = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  
  for (const lang of languages) {
    if (lang === baseLanguage) continue;
    
    const langDir = path.join(localesPath, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    const targetPath = path.join(langDir, fileName);
    let targetContent = {};
    
    if (fs.existsSync(targetPath)) {
      try {
        targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      } catch (e) {
        console.error(`Error parsing ${targetPath}, overwriting with base.`);
      }
    }
    
    const syncedContent = syncObjects(baseContent, targetContent);
    
    // Sort keys like the scanner does
    const sortedContent = {};
    Object.keys(baseContent).forEach(key => {
      if (key in syncedContent) {
        sortedContent[key] = syncedContent[key];
      }
    });

    fs.writeFileSync(targetPath, JSON.stringify(sortedContent, null, 2) + '\n');
    console.log(`✅ Synced ${lang}/${fileName}`);
  }
}
