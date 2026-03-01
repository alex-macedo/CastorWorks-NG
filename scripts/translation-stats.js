/**
 * Translation Stats CLI Wrapper
 * Runs the TypeScript stats file using tsx
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  execSync('npx tsx scripts/translation-stats.ts', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..')
  });
} catch (error) {
  console.error('❌ Failed to run translation stats:', error.message);
  process.exit(1);
}
