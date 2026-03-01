#!/usr/bin/env node
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

async function runDiagnostics() {
  try {
    await client.connect();
    console.log('Connected to database successfully');
    console.log('');

    // Summary count
    console.log('=== SUMMARY: Valid vs Invalid Template Codes ===');
    const summaryQuery = `
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.sinapi_items si
            WHERE si.sinapi_code = t.sinapi_code LIMIT 1
          ) THEN 'VALID'
          ELSE 'INVALID'
        END as status,
        COUNT(*) as count
      FROM public.sinapi_project_template_items t
      GROUP BY
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.sinapi_items si
            WHERE si.sinapi_code = t.sinapi_code LIMIT 1
          ) THEN 'VALID'
          ELSE 'INVALID'
        END;
    `;

    const summaryResult = await client.query(summaryQuery);
    console.table(summaryResult.rows);

    // List invalid codes
    console.log('');
    console.log('=== INVALID CODES (first 20) ===');
    const invalidQuery = `
      SELECT DISTINCT
        t.sinapi_code,
        COUNT(*) as template_items_count,
        STRING_AGG(DISTINCT t.phase_name, ', ' ORDER BY t.phase_name) as phases
      FROM public.sinapi_project_template_items t
      WHERE NOT EXISTS (
        SELECT 1 FROM public.sinapi_items si
        WHERE si.sinapi_code = t.sinapi_code LIMIT 1
      )
      GROUP BY t.sinapi_code
      ORDER BY t.sinapi_code
      LIMIT 20;
    `;

    const invalidResult = await client.query(invalidQuery);
    if (invalidResult.rows.length === 0) {
      console.log('No invalid codes found!');
    } else {
      console.table(invalidResult.rows);
    }

    // Check for potential formatting issues
    console.log('');
    console.log('=== POTENTIAL FORMATTING ISSUES (first 10) ===');
    const formattingQuery = `
      SELECT
        t.sinapi_code as template_code,
        si.sinapi_code as catalog_code,
        si.sinapi_item,
        si.sinapi_description
      FROM public.sinapi_project_template_items t
      LEFT JOIN public.sinapi_items si ON (
        TRIM(si.sinapi_code) = TRIM(t.sinapi_code) OR
        LTRIM(si.sinapi_code, '0') = LTRIM(t.sinapi_code, '0')
      )
      WHERE NOT EXISTS (
        SELECT 1 FROM public.sinapi_items si2
        WHERE si2.sinapi_code = t.sinapi_code LIMIT 1
      )
      LIMIT 10;
    `;

    const formattingResult = await client.query(formattingQuery);
    if (formattingResult.rows.length === 0) {
      console.log('No formatting issues detected');
    } else {
      console.table(formattingResult.rows);
    }

  } catch (err) {
    console.error('Diagnostic failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runDiagnostics();