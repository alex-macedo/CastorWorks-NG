#!/usr/bin/env node

/**
 * NPM script wrapper for translation sync
 * This allows running: npm run sync-translations
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('🔄 Starting translation synchronization...\n');
  
  // Run the TypeScript file using tsx
  execSync('npx tsx scripts/sync-translations.ts', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..')
  });
  
  console.log('\n✅ Translation sync completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Translation sync failed!');
  process.exit(1);
}
