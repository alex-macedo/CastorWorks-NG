#!/usr/bin/env node
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

async function checkMissingCodes() {
  try {
    await client.connect();
    console.log('Connected to database successfully');
    console.log('');

    // Check how many template items exist
    const templateCountQuery = 'SELECT COUNT(*) as count FROM public.sinapi_project_template_items';
    const templateCountResult = await client.query(templateCountQuery);
    console.log(`📊 Template items in database: ${templateCountResult.rows[0].count}`);

    // Check how many template items have valid SINAPI codes
    const validCountQuery = `
      SELECT COUNT(*) as valid_count
      FROM public.sinapi_project_template_items t
      WHERE EXISTS (
        SELECT 1 FROM public.sinapi_items si
        WHERE si.sinapi_code = t.sinapi_code LIMIT 1
      )
    `;
    const validCountResult = await client.query(validCountQuery);
    console.log(`✅ Template items with valid SINAPI codes: ${validCountResult.rows[0].valid_count}`);

    // Check how many template items have invalid SINAPI codes
    const invalidCountQuery = `
      SELECT COUNT(*) as invalid_count
      FROM public.sinapi_project_template_items t
      WHERE NOT EXISTS (
        SELECT 1 FROM public.sinapi_items si
        WHERE si.sinapi_code = t.sinapi_code LIMIT 1
      )
    `;
    const invalidCountResult = await client.query(invalidCountQuery);
    console.log(`❌ Template items with invalid SINAPI codes: ${invalidCountResult.rows[0].invalid_count}`);

    // List the invalid codes
    if (parseInt(invalidCountResult.rows[0].invalid_count) > 0) {
      console.log('');
      console.log('🚨 INVALID SINAPI CODES IN TEMPLATE:');
      const invalidCodesQuery = `
        SELECT DISTINCT
          t.sinapi_code,
          COUNT(*) as occurrences,
          STRING_AGG(DISTINCT t.phase_name, ', ') as phases
        FROM public.sinapi_project_template_items t
        WHERE NOT EXISTS (
          SELECT 1 FROM public.sinapi_items si
          WHERE si.sinapi_code = t.sinapi_code LIMIT 1
        )
        GROUP BY t.sinapi_code
        ORDER BY t.sinapi_code
      `;
      const invalidCodesResult = await client.query(invalidCodesQuery);

      console.table(invalidCodesResult.rows);
    }

    // Check how many SINAPI items are in the catalog
    const catalogCountQuery = 'SELECT COUNT(*) as count FROM public.sinapi_items';
    const catalogCountResult = await client.query(catalogCountQuery);
    console.log(`\n📚 SINAPI catalog items: ${catalogCountResult.rows[0].count}`);

  } catch (err) {
    console.error('Check failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

checkMissingCodes();