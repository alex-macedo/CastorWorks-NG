#!/usr/bin/env node
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

async function diagnoseBudgetCreation() {
  try {
    await client.connect();
    console.log('Connected to database successfully\n');

    // 1. Check total template items
    console.log('=== TEMPLATE ANALYSIS ===');
    const templateCountQuery = 'SELECT COUNT(*) as count FROM public.sinapi_project_template_items';
    const templateCountResult = await client.query(templateCountQuery);
    console.log(`Total template items: ${templateCountResult.rows[0].count}`);

    // 2. Check how many template items have SINAPI matches
    const sinapiMatchQuery = `
      SELECT COUNT(*) as with_sinapi_match
      FROM public.sinapi_project_template_items t
      WHERE EXISTS (
        SELECT 1 FROM public.sinapi_items si
        WHERE si.sinapi_code = t.sinapi_code LIMIT 1
      )
    `;
    const sinapiMatchResult = await client.query(sinapiMatchQuery);
    console.log(`Template items with SINAPI matches: ${sinapiMatchResult.rows[0].with_sinapi_match}`);

    // 3. Check how many template items have non-zero costs
    const costQuery = `
      SELECT COUNT(*) as with_valid_costs
      FROM public.sinapi_project_template_items t
      JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
      WHERE (si.sinapi_material_cost > 0 OR si.sinapi_labor_cost > 0)
      AND si.base_state = 'SP'
      ORDER BY si.base_year DESC NULLS LAST
    `;
    const costResult = await client.query(costQuery);
    console.log(`Template items with valid costs (SP state): ${costResult.rows[0].with_valid_costs}`);

    // 4. Check items that would be skipped due to zero costs
    console.log('\n=== ITEMS THAT WOULD BE SKIPPED ===');
    const skippedQuery = `
      SELECT
        t.item_number,
        t.sinapi_code,
        t.phase_name,
        si.sinapi_description,
        si.sinapi_material_cost,
        si.sinapi_labor_cost,
        si.base_state,
        si.base_year
      FROM public.sinapi_project_template_items t
      JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
      WHERE (si.sinapi_material_cost IS NULL OR si.sinapi_material_cost = 0)
        AND (si.sinapi_labor_cost IS NULL OR si.sinapi_labor_cost = 0)
      ORDER BY t.phase_order, t.sort_order
    `;
    const skippedResult = await client.query(skippedQuery);
    console.log(`Items with zero costs (would be skipped): ${skippedResult.rows.length}`);
    if (skippedResult.rows.length > 0) {
      console.log('\nFirst 10 skipped items:');
      skippedResult.rows.slice(0, 10).forEach((row, i) => {
        console.log(`${i + 1}. ${row.item_number} - ${row.sinapi_code}: ${row.sinapi_description?.substring(0, 50)}...`);
        console.log(`   Costs: Material=${row.sinapi_material_cost}, Labor=${row.sinapi_labor_cost}`);
      });
    }

    // 5. Check for items that might not be found due to state/year filtering
    console.log('\n=== STATE/YEAR FILTERING ANALYSIS ===');
    const stateQuery = `
      SELECT
        t.sinapi_code,
        COUNT(DISTINCT si.base_state) as state_count,
        COUNT(si.*) as total_matches,
        MAX(si.base_year) as latest_year
      FROM public.sinapi_project_template_items t
      JOIN public.sinapi_items si ON si.sinapi_code = t.sinapi_code
      GROUP BY t.sinapi_code
      ORDER BY state_count DESC, total_matches DESC
      LIMIT 20
    `;
    const stateResult = await client.query(stateQuery);
    console.log('SINAPI codes by state availability:');
    stateResult.rows.forEach(row => {
      console.log(`  ${row.sinapi_code}: ${row.state_count} states, ${row.total_matches} total entries, latest year: ${row.latest_year}`);
    });

    // 6. Check how many items would be included vs excluded
    console.log('\n=== FINAL BUDGET ELIGIBILITY ===');
    const eligibleQuery = `
      SELECT
        COUNT(*) as would_be_included
      FROM public.sinapi_project_template_items t
      WHERE EXISTS (
        SELECT 1 FROM public.sinapi_items si
        WHERE si.sinapi_code = t.sinapi_code
          AND (si.sinapi_material_cost > 0 OR si.sinapi_labor_cost > 0)
      )
    `;
    const eligibleResult = await client.query(eligibleQuery);
    const totalTemplate = templateCountResult.rows[0].count;
    const eligible = eligibleResult.rows[0].would_be_included;
    const skipped = totalTemplate - eligible;

    console.log(`Total template items: ${totalTemplate}`);
    console.log(`Would be included in budget: ${eligible}`);
    console.log(`Would be skipped: ${skipped} (${((skipped / totalTemplate) * 100).toFixed(1)}%)`);

  } catch (err) {
    console.error('Diagnostic failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

diagnoseBudgetCreation();