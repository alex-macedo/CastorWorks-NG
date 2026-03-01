#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const OUTPUT_DIR = path.resolve(process.cwd(), 'exported');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Wrote', filePath);
};

const toCSV = (rows, columns) => {
  const header = columns.join(',') + '\n';
  const lines = rows.map(r => columns.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
    return s;
  }).join(',')).join('\n');
  return header + lines + (lines.length ? '\n' : '');
};

async function exportDb() {
  try {
    ensureDir(OUTPUT_DIR);
    await client.connect();

    // Get tables
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type='BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesRes.rows.map(r => r.table_name).filter(n => n !== 'pg_stat_statements');

    // Export schema (basic)
    let schemaSql = '';
    for (const table of tables) {
      const cols = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1
         ORDER BY ordinal_position`, [table]
      );

      // Primary key
      const pkRes = await client.query(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY'
         ORDER BY kcu.ordinal_position`, [table]
      );

      const pkCols = pkRes.rows.map(r => r.column_name);

      const colDefs = cols.rows.map(c => {
        const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
        const nullable = c.is_nullable === 'YES' ? '' : ' NOT NULL';
        return `  "${c.column_name}" ${c.data_type}${def}${nullable}`;
      }).join(',\n');

      let create = `DROP TABLE IF EXISTS \"${table}\" CASCADE;\nCREATE TABLE \"${table}\" (\n${colDefs}`;
      if (pkCols.length) create += `,\n  PRIMARY KEY (${pkCols.map(c=>`\"${c}\"`).join(', ')})`;
      create += `\n);\n\n`;
      schemaSql += create;
    }

    writeFile(path.join(OUTPUT_DIR, 'schema.sql'), schemaSql);

    // Export functions
    const funcs = await client.query(`
      SELECT n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);

    const funcsSql = funcs.rows.map(r => r.def).join('\n\n');
    writeFile(path.join(OUTPUT_DIR, 'functions.sql'), funcsSql);

    // Export each table data as CSV
    for (const table of tables) {
      const res = await client.query(`SELECT * FROM \"${table}\"`);
      const columns = res.fields.map(f => f.name);
      const csv = toCSV(res.rows, columns);
      writeFile(path.join(OUTPUT_DIR, `${table}.csv`), csv);
    }

    console.log('Export completed. Files located in', OUTPUT_DIR);
  } catch (err) {
    console.error('Export failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

exportDb();
