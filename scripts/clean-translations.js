#!/usr/bin/env node

/**
 * NPM script wrapper for cleaning invalid translation files
 * This allows running: npm run clean-translations
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('🧹 Starting translation cleanup...\n');
  
  // Run the TypeScript file using tsx
  execSync('npx tsx scripts/clean-invalid-translations.ts', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..')
  });
  
  console.log('\n✅ Translation cleanup completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Translation cleanup failed!');
  process.exit(1);
}
