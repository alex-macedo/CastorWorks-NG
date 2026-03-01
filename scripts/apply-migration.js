#!/usr/bin/env node

/**
 * Apply SINAPI reload migration to Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.join(__dirname, '../supabase/migrations/20251225033641_reload_sinapi_from_csv.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

console.log('Migration file loaded:');
console.log(`- Size: ${(sql.length / 1024).toFixed(2)} KB`);
console.log(`- Lines: ${sql.split('\n').length}`);
console.log('\nSQL content ready to apply via Supabase MCP tool');

// Output just the SQL to stdout so it can be captured
process.stdout.write(sql);
