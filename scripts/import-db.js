#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import csvParse from 'csv-parse/lib/sync';

const INPUT_DIR = path.resolve(process.cwd(), 'exported');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const files = fs.existsSync(INPUT_DIR) ? fs.readdirSync(INPUT_DIR) : [];

async function importDb() {
  try {
    await client.connect();

    // Execute schema and functions if present
    if (files.includes('schema.sql')) {
      const schema = fs.readFileSync(path.join(INPUT_DIR, 'schema.sql'), 'utf8');
      console.log('Applying schema...');
      await client.query(schema);
    }

    if (files.includes('functions.sql')) {
      const funcs = fs.readFileSync(path.join(INPUT_DIR, 'functions.sql'), 'utf8');
      console.log('Applying functions...');
      await client.query(funcs);
    }

    // Insert CSVs
    for (const file of files) {
      if (!file.endsWith('.csv')) continue;
      const table = file.replace('.csv', '');
      const csv = fs.readFileSync(path.join(INPUT_DIR, file), 'utf8');
      const records = csvParse(csv, { columns: true, skip_empty_lines: true });
      if (records.length === 0) continue;

      console.log(`Inserting ${records.length} rows into ${table}`);
      for (const row of records) {
        const cols = Object.keys(row).map(c => `"${c}"`).join(',');
        const vals = Object.values(row).map(v => v === '' ? null : v);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`, vals);
      }
    }

    console.log('Import completed');
  } catch (err) {
    console.error('Import failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

importDb();
