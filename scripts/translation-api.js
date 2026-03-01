/**
 * Translation File Writer API
 *
 * Simple Express server that allows the dev tools to automatically
 * write generated translations to locale files.
 *
 * Usage: node scripts/translation-api.js
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

// Enable CORS for localhost
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const LOCALES_PATH = path.join(__dirname, '../src/locales');
const LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'fr-FR'];

/**
 * Deep merge two objects, preserving existing values
 */
function deepMerge(target, source) {
  const output = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    } else {
      // Only add if key doesn't exist in target
      if (!(key in target)) {
        output[key] = source[key];
      }
    }
  }

  return output;
}

/**
 * Sort object keys alphabetically (recursive)
 */
function sortKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }

  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortKeys(obj[key]);
  });

  return sorted;
}

/**
 * POST /api/translations/save
 *
 * Body: {
 *   namespace: string,
 *   translations: {
 *     'en-US': { key: 'value', ... },
 *     'pt-BR': { key: 'value', ... },
 *     ...
 *   }
 * }
 */
app.post('/api/translations/save', async (req, res) => {
  try {
    const { namespace, translations } = req.body;

    if (!namespace || !translations) {
      return res.status(400).json({
        success: false,
        error: 'Missing namespace or translations',
      });
    }

    const results = [];

    for (const language of LANGUAGES) {
      if (!translations[language]) continue;

      const filePath = path.join(LOCALES_PATH, language, `${namespace}.json`);

      try {
        // Read existing file
        let existing = {};
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          existing = JSON.parse(content);
        } catch (err) {
          // File doesn't exist, will create new one
          console.log(`Creating new file: ${filePath}`);
        }

        // Merge translations (only add new keys, don't overwrite existing)
        const merged = deepMerge(existing, translations[language]);

        // Sort keys alphabetically
        const sorted = sortKeys(merged);

        // Write back to file with proper formatting
        await fs.writeFile(
          filePath,
          JSON.stringify(sorted, null, 2) + '\n',
          'utf-8'
        );

        results.push({
          language,
          file: `${language}/${namespace}.json`,
          status: 'success',
          keysAdded: Object.keys(translations[language]).length,
        });
      } catch (error) {
        results.push({
          language,
          file: `${language}/${namespace}.json`,
          status: 'error',
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      namespace,
      results,
    });
  } catch (error) {
    console.error('Error saving translations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translations/health
 * Health check endpoint
 */
app.get('/api/translations/health', (req, res) => {
  res.json({
    status: 'ok',
    localesPath: LOCALES_PATH,
    languages: LANGUAGES,
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Translation File Writer API                               ║
║  Running on: http://localhost:${PORT}                         ║
║                                                            ║
║  Endpoints:                                                ║
║    POST /api/translations/save - Save translations        ║
║    GET  /api/translations/health - Health check           ║
║                                                            ║
║  Ready to automatically write translations to files! 🚀   ║
╚════════════════════════════════════════════════════════════╝
  `);
});
