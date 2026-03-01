#!/usr/bin/env node

/**
 * Apply cost code standardization migration to Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.join(__dirname, '../supabase/migrations/20260108215643_standardize_cost_codes_to_english.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

console.log('Cost Code Migration file loaded:');
console.log(`- Size: ${(sql.length / 1024).toFixed(2)} KB`);
console.log(`- Lines: ${sql.split('\n').length}`);
console.log('\nSQL content ready to apply via Supabase SQL editor');
console.log('\n' + '='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
